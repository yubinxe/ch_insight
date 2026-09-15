import { NextRequest } from 'next/server'
import { getState } from '@/lib/crm/store'
import { checkUrgency, type UrgencyInfo } from '@/lib/crm/services/scoring'
import { listOfficialProperties } from '@/lib/consumer/official'
import type { Property } from '@/lib/crm/types'

export const dynamic = 'force-dynamic'

interface Row {
  property: Property
  urgency: UrgencyInfo
}

/**
 * 공개 공고 목록 — 개인 조건 없이 둘러보기용.
 *
 * 실제 공고(청약홈 수집분)를 먼저 보여주고 그 뒤에 예시 공고를 붙인다.
 * 둘은 `dataOrigin` 으로 끝까지 구분되며 카드에도 `공식 공고` / `예시 공고` 로 표시된다.
 */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const region = sp.get('region') ?? ''
    const housingType = sp.get('housingType') ?? ''
    const limit = Math.min(60, Number(sp.get('limit') ?? 24) || 24)
    const now = new Date()

    const byDeadline = (a: Row, b: Row) => (a.urgency.daysLeft ?? 9999) - (b.urgency.daysLeft ?? 9999)

    const decorate = (property: Property): Row => ({ property, urgency: checkUrgency(property, now) })
    const open = (row: Row) => row.urgency.level !== 'CLOSED'

    const officialAll = (await listOfficialProperties({ limit: 200 })).map(decorate).filter(open)
    const sampleAll = getState()
      .properties.filter(p => p.status !== 'CLOSED' && p.status !== 'CANCELLED')
      .map(decorate)
      .filter(open)

    const byRegion = (row: Row) => !region || row.property.region === region
    const official = officialAll.filter(byRegion)
    const sample = sampleAll.filter(byRegion)

    // 필터 칩은 필터를 적용하기 **전** 목록에서 만든다.
    // 서울 자치구·임대 유형만 고정해 두면 실제 공고(충남 서북구 · 민영 …)를 고를 수 없다.
    const housingTypes = [...new Set([...official, ...sample].map(r => r.property.housingType))]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'ko'))

    // 지역은 공고 수가 많은 순으로 12개까지만 — 칩이 화면을 덮지 않게 한다
    const regionCount = new Map<string, number>()
    for (const r of [...officialAll, ...sampleAll]) {
      if (!r.property.region) continue
      regionCount.set(r.property.region, (regionCount.get(r.property.region) ?? 0) + 1)
    }
    const regions = [...regionCount.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko'))
      .slice(0, 12)
      .map(([name]) => name)

    const byType = (row: Row) => !housingType || row.property.housingType === housingType
    const pickedOfficial = official.filter(byType).sort(byDeadline)
    const pickedSample = sample.filter(byType).sort(byDeadline)

    const notices = [...pickedOfficial, ...pickedSample].slice(0, limit)
    const officialCount = notices.filter(r => r.property.dataOrigin === 'OFFICIAL').length

    return Response.json({
      notices,
      regions,
      housingTypes,
      officialCount,
      sampleCount: notices.length - officialCount,
      // 실제 공고와 예시가 함께 있을 수 있다. 하나로 뭉뚱그리지 않는다.
      dataOrigin: officialCount > 0 ? ('MIXED' as const) : ('SYNTHETIC' as const),
    })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : '공고를 불러오지 못했습니다.' },
      { status: 500 },
    )
  }
}
