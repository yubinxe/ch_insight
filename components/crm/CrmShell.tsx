'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, type ReactNode } from 'react'

/** 사용자가 직접 쓰는 화면 */
const USER_LINKS = [
  { href: '/', label: '홈' },
  { href: '/analyze', label: '내 기회 분석' },
]

/** 운영자(관리자)가 쓰는 화면 — 시각적으로 한 단계 낮춘다 */
const OPS_LINKS = [
  { href: '/dashboard', label: '대시보드' },
  { href: '/matches', label: '추천' },
  { href: '/customers', label: '고객' },
  { href: '/properties', label: '주택' },
  { href: '/applications', label: '지원' },
  { href: '/insights', label: '청약 통계' },
]

export function ThemeToggle() {
  // layout.tsx 가 data-theme="light" 로 렌더링하므로 초기값은 항상 light 다.
  const [dark, setDark] = useState(false)

  const toggle = () => {
    const next = !dark
    setDark(next)
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
  }

  return (
    <button type="button" onClick={toggle} aria-label="테마 전환" className="theme-btn">
      {dark ? (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="4.5" />
          <path
            d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M20 14.5A8 8 0 1 1 9.5 4a6.3 6.3 0 0 0 10.5 10.5Z" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  )
}

export default function CrmShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)

  return (
    <div className="crm-shell">
      <nav className="crm-nav">
        <div className="crm-nav__inner">
          <Link href="/" className="crm-nav__brand">
            <span className="crm-nav__mark">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 11.5 12 4l9 7.5" />
                <path d="M5 10v9.5h14V10" />
              </svg>
            </span>
            집인사이트
          </Link>

          <div className="crm-nav__links">
            {USER_LINKS.map(l => (
              <Link
                key={l.href}
                href={l.href}
                className="crm-nav__link"
                data-active={isActive(l.href) ? 'true' : 'false'}
              >
                {l.label}
              </Link>
            ))}

            <span className="crm-nav__divider" aria-hidden="true" />
            <span className="crm-nav__group-label">운영</span>

            {OPS_LINKS.map(l => (
              <Link
                key={l.href}
                href={l.href}
                className="crm-nav__link"
                data-active={isActive(l.href) ? 'true' : 'false'}
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="crm-nav__right">
            <Link href="/analyze" className="crm-nav__cta">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 3l2.2 6.2L20 11l-5.8 1.8L12 19l-2.2-6.2L4 11l5.8-1.8z" />
              </svg>
              <span>무료 분석</span>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      <main className="crm-main">{children}</main>

      <footer className="crm-foot">
        <p>
          AI 참고 분석 서비스입니다 · 지원 전 반드시 공식 공고문을 확인하세요
          <br />
          공고 통계 출처: 공공데이터포털 청약홈 OpenAPI · 한국부동산원 · 데모 공실 데이터는 합성(Synthetic)입니다
        </p>
      </footer>
    </div>
  )
}
