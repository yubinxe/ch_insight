'use client'

import { useEffect } from 'react'
import WinnerPredictionCalculator from '@/components/prediction/WinnerPredictionCalculator'

export default function WinnerPredictionSlideover({
  open,
  onClose,
  regionCode,
  regionName,
  complexName,
}: {
  open: boolean
  onClose: () => void
  regionCode?: string
  regionName?: string
  complexName?: string
}) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="slideover-root" role="dialog" aria-modal="true" aria-label="내 가점 비교">
      <button type="button" className="slideover-backdrop" aria-label="닫기" onClick={onClose} />
      <aside className="slideover-panel">
        <header className="slideover-header">
          <div>
            <div className="slideover-eyebrow">과거 당첨가점 비교</div>
            <h2 className="slideover-title">{complexName || '내 가점 비교'}</h2>
          </div>
          <button type="button" className="slideover-close" onClick={onClose} aria-label="닫기">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>
        <div className="slideover-body">
          <WinnerPredictionCalculator
            compact
            regionCode={regionCode}
            regionName={regionName}
            complexName={complexName}
            onClose={onClose}
          />
        </div>
      </aside>
    </div>
  )
}
