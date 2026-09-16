'use client'

import { useId, useState } from 'react'

export const MIN_PASSWORD = 12

export function isEmailShaped(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())
}

/**
 * 계정 입력 한 벌 — 로그인 지면과 저장 모달이 같은 것을 쓴다.
 *
 * 제출해야 비로소 틀렸다고 알려주는 폼은 사람을 두 번 일하게 만든다.
 * 이메일은 입력을 마친 뒤(blur)에, 비밀번호는 입력하는 동안 상태를 보여준다.
 * 12자를 요구하면서 확인할 방법을 주지 않는 것도 같은 문제라 보기 버튼을 둔다.
 */
export function EmailField({
  value,
  onChange,
  autoFocus,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  autoFocus?: boolean
  disabled?: boolean
}) {
  const id = useId()
  const [touched, setTouched] = useState(false)
  const bad = touched && value.trim().length > 0 && !isEmailShaped(value)

  return (
    <div className="cs-field">
      <div className="cs-field__row">
        <label className="cs-field__label" htmlFor={id}>
          이메일 주소
        </label>
      </div>
      <input
        id={id}
        className="cs-input"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="name@example.com"
        value={value}
        autoFocus={autoFocus}
        disabled={disabled}
        aria-invalid={bad}
        aria-describedby={bad ? `${id}-msg` : undefined}
        onChange={e => onChange(e.target.value)}
        onBlur={() => setTouched(true)}
        required
      />
      {bad && (
        <p className="cs-field__msg" data-tone="bad" id={`${id}-msg`}>
          이메일 주소 형태가 아니에요. `name@example.com` 처럼 적어주세요.
        </p>
      )}
    </div>
  )
}

export function PasswordField({
  value,
  onChange,
  mode,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  /** 가입일 때만 길이 안내를 띄운다. 로그인에서는 잔소리가 된다 */
  mode: 'signup' | 'login'
  disabled?: boolean
}) {
  const id = useId()
  const [show, setShow] = useState(false)
  const filled = Math.min(MIN_PASSWORD, value.length)
  const enough = value.length >= MIN_PASSWORD

  return (
    <div className="cs-field">
      <div className="cs-field__row">
        <label className="cs-field__label" htmlFor={id}>
          비밀번호
        </label>
        {mode === 'signup' && (
          <span className="cs-note" aria-hidden="true">
            {MIN_PASSWORD}자 이상
          </span>
        )}
      </div>

      <div className="cs-pw">
        <input
          id={id}
          className="cs-input"
          type={show ? 'text' : 'password'}
          value={value}
          minLength={MIN_PASSWORD}
          maxLength={128}
          disabled={disabled}
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          onChange={e => onChange(e.target.value)}
          required
        />
        <button
          type="button"
          className="cs-pw__toggle"
          onClick={() => setShow(v => !v)}
          aria-pressed={show}
          aria-label={show ? '비밀번호 가리기' : '비밀번호 보기'}
        >
          {show ? '가리기' : '보기'}
        </button>
      </div>

      {mode === 'signup' && (
        <>
          {/* 글자 수를 세게 하지 않는다. 남은 만큼이 눈에 보이게 한다 */}
          <div className="cs-pw__meter" aria-hidden="true">
            {Array.from({ length: MIN_PASSWORD }).map((_, i) => (
              <span key={i} className="cs-pw__seg" data-on={i < filled} />
            ))}
          </div>
          <p className="cs-field__msg" data-tone={enough ? 'good' : undefined} aria-live="polite">
            {enough
              ? '길이 조건을 채웠어요.'
              : `${MIN_PASSWORD - value.length}자 더 필요해요.`}
          </p>
        </>
      )}
    </div>
  )
}

/** 로그인 / 가입 전환 — 글자가 툭 바뀌는 대신 표시가 미끄러진다 */
export function AuthSwitch({
  mode,
  onChange,
  disabled,
}: {
  mode: 'login' | 'signup'
  onChange: (m: 'login' | 'signup') => void
  disabled?: boolean
}) {
  return (
    <div className="cs-seg" data-index={mode === 'login' ? 0 : 1} role="tablist">
      <span className="cs-seg__thumb" aria-hidden="true" />
      {(['login', 'signup'] as const).map(m => (
        <button
          key={m}
          type="button"
          role="tab"
          className="cs-seg__btn"
          aria-selected={mode === m}
          disabled={disabled}
          onClick={() => onChange(m)}
        >
          {m === 'login' ? '로그인' : '계정 만들기'}
        </button>
      ))}
    </div>
  )
}
