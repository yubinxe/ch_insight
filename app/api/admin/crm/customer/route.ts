import { NextRequest } from 'next/server'
import { isAdminRequest } from '@/lib/admin/auth'
import * as repo from '@/lib/db/repo'
import { STAGE_LABEL } from '@/lib/services/lead-scoring'

export const dynamic = 'force-dynamic'

/** 고객 상세 — 누적된 Customer Context 전부 */
export async function GET(req: NextRequest) {
  if (!(await isAdminRequest())) {
    return Response.json({ error: '운영자 인증이 필요합니다.' }, { status: 401 })
  }

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return Response.json({ error: 'id 가 필요합니다.' }, { status: 400 })

  const customer = await repo.getCustomer(id)
  if (!customer) return Response.json({ error: '고객을 찾을 수 없습니다.' }, { status: 404 })

  const [preference, matches, behaviors, applications] = await Promise.all([
    repo.getPreference(id),
    repo.listMatches({ customerId: id, limit: 30 }),
    repo.listBehaviors({ customerId: id, limit: 50 }),
    repo.listApplications({ customerId: id }),
  ])

  const tasks = await repo.listTasks(applications.map(a => a.id))
  const oppIds = [...new Set([...matches.map(m => m.opportunity_id), ...applications.map(a => a.opportunity_id)])]
  const opportunities = (await repo.listOpportunities({ limit: 300 })).filter(o => oppIds.includes(o.id))
  const notifications = (await repo.listNotifications(200)).filter(n => n.customer_id === id)

  return Response.json({
    customer: { ...customer, stageLabel: STAGE_LABEL[customer.lifecycle_stage] },
    preference,
    matches,
    notifications,
    behaviors,
    applications,
    tasks,
    opportunities,
  })
}
