import { isAdminRequest } from '@/lib/admin/auth'
import { getState } from '@/lib/crm/store'
import { buildFunnel, buildKpi, buildUpcomingTasks } from '@/lib/crm/services/analytics'
import { activeNotificationAdapter } from '@/lib/adapters/notification'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!(await isAdminRequest())) return Response.json({ error: '운영자 인증이 필요합니다.' }, { status: 401 })
  try {
    const state = getState()
    const now = new Date()
    const adapter = activeNotificationAdapter()

    return Response.json({
      kpi: buildKpi(state, now),
      funnel: buildFunnel(state),
      customers: state.customers,
      properties: state.properties,
      matches: state.matches.slice(0, 120),
      applications: state.applications,
      tasks: state.tasks,
      events: state.events.slice(0, 60),
      notifications: state.notifications.slice(0, 30),
      activity: state.activity.slice(0, 60),
      upcomingTasks: buildUpcomingTasks(state, now),
      notificationAdapter: { id: adapter.id, label: adapter.label, live: adapter.id !== 'preview' },
      seededAt: state.seededAt,
    })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'snapshot 생성 실패' },
      { status: 500 },
    )
  }
}
