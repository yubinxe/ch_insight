import { NextRequest } from 'next/server'
import { resolveSession } from '@/lib/consumer/session'
import * as repo from '@/lib/db/repo'
import { trackBehavior } from '@/lib/services/pipeline'
import { buildApplicationTasks } from '@/lib/services/scheduling-tasks'

export const dynamic = 'force-dynamic'

/** 지원 준비 시작 — 공고 일정으로 Task 를 만든다 */
export async function POST(req: NextRequest) {
  try {
    const session = await resolveSession()
    const body = (await req.json().catch(() => ({}))) ?? {}
    const opportunityId = typeof body.opportunityId === 'string' ? body.opportunityId : null
    if (!opportunityId) return Response.json({ error: '공고를 지정해 주세요.' }, { status: 400 })

    const opportunity = await repo.getOpportunity(opportunityId)
    if (!opportunity) return Response.json({ error: '공고를 찾을 수 없습니다.' }, { status: 404 })

    // 세션에 연결된 고객이 없으면 만들어 준다 (가입 전에도 준비를 시작할 수 있게)
    let customer = await repo.findCustomerBySession(session.id)
    if (!customer) {
      customer = await repo.upsertCustomer({ session_id: session.id })
    }

    // 같은 공고로 중복 생성하지 않는다
    const existing = await repo.findApplication(customer.id, opportunity.id)
    if (existing) {
      const tasks = await repo.listTasks([existing.id])
      return Response.json({ application: existing, tasks, created: false })
    }

    const application = await repo.insertApplication({
      customer_id: customer.id,
      opportunity_id: opportunity.id,
      stage: 'DISCOVERED',
    })

    const tasks = await repo.insertTasks(buildApplicationTasks(application.id, opportunity))

    await trackBehavior({
      customerId: customer.id,
      sessionId: session.id,
      opportunityId: opportunity.id,
      eventType: 'APPLICATION_STARTED',
      source: 'WEB',
    })

    return Response.json({ application, tasks, created: true })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : '지원 준비를 시작하지 못했습니다.' },
      { status: 500 },
    )
  }
}
