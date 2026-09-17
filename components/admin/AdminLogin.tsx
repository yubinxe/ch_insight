'use client'

import { useState } from 'react'

export default function AdminLogin() {
  const [passcode, setPasscode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode }),
      })
      if (res.ok) {
        window.location.reload()
        return
      }
      const json = await res.json().catch(() => null)
      setError(json?.error ?? '접속하지 못했습니다.')
    } catch {
      setError('접속하지 못했습니다.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="cs">
      <main className="cs-main cs-wrap" style={{ paddingTop: 96, maxWidth: 460 }}>
        <h1 className="cs-page-title">운영 화면</h1>
        <p className="cs-sub" style={{ marginTop: 12, marginBottom: 28 }}>
          내부 운영자용 화면입니다. 접속 코드를 입력해 주세요.
        </p>
        <form onSubmit={submit}>
          <label className="cs-field__label" htmlFor="passcode">
            접속 코드
          </label>
          <input
            id="passcode"
            className="cs-input"
            type="password"
            autoComplete="current-password"
            value={passcode}
            onChange={e => setPasscode(e.target.value)}
          />
          {error && (
            <p className="cs-error" style={{ marginTop: 16 }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            className="cs-btn cs-btn--primary cs-btn--block"
            style={{ marginTop: 20 }}
            disabled={busy || !passcode}
          >
            {busy ? '확인 중…' : '접속'}
          </button>
        </form>
      </main>
    </div>
  )
}
