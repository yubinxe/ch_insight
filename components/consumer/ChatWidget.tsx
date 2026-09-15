'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

interface Msg {
  role: 'bot' | 'user'
  text: string
  actions?: { label: string; href: string }[]
}

const GREETING: Msg = {
  role: 'bot',
  text:
    '안녕하세요, 집캐치예요.\n원하시는 지역과 예산을 알려주시면 지금 지원 가능한 공고부터 찾아드릴게요.',
  actions: [{ label: '내 조건으로 집 찾기', href: '/analyze' }],
}

const QUICK = ['내 조건에 맞는 공고 있어요?', '자격이 되는지 궁금해요', '알림은 어떻게 받나요?', '접수 마감이 언제예요?']

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([GREETING])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open && bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [msgs, open])

  const send = async (text: string) => {
    const message = text.trim()
    if (!message || busy) return

    setMsgs(prev => [...prev, { role: 'user', text: message }])
    setInput('')
    setBusy(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })
      const json = await res.json()
      setMsgs(prev => [
        ...prev,
        res.ok
          ? { role: 'bot', text: json.text, actions: json.actions }
          : { role: 'bot', text: json.error ?? '답변을 만들지 못했어요.' },
      ])
    } catch {
      setMsgs(prev => [...prev, { role: 'bot', text: '연결이 불안정해요. 잠시 후 다시 시도해 주세요.' }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        className="cs-chat-fab"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-label={open ? '상담 닫기' : '집캐치에게 물어보기'}
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.3-.6L3 21l1.8-5.1A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5Z" />
          </svg>
        )}
      </button>

      {open && (
        <div className="cs-chat" role="dialog" aria-label="집캐치 상담">
          <div className="cs-chat__head">
            <div>
              <div className="cs-chat__title">무엇이든 물어보세요</div>
              <div className="cs-chat__sub">자격 판정은 하지 않아요 · 공식 공고문 확인 필요</div>
            </div>
          </div>

          <div className="cs-chat__body" ref={bodyRef}>
            {msgs.map((m, i) => (
              <div key={i} className="cs-chat__row" data-role={m.role}>
                <div className="cs-chat__bubble">{m.text}</div>
                {m.actions && m.actions.length > 0 && (
                  <div className="cs-chat__actions">
                    {m.actions.map(a => (
                      <Link key={a.href} href={a.href} className="cs-chat__action">
                        {a.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {busy && (
              <div className="cs-chat__row" data-role="bot">
                <div className="cs-chat__bubble cs-chat__bubble--typing">답변 준비 중…</div>
              </div>
            )}
          </div>

          {msgs.length <= 1 && (
            <div className="cs-chat__quick">
              {QUICK.map(q => (
                <button key={q} type="button" className="cs-chat__chip" onClick={() => send(q)}>
                  {q}
                </button>
              ))}
            </div>
          )}

          <form
            className="cs-chat__form"
            onSubmit={e => {
              e.preventDefault()
              send(input)
            }}
          >
            <label htmlFor="chat-input" className="cs-sr">
              메시지 입력
            </label>
            <input
              id="chat-input"
              className="cs-chat__input"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="예) 동작구 보증금 7000만원 이하로 찾아요"
              maxLength={1000}
              disabled={busy}
            />
            <button type="submit" className="cs-chat__send" disabled={busy || !input.trim()} aria-label="보내기">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </form>

          <p className="cs-chat__note">
            남겨주신 연락처·조건은 맞춤 안내를 위해 저장됩니다.
          </p>
        </div>
      )}
    </>
  )
}
