import NoticeDetail from '@/components/consumer/NoticeDetail'

export default async function NoticeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <NoticeDetail id={id} />
}
