import type { Metadata } from 'next'
import { Nanum_Myeongjo } from 'next/font/google'
import './globals.css'
import './crm.css'

/**
 * 제목용 명조 — 경제지·분양 리포트 감성.
 * next/font 로 self-host 하여 외부 요청 없이 로드한다.
 */
const myeongjo = Nanum_Myeongjo({
  subsets: ['latin'],
  weight: ['700', '800'],
  variable: '--font-myeongjo',
  display: 'swap',
})

export const metadata: Metadata = {
  title: '집인사이트 — 임대·청약 기회 탐지 및 지원관리 시스템',
  description:
    '고객 조건을 1회 등록하면 신규 공고·공실 발생 시점에 대상 고객을 자동 추출하고, 지원 우선순위와 절차 일정까지 산출하는 주거기회 관리 시스템',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ko"
      data-theme="light"
      data-density="regular"
      className={myeongjo.variable}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
