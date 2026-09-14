import { NextRequest } from 'next/server'
import { getState } from '@/lib/crm/store'
import { checkUrgency } from '@/lib/crm/services/scoring'

export const dynamic = 'force-dynamic'

/** 공개 공고 목록 — 개인 조건 없이 둘러보기용 */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const region = sp.get('region') ?? ''
    const housingType = sp.get('housingType') ?? ''
    const limit = Math.min(60, Number(sp.get('limit') ?? 24) || 24)
    const now = new Date()

    const rows = getState()
      .properties.filter(p => (region ? p.region === region : true))
      .filter(p => (housingType ? p.housingType === housingType : true))
      .filter(p => p.status !== 'CLOSED' && p.status !== 'CANCELLED')
      .map(property => ({ property, urgency: checkUrgency(property, now) }))
      .filter(row => row.urgency.level !== 'CLOSED')
      .sort((a, b) => (a.urgency.daysLeft ?? 9999) - (b.urgency.daysLeft ?? 9999))
      .slice(0, limit)

    return Response.json({ notices: rows, dataOrigin: 'SYNTHETIC' as const })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : '공고를 불러오지 못했습니다.' },
      { status: 500 },
    )
  }
}
