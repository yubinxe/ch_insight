'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { REGION_BBOX_BY_CODE } from '@/lib/korea-map-data'
import {
  easeOutCubic,
  lerpView,
  panView,
  regionFocusView,
  viewBoxString,
  zoomAtPoint,
  type MapView,
} from '@/lib/korea-map-viewport'

export function useKoreaMapViewport(full: MapView) {
  const [view, setView] = useState<MapView>(full)
  const viewRef = useRef(view)
  const animRef = useRef(0)

  useEffect(() => { viewRef.current = view }, [view])

  const minW = full.w / 14

  const cancelAnim = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current)
    animRef.current = 0
  }, [])

  const animateTo = useCallback(
    (target: MapView, duration = 420) => {
      cancelAnim()
      const start = viewRef.current
      const t0 = performance.now()

      const tick = (now: number) => {
        const t = Math.min(1, (now - t0) / duration)
        setView(lerpView(start, target, easeOutCubic(t)))
        if (t < 1) animRef.current = requestAnimationFrame(tick)
        else animRef.current = 0
      }

      animRef.current = requestAnimationFrame(tick)
    },
    [cancelAnim],
  )

  const resetView = useCallback(() => {
    animateTo(full)
  }, [animateTo, full])

  const focusRegion = useCallback(
    (code: string | null) => {
      if (!code) {
        resetView()
        return
      }
      const bbox = REGION_BBOX_BY_CODE[code]
      if (!bbox) return
      animateTo(regionFocusView(bbox, full))
    },
    [animateTo, full, resetView],
  )

  const zoomBy = useCallback(
    (factor: number, fx: number, fy: number) => {
      cancelAnim()
      setView(v => zoomAtPoint(v, factor, fx, fy, full, minW))
    },
    [cancelAnim, full, minW],
  )

  const panBy = useCallback(
    (dx: number, dy: number) => {
      cancelAnim()
      setView(v => panView(v, dx, dy, full, minW))
    },
    [cancelAnim, full, minW],
  )

  useEffect(() => () => cancelAnim(), [cancelAnim])

  const zoomLevel = full.w / view.w
  const isZoomed = zoomLevel > 1.12

  return {
    view,
    viewBox: viewBoxString(view),
    zoomLevel,
    isZoomed,
    animateTo,
    resetView,
    focusRegion,
    zoomBy,
    panBy,
    setViewImmediate: (next: MapView) => {
      cancelAnim()
      setView(next)
    },
  }
}
