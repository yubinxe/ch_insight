import type { Metadata } from 'next'
import { gmarket, pretendard } from './fonts'
import './globals.css'
import './consumer.css'
import './crm.css'

export const metadata: Metadata = {
  title: '청약인사이트 — 내 조건에 맞는 청약·임대 공고 찾기',
  description:
    '복잡한 공고를 하나씩 비교하지 않아도 됩니다. 내 조건에 맞는 후보를 찾고 관심공고의 일정까지 챙겨보세요.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ko"
      data-theme="light"
      data-density="regular"
      className={`${gmarket.variable} ${pretendard.variable}`}
      suppressHydrationWarning
    >
      <body>{children}</body>
    </html>
  )
}
