'use client'

import { useState } from 'react'
import { useConsumer } from './ConsumerProvider'
import { useSignupGate } from './SignupGate'

/**
 * 관심 저장.
 * 로그인 없이도 저장되며, 저장 직후 계정 연결을 권한다.
 * 가입을 취소해도 저장 자체는 유지된다.
 */
export default function SaveButton({ propertyId }: { propertyId: string }) {
  const { savedIds, user, refresh } = useConsumer()
  const gate = useSignupGate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const saved = savedIds.includes(propertyId)

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/saved', {
        method: saved ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId }),
      })
      if (!res.ok) throw new Error('저장하지 못했어요. 다시 눌러주세요.')
      if (res.ok) {
        await refresh()
        // 저장은 이미 끝났다. 그 다음에 계정 연결을 제안한다.
        if (!saved && !user) gate.open({ kind: 'SAVE_NOTICE', propertyId })
      }
    } catch {
      setError('저장하지 못했어요. 다시 눌러주세요.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <span style={{ position: 'relative', zIndex: 2 }}>
    <button
      type="button"
      className="cs-save"
      data-on={saved ? 'true' : 'false'}
      onClick={toggle}
      disabled={busy}
      aria-pressed={saved}
      aria-label={saved ? '관심공고에서 빼기' : '관심공고에 저장'}
      title={saved ? '관심공고에서 빼기' : '관심공고에 저장'}
    >
      <svg
        width="21"
        height="21"
        viewBox="0 0 24 24"
        fill={saved ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.8 5.6a5.2 5.2 0 0 0-7.4 0L12 7l-1.4-1.4a5.2 5.2 0 1 0-7.4 7.4L12 21.4l8.8-8.4a5.2 5.2 0 0 0 0-7.4Z" />
      </svg>
    </button>
    {error && <span role="alert" className="cs-note" style={{ display: 'block', maxWidth: 150 }}>{error}</span>}
    </span>
  )
}
