import type { Metadata } from 'next'
import './globals.css'
import './crm.css'

export const metadata: Metadata = {
  title: '집인사이트 — 주거기회 탐지 · 지원관리 CRM',
  description:
    '조건을 한 번 저장하면 청약·임대 기회를 자동 탐지하고, 우선순위·알림·지원 일정까지 관리하는 Housing Opportunity CRM',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" data-theme="light" data-density="regular" suppressHydrationWarning>
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
