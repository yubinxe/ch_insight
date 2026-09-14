'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useConsumer } from './ConsumerProvider'

export default function LoginView() {
  const router = useRouter()
  const { user, refresh } = useConsumer()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [signupMode, setSignupMode] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const response = await fetch(signupMode ? '/api/auth/signup' : '/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const json = await response.json()
      if (!response.ok) throw new Error(json.error ?? '계속하지 못했어요.')
      await refresh()
      router.push('/saved')
    } catch (err) {
      setError(err instanceof Error ? err.message : '계속하지 못했어요.')
      setBusy(false)
    }
  }

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/'
  }

  if (user) {
    return (
      <div className="cs-wrap" style={{ paddingTop: 64, maxWidth: 460 }}>
        <h1 className="cs-page-title">이미 로그인되어 있어요</h1>
        <p className="cs-sub" style={{ marginTop: 12 }}>{user.email}</p>
        <Link href="/saved" className="cs-btn cs-btn--primary cs-btn--block" style={{ marginTop: 28 }}>
          관심공고 보기
        </Link>
        <button className="cs-btn cs-btn--text cs-btn--block" style={{ marginTop: 10 }} onClick={logout}>
          로그아웃
        </button>
      </div>
    )
  }

  return (
    <div className="cs-wrap" style={{ paddingTop: 64, maxWidth: 460 }}>
      <h1 className="cs-page-title">{signupMode ? '나의 기회를 모아두세요' : '다시 만나 반가워요'}</h1>
      <p className="cs-sub" style={{ marginTop: 12, marginBottom: 30 }}>
        저장해둔 조건과 관심공고를 이어서 확인하세요.
      </p>

      <form onSubmit={submit}>
        <label className="cs-field__label" htmlFor="login-email">
          이메일 주소
        </label>
        <input
          id="login-email"
          className="cs-input"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="name@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />

        <label className="cs-field__label" htmlFor="login-password" style={{ marginTop: 20 }}>비밀번호</label>
        <input id="login-password" className="cs-input" type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={12} maxLength={128} autoComplete={signupMode ? 'new-password' : 'current-password'} required />
        <p className="cs-note" style={{ marginTop: 8 }}>12자 이상 입력해 주세요. 이메일 인증·비밀번호 재설정은 아직 연결 전입니다.</p>
        {error && (
          <p className="cs-error" style={{ marginTop: 16 }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          className="cs-btn cs-btn--primary cs-btn--block"
          style={{ marginTop: 20 }}
          disabled={busy || !email.trim()}
        >
          {busy ? '확인 중…' : signupMode ? '계정 만들기' : '로그인'}
        </button>
      </form>

      <button className="cs-btn cs-btn--text cs-btn--block" onClick={() => { setSignupMode(!signupMode); setError(null) }}>{signupMode ? '이미 계정이 있어요 · 로그인' : '처음 오셨나요? 계정 만들기'}</button>
    </div>
  )
}
