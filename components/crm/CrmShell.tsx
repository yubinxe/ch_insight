'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, type ReactNode } from 'react'

const LINKS = [
  { href: '/dashboard', label: '대시보드' },
  { href: '/customers', label: '고객 CRM' },
  { href: '/properties', label: '주택' },
  { href: '/matches', label: '추천 랭킹' },
  { href: '/applications', label: '지원 관리' },
  { href: '/analyze', label: '기회 분석' },
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
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5" strokeLinecap="round" />
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

  return (
    <div className="crm-shell">
      <nav className="crm-nav">
        <div className="crm-nav__inner">
          <Link href="/" className="crm-nav__brand">
            <span className="crm-nav__mark">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 11.5 12 4l9 7.5" />
                <path d="M5 10v9.5h14V10" />
              </svg>
            </span>
            집플리즈
          </Link>
          <div className="crm-nav__links">
            {LINKS.map(l => (
              <Link
                key={l.href}
                href={l.href}
                className="crm-nav__link"
                data-active={pathname === l.href || pathname.startsWith(`${l.href}/`) ? 'true' : 'false'}
              >
                {l.label}
              </Link>
            ))}
          </div>
          <div className="crm-nav__right">
            <ThemeToggle />
          </div>
        </div>
      </nav>
      <main className="crm-main">{children}</main>
      <footer style={{ borderTop: '1px solid var(--line)', padding: '22px 32px', textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.6 }}>
          AI 참고 분석 서비스입니다 · 지원 전 반드시 공식 공고문을 확인하세요
          <br />
          공고 통계 데이터 출처: 공공데이터포털 청약홈 OpenAPI · 한국부동산원 · 데모 공실 데이터는 합성(Synthetic)입니다
        </p>
      </footer>
    </div>
  )
}
