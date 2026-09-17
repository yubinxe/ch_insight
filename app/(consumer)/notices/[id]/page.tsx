import type { Metadata } from 'next'
import NoticeDetail from '@/components/consumer/NoticeDetail'
import { findOfficialProperty } from '@/lib/consumer/official'
import { checkUrgency } from '@/lib/crm/services/scoring'

/**
 * 링크로 먼저 만나는 사람을 위한 제목과 설명.
 *
 * 그림만 공고별로 바꾸고 제목이 서비스 소개로 남으면, 미리보기 카드 안에서
 * 그림과 글이 서로 다른 말을 한다.
 *
 * 공고를 못 찾으면 기본값으로 물러선다 — 미리보기 때문에 화면이 열리지
 * 않는 일은 없어야 한다.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const property = await findOfficialProperty(id).catch(() => null)
  if (!property) return { title: '모집공고 — 집캐치' }

  const urgency = checkUrgency(property, new Date())
  const where = [property.district, property.region].filter(Boolean).join(' ')
  const title = `${property.name} — 집캐치`
  const description = [
    where,
    property.housingType,
    property.supplyCount ? `${property.supplyCount.toLocaleString()}세대` : null,
    urgency.label,
  ]
    .filter(Boolean)
    .join(' · ')

  return {
    title,
    description,
    openGraph: { title, description, type: 'article' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function NoticeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <NoticeDetail id={id} />
}
