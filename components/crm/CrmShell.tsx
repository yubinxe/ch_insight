'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, type ReactNode } from 'react'

/**
 * 업무 순서대로 배열한다 — 조건 진단 → 매칭 → 고객 → 물건 → 지원 → 시장.
 * 내부 조직도(사용자/운영)가 아니라 실무 동선이 기준이다.
 */
const NAV = [
  { href: '/dashboard', label: '종합현황' },
  { href: '/analyze', label: '조건진단' },
  { href: '/matches', label: '매칭현황' },
  { href: '/customers', label: '고객관리' },
  { href: '/properties', label: '물건관리' },
  { href: '/applications', label: '지원관리' },
  { href: '/insights', label: '시장통계' },
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
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
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
            {NAV.map(l => (
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
              <span className="crm-nav__cta-full">조건진단 실행</span>
              <span className="crm-nav__cta-short">진단</span>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      <main className="crm-main">{children}</main>

      <footer className="crm-foot">
        <p>
          본 서비스의 분석 결과는 참고용이며 공식 청약자격 판정이 아닙니다. 지원 전 공식 모집공고문을 확인하시기 바랍니다.
          <br />
          공고·통계 출처 : 공공데이터포털 청약홈 OpenAPI · 한국부동산원 | 공실 이벤트 및 임대물건 레코드는 시연용 합성 데이터입니다.
        </p>
      </footer>
    </div>
  )
}
