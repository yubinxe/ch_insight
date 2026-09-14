'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  KOREA_MAP_VIEWBOX,
  KOREA_PROVINCES,
  REGION_CENTROID_BY_CODE,
} from '@/lib/korea-map-data'
import { buildStableMarkerPositions } from '@/lib/hotmap-layout'
import { heatColor } from '@/lib/korea-regions'
import type { HotmapRegion, HotmapSpot } from '@/lib/hotmap-types'
import { useKoreaMapViewport } from '@/components/hotmap/useKoreaMapViewport'

const VB = KOREA_MAP_VIEWBOX.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 524, 631]
const VB_W = VB[2] ?? 524
const VB_H = VB[3] ?? 631
const FULL_VIEW = { x: 0, y: 0, w: VB_W, h: VB_H }

type MapTooltip =
  | { kind: 'region'; code: string; x: number; y: number }
  | { kind: 'spot'; spot: HotmapSpot; x: number; y: number }

function positionTooltip(x: number, y: number, wrapW: number) {
  const pad = 14
  const flipX = x > wrapW * 0.58
  const flipY = y < 80
  return {
    left: flipX ? x - pad : x + pad,
    top: flipY ? y + pad : y - pad,
    transform: `${flipX ? 'translate(-100%, 0)' : ''} ${flipY ? '' : 'translateY(-100%)'}`.trim(),
  }
}

function clientToSvg(svg: SVGSVGElement, clientX: number, clientY: number) {
  const pt = svg.createSVGPoint()
  pt.x = clientX
  pt.y = clientY
  const matrix = svg.getScreenCTM()
  if (!matrix) return { x: VB_W / 2, y: VB_H / 2 }
  const mapped = pt.matrixTransform(matrix.inverse())
  return { x: mapped.x, y: mapped.y }
}

export default function KoreaHotMap({
  regions,
  hotspots,
  selectedCode,
  onSelectRegion,
  onSelectSpot,
}: {
  regions: HotmapRegion[]
  hotspots: HotmapSpot[]
  selectedCode: string | null
  onSelectRegion: (code: string | null) => void
  onSelectSpot: (spot: HotmapSpot) => void
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [tooltip, setTooltip] = useState<MapTooltip | null>(null)
  const [hoveredSpotId, setHoveredSpotId] = useState<string | null>(null)
  const [hoveredRegionCode, setHoveredRegionCode] = useState<string | null>(null)
  const tooltipRaf = useRef(0)
  const panRef = useRef<{
    active: boolean
    pointerId: number
    lastX: number
    lastY: number
    startX: number
    startY: number
    moved: boolean
  } | null>(null)

  const {
    view,
    viewBox,
    zoomLevel,
    isZoomed,
    resetView,
    focusRegion,
    zoomBy,
    panBy,
  } = useKoreaMapViewport(FULL_VIEW)

  const regionByCode = useMemo(
    () => Object.fromEntries(regions.map(r => [r.code, r])),
    [regions],
  )

  const markerPositions = useMemo(
    () => buildStableMarkerPositions(hotspots),
    [hotspots],
  )

  const visibleHotspots = useMemo(() => {
    if (!selectedCode) return hotspots
    return hotspots.filter(h => h.regionCode === selectedCode)
  }, [hotspots, selectedCode])

  useEffect(() => {
    focusRegion(selectedCode)
  }, [selectedCode, focusRegion])

  const queueTooltip = useCallback((next: MapTooltip | null) => {
    cancelAnimationFrame(tooltipRaf.current)
    tooltipRaf.current = requestAnimationFrame(() => setTooltip(next))
  }, [])

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      const svg = svgRef.current
      if (!svg) return
      e.preventDefault()
      const factor = e.deltaY < 0 ? 0.88 : 1.14
      const { x, y } = clientToSvg(svg, e.clientX, e.clientY)
      zoomBy(factor, x, y)
    },
    [zoomBy],
  )

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  const handlePanStart = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return
    const target = e.target as Element
    if (target.closest('.hot-marker')) return
    panRef.current = {
      active: true,
      pointerId: e.pointerId,
      lastX: e.clientX,
      lastY: e.clientY,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    queueTooltip(null)
    setHoveredRegionCode(null)
  }, [queueTooltip])

  const handlePanMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const pan = panRef.current
      const svg = svgRef.current
      if (!pan?.active || !svg || pan.pointerId !== e.pointerId) return

      const rect = svg.getBoundingClientRect()
      const scaleX = view.w / rect.width
      const scaleY = view.h / rect.height
      const dx = (e.clientX - pan.lastX) * scaleX
      const dy = (e.clientY - pan.lastY) * scaleY

      if (
        !pan.moved &&
        Math.hypot(e.clientX - pan.startX, e.clientY - pan.startY) > 5
      ) {
        pan.moved = true
      }

      pan.lastX = e.clientX
      pan.lastY = e.clientY
      if (pan.moved) panBy(-dx, -dy)
    },
    [panBy, view.h, view.w],
  )

  const handlePanEnd = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const pan = panRef.current
    if (!pan || pan.pointerId !== e.pointerId) return
    panRef.current = null
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* already released */
    }
  }, [])

  const handleProvinceEnter = useCallback(
    (code: string, e: React.PointerEvent<SVGPathElement>) => {
      setHoveredRegionCode(code)
      const wrap = wrapRef.current
      if (!wrap) return
      const rect = wrap.getBoundingClientRect()
      queueTooltip({
        kind: 'region',
        code,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
    },
    [queueTooltip],
  )

  const handleProvinceMove = useCallback(
    (code: string, e: React.PointerEvent<SVGPathElement>) => {
      const wrap = wrapRef.current
      if (!wrap) return
      const rect = wrap.getBoundingClientRect()
      queueTooltip({
        kind: 'region',
        code,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
    },
    [queueTooltip],
  )

  const handleProvinceLeave = useCallback(() => {
    setHoveredRegionCode(null)
    queueTooltip(null)
  }, [queueTooltip])

  const handleSpotEnter = useCallback(
    (spot: HotmapSpot, e: React.PointerEvent<SVGGElement>) => {
      e.stopPropagation()
      setHoveredSpotId(spot.id)
      const wrap = wrapRef.current
      if (!wrap) return
      const rect = wrap.getBoundingClientRect()
      queueTooltip({
        kind: 'spot',
        spot,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
    },
    [queueTooltip],
  )

  const handleSpotLeave = useCallback(() => {
    setHoveredSpotId(null)
    queueTooltip(null)
  }, [queueTooltip])

  const handleRegionClick = useCallback(
    (code: string) => {
      if (panRef.current?.moved) return
      const next = selectedCode === code ? null : code
      onSelectRegion(next)
    },
    [onSelectRegion, selectedCode],
  )

  const handleZoomIn = useCallback(() => {
    const svg = svgRef.current
    const wrap = wrapRef.current
    if (!svg || !wrap) return
    const rect = wrap.getBoundingClientRect()
    const { x, y } = clientToSvg(svg, rect.left + rect.width / 2, rect.top + rect.height / 2)
    zoomBy(0.82, x, y)
  }, [zoomBy])

  const handleZoomOut = useCallback(() => {
    const svg = svgRef.current
    const wrap = wrapRef.current
    if (!svg || !wrap) return
    const rect = wrap.getBoundingClientRect()
    const { x, y } = clientToSvg(svg, rect.left + rect.width / 2, rect.top + rect.height / 2)
    zoomBy(1.18, x, y)
  }, [zoomBy])

  const [wrapW, setWrapW] = useState(400)
  useEffect(() => {
    const element = wrapRef.current
    if (!element) return
    const observer = new ResizeObserver(entries => setWrapW(entries[0].contentRect.width))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  const tooltipStyle = tooltip ? positionTooltip(tooltip.x, tooltip.y, wrapW) : null

  const regionTooltipData =
    tooltip?.kind === 'region' ? regionByCode[tooltip.code] : null
  const regionTooltipName =
    tooltip?.kind === 'region'
      ? (regionTooltipData?.name ??
        KOREA_PROVINCES.find(p => p.code === tooltip.code)?.name)
      : ''

  const showDetailLabels = zoomLevel >= 1.65

  return (
    <div className="korea-map-wrap" ref={wrapRef}>
      <div className="korea-map-toolbar" aria-label="지도 조작">
        <button
          type="button"
          className="korea-map-btn"
          onClick={handleZoomIn}
          aria-label="확대"
        >
          +
        </button>
        <button
          type="button"
          className="korea-map-btn"
          onClick={handleZoomOut}
          aria-label="축소"
        >
          −
        </button>
        <button
          type="button"
          className="korea-map-btn korea-map-btn--text"
          onClick={() => {
            onSelectRegion(null)
            resetView()
          }}
          disabled={!isZoomed && !selectedCode}
          aria-label="전국 보기"
        >
          전국
        </button>
        <span className="korea-map-zoom-hint">
          {isZoomed ? `×${zoomLevel.toFixed(1)}` : '휠·드래그로 이동'}
        </span>
      </div>

      <svg
        ref={svgRef}
        viewBox={viewBox}
        className="korea-map-svg"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="전국 청약 핫플레이스 지도"
        onPointerDown={handlePanStart}
        onPointerMove={handlePanMove}
        onPointerUp={handlePanEnd}
        onPointerCancel={handlePanEnd}
        onPointerLeave={() => {
          panRef.current = null
          handleProvinceLeave()
        }}
      >
        <rect
          x={0}
          y={0}
          width={VB_W}
          height={VB_H}
          className="korea-map-bg"
          rx={12}
        />

        <g className="korea-provinces">
          {KOREA_PROVINCES.map(province => {
            const data = regionByCode[province.code]
            const heat = data?.heat ?? 0
            const active = selectedCode === province.code
            const hovered = hoveredRegionCode === province.code

            return (
              <path
                key={province.id}
                d={province.path}
                className={[
                  'korea-province',
                  active && 'korea-province--active',
                  heat >= 3 && 'korea-province--hot',
                  hovered && 'korea-province--hovered',
                ]
                  .filter(Boolean)
                  .join(' ')}
                fill={heatColor(heat)}
                stroke="var(--line)"
                strokeWidth={active || hovered ? 1.75 : 1}
                data-heat={heat}
                data-code={province.code}
                onClick={e => {
                  e.stopPropagation()
                  handleRegionClick(province.code)
                }}
                onPointerEnter={e => handleProvinceEnter(province.code, e)}
                onPointerMove={e => handleProvinceMove(province.code, e)}
                onPointerLeave={handleProvinceLeave}
              />
            )
          })}
        </g>

        <g className="korea-region-labels" pointerEvents="none">
          {regions.map(r => {
            const show =
              showDetailLabels ||
              r.heat >= 3 ||
              selectedCode === r.code ||
              hoveredRegionCode === r.code
            if (!show) return null
            const c = REGION_CENTROID_BY_CODE[r.code]
            if (!c) return null
            const fontSize = Math.max(9, Math.min(14, 11 / Math.sqrt(zoomLevel)))
            return (
              <text
                key={`label-${r.code}`}
                x={c.x}
                y={c.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="korea-region-label"
                style={{ fontSize }}
              >
                {r.name}
                {r.avgComp > 0 ? ` · ${r.avgComp}:1` : ''}
              </text>
            )
          })}
        </g>

        <g className="korea-hot-markers">
          {visibleHotspots.map(spot => {
            const pos = markerPositions.get(spot.id)
            if (!pos) return null

            const hot = spot.compRate >= 10
            const hovered = hoveredSpotId === spot.id
            const coreR = hot ? 3.8 : 3.2
            const hitR = 9

            return (
              <g
                key={spot.id}
                className={[
                  'hot-marker',
                  hot && 'hot-marker--pulse',
                  hovered && 'hot-marker--hovered',
                ]
                  .filter(Boolean)
                  .join(' ')}
                transform={`translate(${pos.x} ${pos.y})`}
                onPointerDown={e => e.stopPropagation()}
                onClick={e => {
                  e.stopPropagation()
                  onSelectSpot(spot)
                }}
                onPointerEnter={e => handleSpotEnter(spot, e)}
                onPointerMove={e => handleSpotEnter(spot, e)}
                onPointerLeave={handleSpotLeave}
              >
                <circle className="hot-marker-hit" r={hitR} cx={0} cy={0} />
                {hot && <circle className="hot-marker-halo" r={11} cx={0} cy={0} />}
                <circle
                  className={`hot-marker-core${hot ? ' hot-marker-core--hot' : ''}`}
                  r={hovered ? coreR + 0.6 : coreR}
                  cx={0}
                  cy={0}
                />
              </g>
            )
          })}
        </g>
      </svg>

      {tooltip && tooltipStyle && (
        <div
          className="korea-map-tooltip"
          role="tooltip"
          style={{
            left: tooltipStyle.left,
            top: tooltipStyle.top,
            transform: tooltipStyle.transform,
          }}
        >
          {tooltip.kind === 'region' && (
            <>
              <p className="korea-map-tooltip__title">{regionTooltipName}</p>
              {regionTooltipData ? (
                <dl className="korea-map-tooltip__stats">
                  <div>
                    <dt>평균 경쟁률</dt>
                    <dd>
                      {regionTooltipData.avgComp > 0
                        ? `${regionTooltipData.avgComp}:1`
                        : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt>청약 단지</dt>
                    <dd>{regionTooltipData.projectCount}곳</dd>
                  </div>
                </dl>
              ) : (
                <p className="korea-map-tooltip__hint">데이터 없음</p>
              )}
              <p className="korea-map-tooltip__hint">클릭 · 확대 · 단지 필터</p>
            </>
          )}
          {tooltip.kind === 'spot' && (
            <>
              <p className="korea-map-tooltip__title">{tooltip.spot.name}</p>
              <p className="korea-map-tooltip__sub">
                {tooltip.spot.regionName}
              </p>
              <dl className="korea-map-tooltip__stats">
                <div>
                  <dt>경쟁률</dt>
                  <dd>
                    {tooltip.spot.compRate > 0
                      ? `${tooltip.spot.compRate}:1`
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt>공급</dt>
                  <dd>{tooltip.spot.units.toLocaleString()}세대</dd>
                </div>
              </dl>
              <p className="korea-map-tooltip__hint">클릭하면 상세</p>
            </>
          )}
        </div>
      )}

      <div className="korea-map-legend">
        <span className="korea-legend-title">경쟁률 열기</span>
        <div className="korea-legend-bar">
          {([0, 1, 2, 3, 4] as const).map(l => (
            <div
              key={l}
              className="korea-legend-step"
              style={{ background: heatColor(l) }}
              title={['낮음', '보통', '주의', '높음', '매우 높음'][l]}
            />
          ))}
        </div>
        <div className="korea-legend-labels">
          <span>낮음</span>
          <span>매우 높음</span>
        </div>
      </div>
    </div>
  )
}
