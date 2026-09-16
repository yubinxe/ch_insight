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

/** 필터 선택지는 건수를 함께 준다 — 어디에 공고가 몰려 있는지 골라보기 전에 보이게 */
export interface FilterOption {
  name: string
  count: number
}

function tally(rows: Row[], pick: (r: Row) => string, limit?: number): FilterOption[] {
  const n = new Map<string, number>()
  for (const r of rows) {
    const key = pick(r)
    if (!key) continue
    n.set(key, (n.get(key) ?? 0) + 1)
  }
  const sorted = [...n.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko'))
    .map(([name, count]) => ({ name, count }))
  return limit ? sorted.slice(0, limit) : sorted
}

/**
 * 공개 공고 목록 — 개인 조건 없이 둘러보기용.
 *
 * 실제 공고(청약홈·LH 수집분)와 예시 공고가 함께 오며 `dataOrigin` 으로 끝까지 구분된다.
 * 카드에도 `공식 공고` / `예시 공고` 로 표시한다.
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

    const all = [...officialAll, ...sampleAll]

    const byRegion = (row: Row) => !region || row.property.region === region
    const byType = (row: Row) => !housingType || row.property.housingType === housingType

    // 선택지는 **다른 축의 필터만 적용한** 목록에서 만든다.
    // 지역을 고르면 그 지역에 실제로 있는 유형만 남고, 지역 목록 자체는 줄지 않는다.
    const regions = tally(all.filter(byType), r => r.property.region, 12)
    const housingTypes = tally(all.filter(byRegion), r => r.property.housingType)

    // 화면이 "접수 마감이 가까운 순"이라고 적혀 있으므로 그대로 마감 순으로만 정렬한다.
    // 실제 공고를 앞으로 몰면 내일 마감인 공고가 한 달 뒤 공고 아래로 내려간다.
    // 실제/예시 구분은 순서가 아니라 카드의 배지가 한다.
    const notices = all
      .filter(byRegion)
      .filter(byType)
      .sort((a, b) => byDeadline(a, b) || (a.property.dataOrigin === 'OFFICIAL' ? -1 : 1))
      .slice(0, limit)

    const officialCount = notices.filter(r => r.property.dataOrigin === 'OFFICIAL').length

    return Response.json({
      notices,
      regions,
      housingTypes,
      /** 필터를 적용한 전체 건수. limit 으로 자르기 전 값이다 */
      matched: all.filter(byRegion).filter(byType).length,
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
