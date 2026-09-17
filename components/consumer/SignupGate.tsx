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
    desc: '동의하시면 지금 조건에 맞는 공고를 바로 한 통 보내드리고, 이후 새 공고가 열릴 때마다 이어서 알려드려요.',
    done: '이 조건으로 새 공고를 확인할게요',
  },
  ALERT_DEADLINE: {
    title: '마감 전에 알려드릴까요?',
    desc: '이 공고의 접수 마감이 가까워지면 이메일로 알려드려요.',
    done: '마감 알림을 설정했어요',
  },
}

/** 동의 직후 보낸 첫 다이제스트의 결과. 서버가 알려준 것만 옮긴다. */
interface DigestInfo {
  status: 'SENT' | 'PREVIEW' | 'FAILED'
  officialCount: number
}

/**
 * 메일이 갔는지를 있는 그대로 적는다.
 * 발송 키가 없거나 실패했을 때 "보냈습니다"라고 말하면, 사용자는 받은편지함을
 * 뒤지다 우리를 의심하게 된다. 갔으면 갔다고, 안 갔으면 안 갔다고 쓴다.
 */
function digestNote(d: DigestInfo | null): string {
  if (!d) return '관심공고에서 바로 확인할 수 있어요.'
  if (d.status === 'SENT') {
    return d.officialCount > 0
      ? `지금 조건에 맞는 공고 ${d.officialCount}건을 메일로 보내드렸어요.`
      : '지금은 진행 중인 공고가 없어 그 사실을 메일로 보내드렸어요. 새 공고가 열리면 알려드릴게요.'
  }
  if (d.status === 'FAILED') return '메일을 보내지 못했어요. 수신 설정은 저장했으니 다음 발송에 포함됩니다.'
  return '수신 설정을 저장했어요. 메일 발송 준비가 끝나는 대로 이 조건부터 보내드립니다.'
}

export default function SignupGate({ children }: { children: ReactNode }) {
  const { user, refresh } = useConsumer()
  const [req, setReq] = useState<GateRequest | null>(null)
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [loginMode, setLoginMode] = useState(false)
  const panel = useRef<HTMLDivElement>(null)
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [digest, setDigest] = useState<DigestInfo | null>(null)

  const open = useCallback((r: GateRequest) => {
    setReq(r)
    setError(null)
    setDone(null)
    setDigest(null)
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
          body: JSON.stringify(
            loginMode ? { identifier, password } : { email, username, password },
          ),
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
        // 동의 직후 나간 첫 메일의 결과. 없으면(마감 알림 등) null 로 둔다.
        setDigest((json?.digest as DigestInfo | undefined) ?? null)
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
                <div className="cs-done__mark">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m5 13 4 4L19 7" />
                  </svg>
                </div>
                <h2 className="cs-modal__title">{done}</h2>
                <p className="cs-sub" style={{ marginBottom: 24 }}>
                  {digestNote(digest)}
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

                {user ? (
                  // 이미 로그인했으면 다시 묻지 않는다
                  <p className="cs-mode-note" style={{ marginBottom: 4 }}>
                    {user.email} 계정으로 진행합니다.
                  </p>
                ) : (
                  <>
                    <AuthSwitch
                      mode={loginMode ? 'login' : 'signup'}
                      onChange={m => { setLoginMode(m === 'login'); setError(null) }}
                      disabled={busy}
                    />
                    <div key={loginMode ? 'login' : 'signup'} className="cs-swap">
                      {loginMode ? (
                        <IdentifierField value={identifier} onChange={setIdentifier} disabled={busy} />
                      ) : (
                        <>
                          <UsernameField value={username} onChange={setUsername} disabled={busy} />
                          <EmailField value={email} onChange={setEmail} disabled={busy} />
                        </>
                      )}
                      <PasswordField
                        value={password}
                        onChange={setPassword}
                        mode={loginMode ? 'login' : 'signup'}
                        disabled={busy}
                      />
                    </div>
                  </>
                )}
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
                  className="cs-btn cs-btn--primary cs-btn--block cs-submit"
                  style={{ marginTop: 20 }}
                  onClick={submit}
                  data-busy={busy}
                  disabled={
                    busy ||
                    (!user &&
                      (loginMode
                        ? !identifier.trim() || password.length === 0
                        : !isEmailShaped(email) ||
                          !isUsernameShaped(username) ||
                          password.length < MIN_PASSWORD)) ||
                    (needsConsent && !consent)
                  }
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
