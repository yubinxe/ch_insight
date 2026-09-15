import { propertyById } from '@/lib/crm/store'
import { findOfficialProperty } from '@/lib/consumer/official'
import { checkUrgency, buildCandidate } from '@/lib/crm/services/scoring'
import { buildTasks } from '@/lib/crm/services/scheduling'
import { resolveSession } from '@/lib/consumer/session'
import { track } from '@/lib/consumer/store'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    // 예시 공고 → 실제 공고 순으로 찾는다. 둘의 id 는 겹치지 않는다.
    const property = propertyById(id) ?? (await findOfficialProperty(id))
    if (!property) {
      return Response.json({ error: '공고를 찾을 수 없습니다.' }, { status: 404 })
    }

    const session = await resolveSession()
    const now = new Date()
    const urgency = checkUrgency(property, now)

    // 저장된 조건이 있으면 이 공고에 대한 개인 판정을 함께 준다.
    let candidate = null
    if (session.profile) {
      const p = session.profile
      const searcher = {
        preferredRegions: p.regions, maxDeposit: p.maxDeposit,
        maxMonthlyRent: p.maxMonthlyRent, minArea: p.minArea,
        preferredHousingTypes: p.housingTypes,
      }
      candidate = buildCandidate(searcher, property, now)
    }

    // 준비 일정 미리보기 — 공식 기한과 권장 준비일을 구분해 보여준다.
    const schedule = buildTasks(property, { applicationId: `preview:${property.id}` })

    track(session, 'notice_viewed', { propertyId: property.id })

    return Response.json({
      property,
      urgency,
      candidate,
      schedule,
      budget: candidate?.budget ?? null,
      dataOrigin: property.dataOrigin,
    })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : '공고를 불러오지 못했습니다.' },
      { status: 500 },
    )
  }
}
