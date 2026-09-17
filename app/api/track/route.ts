import { NextRequest } from 'next/server'
import { resolveSession } from '@/lib/consumer/session'
import * as repo from '@/lib/db/repo'
import { trackBehavior } from '@/lib/services/pipeline'
import type { BehaviorEventType } from '@/lib/db/types'

export const dynamic = 'force-dynamic'

const ALLOWED: BehaviorEventType[] = [
  'DETAIL_VIEWED',
  'FAVORITED',
  'UNFAVORITED',
  'APPLICATION_STARTED',
  'RETURN_VISIT',
  'SEARCH_COMPLETED',
]

/** 웹에서 발생한 고객 행동 기록. 실제로 일어난 행동만 보낸다. */
export async function POST(req: NextRequest) {
  try {
    const session = await resolveSession()
    const body = (await req.json().catch(() => ({}))) ?? {}
    const eventType = body.eventType as BehaviorEventType

    if (!ALLOWED.includes(eventType)) {
      return Response.json({ error: '알 수 없는 이벤트입니다.' }, { status: 400 })
    }

    const customer = await repo.findCustomerBySession(session.id).catch(() => null)
    const result = await trackBehavior({
      customerId: customer?.id ?? null,
      sessionId: session.id,
      opportunityId: typeof body.opportunityId === 'string' ? body.opportunityId : null,
      eventType,
      source: 'WEB',
      metadata: {},
    })

    return Response.json({
      ok: true,
      leadScore: result.change?.after ?? null,
      lifecycleStage: result.change?.stageAfter ?? null,
    })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : '기록하지 못했습니다.' },
      { status: 500 },
    )
  }
}
