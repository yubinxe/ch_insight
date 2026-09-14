'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from 'react'
import { useConsumer } from './ConsumerProvider'
import type { PendingIntentKind } from '@/lib/crm/types'

interface GateRequest {
  kind: PendingIntentKind
  propertyId: string | null
  /** 알림 신청에서 넘어온 경우 공고명 */
  propertyName?: string
}

interface GateValue {
  open: (req: GateRequest) => void
  close: () => void
}

const Ctx = createContext<GateValue>({ open: () => {}, close: () => {} })

export function useSignupGate() {
  return useContext(Ctx)
}

const COPY: Record<PendingIntentKind, { title: string; desc: string; done: string }> = {
  SAVE_NOTICE: {
    title: '관심공고에 저장했어요',
    desc: '계정을 만들면 저장한 공고를 다음에도 이어서 볼 수 있어요.',
    done: '관심공고에 저장했어요',
  },
  ALERT_NEW: {
    title: '새 공고를 알려드릴까요?',
    desc: '저장한 조건의 새 공고 알림을 선택해요. 현재는 수신 설정만 저장하며 이메일은 발송하지 않습니다.',
    done: '이 조건으로 새 공고를 확인할게요',
  },
  ALERT_DEADLINE: {
    title: '마감 전에 알려드릴까요?',
    desc: '이 공고의 마감 알림을 선택해요. 현재는 수신 설정만 저장하며 이메일은 발송하지 않습니다.',
    done: '마감 알림을 설정했어요',
  },
}

export default function SignupGate({ children }: { children: ReactNode }) {
  const { user, refresh } = useConsumer()
  const [req, setReq] = useState<GateRequest | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginMode, setLoginMode] = useState(false)
  const panel = useRef<HTMLDivElement>(null)
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const open = useCallback((r: GateRequest) => {
    setReq(r)
    setError(null)
    setDone(null)
    setConsent(false)
    setPassword('')
    setLoginMode(false)
  }, [])

  const close = useCallback(() => {
    setReq(null)
    setError(null)
    setBusy(false)
  }, [])

  // Esc 로 닫기 — 취소해도 이미 저장된 내용은 남는다
  useEffect(() => {
    if (!req) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) close()
      if (e.key === 'Tab') {
        const items = panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), a[href]')
        if (!items?.length) return
        const first = items[0], last = items[items.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panel.current?.querySelector<HTMLElement>('input, button')?.focus()
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; previous?.focus() }
  }, [req, close, busy])

  const submit = async () => {
    if (!req || busy) return
    setBusy(true)
    setError(null)
    try {
      // 1) 계정이 없으면 먼저 만든다
      if (!user) {
        const res = await fetch(loginMode ? '/api/auth/login' : '/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
        const json = await res.json().catch(() => null)
        if (!res.ok) {
          if (json?.code === 'EMAIL_IN_USE') setLoginMode(true)
          throw new Error(json?.error ?? '계속하지 못했어요.')
        }
      }

      // 2) 원래 하려던 일을 이어서 처리한다
      if (req.kind === 'ALERT_NEW' || req.kind === 'ALERT_DEADLINE') {
        const res = await fetch('/api/alerts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scope: req.kind === 'ALERT_NEW' ? 'NEW_NOTICE' : 'DEADLINE',
            propertyId: req.propertyId,
            consent,
          }),
        })
        const json = await res.json().catch(() => null)
        if (!res.ok) throw new Error(json?.error ?? '알림을 설정하지 못했어요.')
      } else if (req.propertyId) {
        const savedResponse = await fetch('/api/saved', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ propertyId: req.propertyId }),
        })
        if (!savedResponse.ok) throw new Error('저장하지 못했어요. 다시 시도해 주세요.')
      }

      await refresh()
      setDone(COPY[req.kind].done)
    } catch (err) {
      setError(err instanceof Error ? err.message : '처리하지 못했어요.')
    } finally {
      setBusy(false)
    }
  }

  const copy = req ? COPY[req.kind] : null
  const needsConsent = req?.kind === 'ALERT_NEW' || req?.kind === 'ALERT_DEADLINE'

  return (
    <Ctx.Provider value={{ open, close }}>
      {children}

      {req && copy && (
        <div className="cs-modal" role="dialog" aria-modal="true" aria-label={copy.title}>
          <button className="cs-modal__backdrop" onClick={close} disabled={busy} aria-label="닫기" />
          <div className="cs-modal__panel" ref={panel}>
            <button className="cs-modal__close" onClick={close} aria-label="닫기">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>

            {done ? (
              <>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 16,
                    background: 'var(--ok-soft)',
                    color: 'var(--ok)',
                    display: 'grid',
                    placeItems: 'center',
                    marginBottom: 18,
                  }}
                >
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m5 13 4 4L19 7" />
                  </svg>
                </div>
                <h2 className="cs-modal__title">{done}</h2>
                <p className="cs-sub" style={{ marginBottom: 24 }}>
                  관심공고에서 바로 확인할 수 있어요.
                </p>
                <a href="/saved" className="cs-btn cs-btn--primary cs-btn--block">
                  관심공고 보러가기
                </a>
                <button className="cs-btn cs-btn--text cs-btn--block" onClick={close} style={{ marginTop: 8 }}>
                  계속 둘러보기
                </button>
              </>
            ) : (
              <>
                <h2 className="cs-modal__title">{copy.title}</h2>
                <p className="cs-sub" style={{ marginBottom: 22 }}>
                  {copy.desc}
                </p>

                {req.propertyName && <p className="cs-mode-note" style={{ marginBottom: 18 }}>{req.propertyName}</p>}
                <label className="cs-field__label" htmlFor="gate-email">
                  이메일 주소
                </label>
                <input
                  id="gate-email"
                  className="cs-input"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={user?.email ?? email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={Boolean(user)}
                />
                {user && (
                  <p className="cs-note" style={{ marginTop: 8 }}>
                    {user.email} 계정으로 진행합니다.
                  </p>
                )}

                {!user && <>
                  <label className="cs-field__label" htmlFor="gate-password" style={{ marginTop: 18 }}>비밀번호</label>
                  <input id="gate-password" className="cs-input" type="password" minLength={12} maxLength={128} autoComplete={loginMode ? 'current-password' : 'new-password'} placeholder="12자 이상" value={password} onChange={e => setPassword(e.target.value)} />
                  <button className="cs-btn cs-btn--text" onClick={() => setLoginMode(!loginMode)}>{loginMode ? '새 계정 만들기' : '이미 계정이 있어요 · 로그인'}</button>
                </>}
                {needsConsent && (
                  <label className="cs-check" style={{ marginTop: 16 }}>
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={e => setConsent(e.target.checked)}
                    />
                    <span className="cs-check__text">
                      이메일로 알림 받기에 동의합니다
                      <span className="cs-check__sub">
                        동의하신 범위와 시각을 기록합니다. 언제든 관심공고에서 해제할 수 있어요.
                      </span>
                    </span>
                  </label>
                )}

                {error && (
                  <p role="alert" className="cs-error" style={{ marginTop: 16 }}>
                    {error}
                  </p>
                )}

                <button
                  className="cs-btn cs-btn--primary cs-btn--block"
                  style={{ marginTop: 20 }}
                  onClick={submit}
                  disabled={busy || (!user && (!email.trim() || password.length < 12)) || (needsConsent && !consent)}
                >
                  {busy ? '처리 중…' : user ? '설정 저장하기' : loginMode ? '로그인하고 이어가기' : '계정 만들고 이어가기'}
                </button>

                <p className="cs-note" style={{ marginTop: 14, textAlign: 'center' }}>
                  관심공고와 조건은 이 서비스에 저장됩니다. 이메일 인증·비밀번호 재설정은 아직 연결 전입니다.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </Ctx.Provider>
  )
}
