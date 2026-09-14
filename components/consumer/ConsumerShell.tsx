'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { useConsumer } from './ConsumerProvider'

const NAV = [
  { href: '/notices', label: '공고 찾기' },
  { href: '/guide', label: '청약 가이드' },
  { href: '/saved', label: '관심공고' },
]

export default function ConsumerShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { user, savedCount } = useConsumer()

  return (
    <div className="cs">
      <a href="#consumer-main" className="cs-skip">본문으로 건너뛰기</a>
      <header className="cs-header">
        <div className="cs-wrap cs-header__inner">
          <Link href="/" className="cs-logo">
            <span className="cs-logo__mark" aria-hidden="true">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 11.5 12 4l9 7.5" />
                <path d="M5 10v9.5h14V10" />
              </svg>
            </span>
            청약인사이트
          </Link>

          <nav className="cs-nav" aria-label="주요 메뉴">
            {NAV.map(l => (
              <Link
                key={l.href}
                href={l.href}
                className="cs-nav__link"
                data-active={pathname.startsWith(l.href) ? 'true' : 'false'}
              >
                {l.label}
                {l.href === '/saved' && savedCount > 0 && (
                  <span className="cs-num"> {savedCount}</span>
                )}
              </Link>
            ))}
          </nav>

          <div className="cs-header__right">
            {user ? (
              <Link href="/saved" className="cs-btn cs-btn--sm cs-btn--ghost">
                {user.nickname}님
              </Link>
            ) : (
              <Link href="/login" className="cs-btn cs-btn--sm cs-btn--ghost">
                로그인
              </Link>
            )}
            <Link href="/analyze" className="cs-btn cs-btn--sm cs-btn--primary">
              내 기회 찾기
            </Link>
          </div>
        </div>
      </header>

      <main id="consumer-main" className="cs-main">{children}</main>

      <footer className="cs-footer">
        <div className="cs-wrap">
          <p>
            청약인사이트는 공개된 공고 정보를 정리해 보여드리는 참고 서비스입니다. 자격 판정과 당첨 여부를
            확정하지 않으며, 신청 전 반드시 공식 모집공고문을 확인해 주세요.
            <br />
            공고·통계 출처: 공공데이터포털 청약홈 OpenAPI · 한국부동산원 · 현재 표시되는 임대 공고는 화면 구성을
            보여주기 위한 예시 데이터입니다.
          </p>
        </div>
      </footer>
    </div>
  )
}
