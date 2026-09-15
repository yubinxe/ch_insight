import { isAdminRequest } from '@/lib/admin/auth'
import * as repo from '@/lib/db/repo'
import { isApplyhomeConfigured } from '@/lib/adapters/applyhome'
import { emailProvider } from '@/lib/notifications/email'
import { MATCH_CONFIG } from '@/lib/services/matching'
import { STAGE_LABEL } from '@/lib/services/lead-scoring'

export const dynamic = 'force-dynamic'

/** CRM 대시보드 스냅샷 — 비즈니스 흐름이 보이도록 집계한다 */
export async function GET() {
  if (!(await isAdminRequest())) {
    return Response.json({ error: '운영자 인증이 필요합니다.' }, { status: 401 })
  }

  try {
    const [customers, opportunities, events, matches, notifications, behaviors, applications, inquiries] =
      await Promise.all([
        repo.listCustomers(500),
        repo.listOpportunities({ limit: 300 }),
        repo.listEvents(40),
        repo.listMatches({ limit: 200 }),
        repo.listNotifications(100),
        repo.listBehaviors({ limit: 120 }),
        repo.listApplications({ limit: 300 }),
        repo.listInquiries(50),
      ])

    const today = new Date().toISOString().slice(0, 10)
    const isToday = (iso: string) => iso.slice(0, 10) === today

    // 발송(SENT)과 초안(PREVIEW)을 분리 집계한다 — 초안을 발송으로 세지 않는다
    const sent = notifications.filter(n => n.status === 'SENT')
    const preview = notifications.filter(n => n.status === 'PREVIEW')
    const clicked = notifications.filter(n => n.clicked_at)

    const activeStages = ['DISCOVERED', 'REVIEWING', 'APPLYING', 'DOCUMENTS', 'SUBMITTED', 'RESULT_WAITING']
    const favorited = behaviors.filter(b => b.event_type === 'FAVORITED')

    const hotLeads = customers.filter(c => c.lifecycle_stage === 'HOT' || c.lifecycle_stage === 'APPLICATION_INTENT')

    return Response.json({
      storage: repo.storageMode(),
      integrations: {
        applyhome: isApplyhomeConfigured(),
        email: emailProvider.isConfigured(),
      },
      config: { notifyThreshold: MATCH_CONFIG.notifyThreshold },
      metrics: {
        customers: customers.length,
        activePreferences: customers.length, // 조건이 있는 고객 수는 목록 조회에서 파생
        opportunities: opportunities.length,
        realOpportunities: opportunities.filter(o => !o.is_demo).length,
        demoOpportunities: opportunities.filter(o => o.is_demo).length,
        newOpportunitiesToday: opportunities.filter(o => isToday(o.created_at)).length,
        matchesToday: matches.filter(m => isToday(m.created_at)).length,
        notificationsSent: sent.length,
        notificationsPreview: preview.length,
        notificationsClicked: clicked.length,
        clickRate: sent.length ? Math.round((clicked.length / sent.length) * 100) : null,
        favorites: favorited.length,
        activeApplications: applications.filter(a => activeStages.includes(a.stage)).length,
        hotLeads: hotLeads.length,
        inquiries: inquiries.length,
      },
      events: events.map(e => ({
        ...e,
        opportunityTitle: opportunities.find(o => o.id === e.opportunity_id)?.title ?? null,
      })),
      behaviors: behaviors.slice(0, 40).map(b => ({
        ...b,
        customerName: customers.find(c => c.id === b.customer_id)?.name ?? null,
        opportunityTitle: opportunities.find(o => o.id === b.opportunity_id)?.title ?? null,
      })),
      topMatches: matches.slice(0, 12).map(m => ({
        ...m,
        customerName: customers.find(c => c.id === m.customer_id)?.name ?? null,
        opportunityTitle: opportunities.find(o => o.id === m.opportunity_id)?.title ?? null,
      })),
      hotLeads: hotLeads.slice(0, 12).map(c => ({
        id: c.id,
        name: c.name,
        leadScore: c.lead_score,
        stage: c.lifecycle_stage,
        stageLabel: STAGE_LABEL[c.lifecycle_stage],
      })),
      latestNotification: notifications[0] ?? null,
    })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : '조회에 실패했습니다.' },
      { status: 500 },
    )
  }
}
