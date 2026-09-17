'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { useConsumer } from './ConsumerProvider'
import {
  AuthSwitch,
  EmailField,
  IdentifierField,
  PasswordField,
  UsernameField,
  isEmailShaped,
  isUsernameShaped,
  MIN_PASSWORD,
} from './AuthFields'

/** 로그인 뒤 돌아갈 곳. 외부 주소로 튕기지 않게 같은 사이트 경로만 받는다 */
function safeNext(raw: string | null): string | null {
  if (!raw) return null
  if (!raw.startsWith('/') || raw.startsWith('//')) return null
  return raw
}

export default function LoginView() {
  const router = useRouter()
  const params = useSearchParams()
  const next = safeNext(params.get('next'))
  const { user, profile, savedIds, alerts, refresh } = useConsumer()

  const [mode, setMode] = useState<'login' | 'signup'>('signup')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  /** 로그인 한 칸 — 아이디든 이메일이든 여기로 들어온다 */
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ready =
    mode === 'login'
      ? identifier.trim().length > 0 && password.length > 0
      : isEmailShaped(email) && isUsernameShaped(username) && password.length >= MIN_PASSWORD

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy || !ready) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(mode === 'signup' ? '/api/auth/signup' : '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          mode === 'signup' ? { email, username, password } : { identifier, password },
        ),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        // 이미 있는 주소면 모드를 바꿔 준다. 같은 말을 두 번 치게 하지 않는다.
        if (json?.code === 'EMAIL_IN_USE') setMode('login')
        throw new Error(json?.error ?? '계속하지 못했어요.')
      }
      await refresh()
      // 보던 자리로 돌아간다. 고정된 곳으로 밀어내지 않는다.
      router.push(next ?? '/saved')
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
      <div className="cs-wrap" style={{ paddingTop: 64, maxWidth: 520 }}>
        <p className="cs-eyebrow">계정</p>
        <h1 className="cs-page-title" style={{ marginTop: 10 }}>
          {user.email}
        </h1>
        <p className="cs-sub" style={{ marginTop: 12 }}>
          저장한 조건과 관심공고가 이 계정에 이어져 있어요.
        </p>

        <div className="cs-auth__carry" style={{ marginTop: 28 }}>
          <CarryItem n={savedIds.length} k="관심공고" v="저장해 둔 공고" />
          <CarryItem n={alerts.length} k="알림 설정" v="새 공고·마감 수신 설정" />
        </div>

        <Link
          href={next ?? '/saved'}
          className="cs-btn cs-btn--primary cs-btn--block"
          style={{ marginTop: 28 }}
        >
          관심공고 보기
        </Link>
        <button className="cs-btn cs-btn--text cs-btn--block" style={{ marginTop: 10 }} onClick={logout}>
          로그아웃
        </button>
      </div>
    )
  }

  const regionText = profile?.regions?.length ? profile.regions.join(' · ') : null

  return (
    <div className="cs-wrap cs-auth">
      {/* 왼쪽 — 로그인하면 무엇이 이어지는지. 지금 세션에 실제로 있는 값만 적는다 */}
      <div>
        <p className="cs-eyebrow">계정</p>
        <h1 className="cs-page-title" style={{ marginTop: 10 }}>
          찾아둔 조건을
          <br />
          이어서 보세요
        </h1>
        <p className="cs-sub" style={{ marginTop: 14 }}>
          지금 브라우저에만 있는 기록이에요. 계정을 만들면 다른 기기에서도 그대로 이어집니다.
        </p>

        <div className="cs-auth__carry" style={{ marginTop: 30 }}>
          <CarryItem
            n={profile ? 1 : 0}
            k="저장한 조건"
            v={regionText ?? '아직 조건을 입력하지 않았어요'}
          />
          <CarryItem n={savedIds.length} k="관심공고" v="저장해 둔 공고" />
          <CarryItem n={alerts.length} k="알림 설정" v="새 공고·마감 수신 설정" />
        </div>

        {!profile && (
          <Link href="/analyze" className="cs-btn cs-btn--text" style={{ marginTop: 18, padding: 0 }}>
            조건부터 입력하기 →
          </Link>
        )}
      </div>

      {/* 오른쪽 — 입력 */}
      <div>
        <AuthSwitch mode={mode} onChange={m => { setMode(m); setError(null) }} disabled={busy} />

        <form onSubmit={submit} key={mode} className="cs-swap">
          {mode === 'signup' ? (
            <>
              <UsernameField value={username} onChange={setUsername} disabled={busy} />
              <EmailField value={email} onChange={setEmail} disabled={busy} />
            </>
          ) : (
            <IdentifierField value={identifier} onChange={setIdentifier} disabled={busy} />
          )}
          <PasswordField
            value={password}
            onChange={setPassword}
            mode={mode === 'signup' ? 'signup' : 'login'}
            disabled={busy}
          />

          {error && (
            <p className="cs-error" style={{ marginTop: 18 }} role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="cs-btn cs-btn--primary cs-btn--block cs-submit"
            style={{ marginTop: 24 }}
            data-busy={busy}
            disabled={busy || !ready}
          >
            {busy ? '확인 중…' : mode === 'signup' ? '계정 만들고 이어보기' : '로그인'}
          </button>
        </form>

        <p className="cs-note" style={{ marginTop: 16 }}>
          이메일 인증과 비밀번호 재설정은 아직 연결 전입니다. 그 전까지 중요한 비밀번호를 재사용하지 마세요.
        </p>
      </div>
    </div>
  )
}

function CarryItem({ n, k, v }: { n: number; k: string; v: string }) {
  return (
    <div className="cs-auth__carry-item">
      <span className="cs-auth__carry-n" data-empty={n === 0}>
        {String(n).padStart(2, '0')}
      </span>
      <span>
        <span className="cs-auth__carry-k">{k}</span>
        <span className="cs-auth__carry-v" style={{ display: 'block' }}>
          {v}
        </span>
      </span>
    </div>
  )
}
