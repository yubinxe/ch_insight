import { NextRequest } from 'next/server'
import { isAdminRequest } from '@/lib/admin/auth'
import * as repo from '@/lib/db/repo'
import { runMatchingForEvent } from '@/lib/services/pipeline'

export const dynamic = 'force-dynamic'

/**
 * 시연용 공실 발생.
 *
 * 실제 공개 API 는 개별 호실의 실시간 공실을 제공하지 않는다.
 * 여기서 만드는 이벤트는 전부 is_demo = true 로 표시해 실데이터와 구분한다.
 */
export async function POST(req: NextRequest) {
  if (!(await isAdminRequest())) {
    return Response.json({ error: '운영자 인증이 필요합니다.' }, { status: 401 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const requestedId = typeof body?.opportunityId === 'string' ? body.opportunityId : null

    const all = await repo.listOpportunities({ limit: 300 })
    const demoPool = all.filter(o => o.is_demo)

    // 시나리오 재현성을 위해 히어로 공고(H023)를 먼저 쓴다
    const hero = demoPool.find(o => o.external_id === 'DEMO-H023')
    const target =
      (requestedId ? all.find(o => o.id === requestedId) : null) ??
      (hero && (hero.vacancy_count ?? 0) === 0 ? hero : null) ??
      demoPool.find(o => (o.vacancy_count ?? 0) === 0 && o.status === 'OPEN') ??
      demoPool.find(o => (o.vacancy_count ?? 0) === 0) ??
      demoPool[0]

    if (!target) {
      return Response.json(
        { error: '시연용 공고가 없습니다. 먼저 데모 데이터를 생성하세요.' },
        { status: 409 },
      )
    }

    const before = target.vacancy_count ?? 0
    const after = before + 1
    const updated = (await repo.updateOpportunity(target.id, { vacancy_count: after })) ?? {
      ...target,
      vacancy_count: after,
    }

    const result = await runMatchingForEvent(updated, before === 0 ? 'VACANCY_CREATED' : 'VACANCY_INCREASED', {
      previousValue: String(before),
      currentValue: String(after),
      isDemo: true,
    })

    return Response.json({
      opportunity: result.opportunity,
      event: result.event,
      matchCount: result.matches.length,
      topMatches: result.matches.slice(0, 8),
      notified: result.notified,
      belowThreshold: result.belowThreshold,
      storage: repo.storageMode(),
    })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : '이벤트 처리에 실패했습니다.' },
      { status: 500 },
    )
  }
}
