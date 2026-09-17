'use client'

import { useEffect, useId, useRef, useState } from 'react'

/**
 * 고르는 자리 한 벌.
 *
 * 네이티브 `<select>` 는 운영체제가 그린다. 지면은 먹과 한지로 짜 놓고 고르는
 * 자리만 파란 시스템 위젯이 되면, 사용자는 거기서부터 다른 사이트를 본다.
 * 화살표까지 직접 그려 지면 안으로 들인다.
 *
 * 선택지가 열 개 안팎이면 굳이 접어두지 않는다. 펼쳐두면 무엇이 있는지 한눈에
 * 보이고, 고르는 데 클릭이 한 번이면 된다 — 접어두면 두 번이다.
 */

export interface ChoiceItem {
  value: string
  label: string
  /** 선택지 옆에 붙는 건수. 누르기 전에 어디에 쏠려 있는지 보이게 한다 */
  count?: number
}

/**
 * 알약 줄 — 선택지가 적고 서로 견줘 볼 값일 때.
 * 가로로 넘치면 잘리지 않고 밀려 흐른다.
 */
export function PillChoice({
  label,
  items,
  value,
  onChange,
  scroll = false,
}: {
  label: string
  items: ChoiceItem[]
  value: string
  onChange: (v: string) => void
  /** 12개월처럼 줄이 길어지는 경우 — 감싸지 않고 가로로 민다 */
  scroll?: boolean
}) {
  const id = useId()
  const rail = useRef<HTMLDivElement>(null)

  // 고른 칸이 화면 밖에 있으면 끌어온다. 되돌아왔을 때 어디였는지 보여야 한다.
  useEffect(() => {
    if (!scroll) return
    const on = rail.current?.querySelector<HTMLElement>('[data-on="true"]')
    on?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [value, scroll])

  return (
    <div className="cs-choose">
      <span className="cs-choose__label" id={id}>
        {label}
      </span>
      <div
        ref={rail}
        className={scroll ? 'cs-choose__rail cs-choose__rail--scroll' : 'cs-choose__rail'}
        role="group"
        aria-labelledby={id}
      >
        {items.map(it => {
          const on = value === it.value
          return (
            <button
              key={it.value || '__all'}
              type="button"
              className="cs-pill"
              data-on={on}
              aria-pressed={on}
              onClick={() => onChange(it.value)}
            >
              {it.label}
              {typeof it.count === 'number' && (
                // 0도 적는다. 0을 숨기면 "아직 안 세어봤다"와 구별되지 않는다
                <span className="cs-pill__n" data-zero={it.count === 0}>
                  {it.count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * 접히는 고르개 — 선택지가 많아 알약으로 늘어놓으면 지면을 잡아먹을 때.
 * 네이티브 select 를 그대로 쓰되 화살표와 테두리를 지면 것으로 바꾼다.
 */
export function SelectChoice({
  label,
  items,
  value,
  onChange,
  hint,
}: {
  label: string
  items: ChoiceItem[]
  value: string
  onChange: (v: string) => void
  hint?: string
}) {
  const id = useId()
  const current = items.find(i => i.value === value)

  return (
    <div className="cs-choose">
      <label className="cs-choose__label" htmlFor={id}>
        {label}
      </label>
      <div className="cs-select" data-filled={Boolean(current)}>
        <select
          id={id}
          className="cs-select__field"
          value={value}
          onChange={e => onChange(e.target.value)}
        >
          {items.map(it => (
            <option key={it.value || '__all'} value={it.value}>
              {it.label}
            </option>
          ))}
        </select>
        <svg
          className="cs-select__caret"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
      {hint && <p className="cs-choose__hint">{hint}</p>}
    </div>
  )
}

/**
 * 격자 고르개 — 열일곱 개 시·도처럼 '목록'보다 '지도'에 가까운 선택지.
 * 한 화면에 전부 놓으면 어디가 비었는지도 함께 보인다.
 */
export function GridChoice({
  label,
  items,
  value,
  onChange,
}: {
  label: string
  items: ChoiceItem[]
  value: string
  onChange: (v: string) => void
}) {
  const id = useId()
  return (
    <div className="cs-choose">
      <span className="cs-choose__label" id={id}>
        {label}
      </span>
      <div className="cs-choose__grid" role="group" aria-labelledby={id}>
        {items.map(it => {
          const on = value === it.value
          return (
            <button
              key={it.value || '__all'}
              type="button"
              className="cs-gridpick"
              data-on={on}
              aria-pressed={on}
              onClick={() => onChange(it.value)}
            >
              {it.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** 화면 폭에 따라 알약과 접힘을 갈아 끼우고 싶을 때 쓰는 훅 */
export function useNarrow(breakpoint = 720) {
  const [narrow, setNarrow] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`)
    const sync = () => setNarrow(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [breakpoint])
  return narrow
}
