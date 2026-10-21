import type { Metadata } from 'next'
import NewsView from '@/components/consumer/NewsView'

export const metadata: Metadata = {
  title: '청약뉴스 — 집캐치',
  description:
    '청약·주거정책·공급대책·공공임대·부동산 시장 소식을 한 자리에 모았습니다. 제목을 누르면 매체 원문으로 이동합니다.',
}

export default function NewsPage() {
  return <NewsView />
}
