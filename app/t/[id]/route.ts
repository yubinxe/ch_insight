import { NextRequest, NextResponse } from 'next/server'
import * as repo from '@/lib/db/repo'
import { trackBehavior } from '@/lib/services/pipeline'

export const dynamic = 'force-dynamic'

/**
 * 알림 클릭 추적 → 상세 페이지 리다이렉트.
 *
 * 알림 링크는 상세 페이지로 직접 보내지 않고 이 경로를 거친다.
 * 불투명한 알림 ID 만 쓰고 개인정보를 쿼리스트링에 넣지 않는다.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params

  const notification = await repo.getNotification(id).catch(() => null)
  if (!notification) {
    return NextResponse.redirect(new URL('/notices', process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'))
  }

  // 첫 클릭만 기록한다 (재방문으로 중복 집계되지 않게)
  const firstClick = !notification.clicked_at
  if (firstClick) {
    await repo.markNotificationClicked(id).catch(() => null)
    await trackBehavior({
      customerId: notification.customer_id,
      opportunityId: notification.opportunity_id,
      notificationId: notification.id,
      eventType: 'NOTIFICATION_CLICKED',
      source: 'EMAIL',
    }).catch(() => null)
    if (notification.match_id) await repo.updateMatchStatus(notification.match_id, 'VIEWED').catch(() => null)
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const target = notification.opportunity_id ? `/notices/${notification.opportunity_id}` : '/notices'
  return NextResponse.redirect(new URL(target, base))
}
