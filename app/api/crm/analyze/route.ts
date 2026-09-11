import { NextRequest } from 'next/server'
import { getState, log } from '@/lib/crm/store'
import { matchPropertiesToCustomer } from '@/lib/crm/services/matching'
import { compareOpportunities } from '@/lib/crm/services/scoring'
import { HOUSING_TYPES, type Customer, type HousingType } from '@/lib/crm/types'

export const dynamic = 'force-dynamic'

function num(v: unknown, fallback: number) {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const now = new Date()
    const state = getState()

    const regions: string[] = Array.isArray(body?.preferredRegions)
      ? body.preferredRegions.filter((r: unknown): r is string => typeof r === 'string').slice(0, 3)
      : []
    const types: HousingType[] = Array.isArray(body?.preferredHousingTypes)
      ? body.preferredHousingTypes.filter((t: unknown): t is HousingType =>
          HOUSING_TYPES.includes(t as HousingType),
        )
      : []

    if (!regions.length) {
      return Response.json({ error: '희망지역을 1곳 이상 선택해 주세요.' }, { status: 400 })
    }

    const profile: Customer = {
      id: 'GUEST',
      name: typeof body?.name === 'string' && body.name.trim() ? body.name.trim() : '게스트',
      age: num(body?.age, 30),
      householdType: body?.householdType ?? '1인가구',
      incomeBand: body?.incomeBand ?? '70~100%',
      preferredRegions: regions,
      maxDeposit: num(body?.maxDeposit, 8000),
      maxMonthlyRent: num(body?.maxMonthlyRent, 45),
      minArea: num(body?.minArea, 25),
      preferredHousingTypes: types.length ? types : ['청년매입임대'],
      moveInPeriod: typeof body?.moveInPeriod === 'string' ? body.moveInPeriod : '2026-12',
      createdAt: now.toISOString(),
      dataOrigin: 'SYNTHETIC',
    }

    const matches = matchPropertiesToCustomer(profile, state.properties, { limit: 8, now })
    const byId = new Map(state.properties.map(p => [p.id, p]))

    const results = matches.map(m => ({ match: m, property: byId.get(m.propertyId)! })).filter(r => r.property)

    let insight = ''
    if (results.length >= 2) {
      const [a, b] = results
      insight = compareOpportunities(
        { property: a.property, score: a.match.opportunityScore, breakdown: a.match },
        { property: b.property, score: b.match.opportunityScore, breakdown: b.match },
      )
    } else if (results.length === 1) {
      insight = `현재 조건에 부합하는 기회는 ${results[0].property.name} 1건입니다. 조건을 조금 넓히면 후보가 늘어납니다.`
    }

    log('SYSTEM', `게스트 주거기회 분석 실행 — ${regions.join('·')} / 후보 ${results.length}건`)

    return Response.json({ profile, results, insight })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : '분석 실패' },
      { status: 500 },
    )
  }
}
