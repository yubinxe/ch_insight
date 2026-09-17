import { isAdminRequest } from '@/lib/admin/auth'
import { listOfficialProperties } from '@/lib/consumer/official'
import { isRental, provinceOf } from '@/lib/consumer/classify'
import { checkUrgency } from '@/lib/crm/services/scoring'

export const dynamic = 'force-dynamic'

/**
 * 공급 데이터 운영 현황.
 *
 * CRM 대시보드는 고객과 알림을 본다. 그런데 이 서비스가 파는 것은 공고이고,
 * 공고가 제대로 들어오지 않으면 고객 지표는 나중에야 떨어진다. 사람이 항의할
 * 때 아는 것과 화면이 먼저 말해 주는 것은 다르다.
 *
 * "몇 건 있나"보다 "무엇이 비어 있나"를 앞에 둔다. 금액이 없는 공고, 주소가
 * 없는 공고는 화면에서 '공고문 확인'으로 나가는데, 그 비율이 갑자기 오르면
 * 수집이 깨진 것이다.
 */
export async function GET() {
  if (!(await isAdminRequest())) {
    return Response.json({ error: '운영자 인증이 필요합니다.' }, { status: 401 })
  }

  try {
    const now = new Date()
    const all = await listOfficialProperties({ limit: 600 })

    const open = all.filter(p => checkUrgency(p, now).level !== 'CLOSED')

    const bySource = new Map<string, number>()
    const byProvince = new Map<string, number>()
    const byType = new Map<string, number>()
    let noAddress = 0
    let noPrice = 0
    let noArea = 0
    let noEnd = 0
    const closing = { today: 0, within7: 0, within30: 0 }

    for (const p of open) {
      const src = (p.source ?? '알 수 없음').trim()
      bySource.set(src, (bySource.get(src) ?? 0) + 1)

      const prov = provinceOf(p)
      byProvince.set(prov, (byProvince.get(prov) ?? 0) + 1)

      const kind = isRental(p.housingType) ? '임대' : '분양'
      byType.set(kind, (byType.get(kind) ?? 0) + 1)

      if (!(p.address ?? '').trim()) noAddress++
      if (p.deposit === null && p.monthlyRent === null) noPrice++
      if (p.area === null) noArea++

      const u = checkUrgency(p, now)
      if (u.daysLeft === null) noEnd++
      else {
        if (u.daysLeft === 0) closing.today++
        if (u.daysLeft <= 7) closing.within7++
        if (u.daysLeft <= 30) closing.within30++
      }
    }

    const rank = (m: Map<string, number>) =>
      [...m.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)

    const pct = (n: number) => (open.length === 0 ? 0 : Math.round((n / open.length) * 1000) / 10)

    return Response.json({
      checkedAt: now.toISOString(),
      total: all.length,
      open: open.length,
      closed: all.length - open.length,
      sources: rank(bySource),
      provinces: rank(byProvince),
      types: rank(byType),
      closing,
      /** 비어 있는 것들 — 이 비율이 갑자기 오르면 수집이 깨진 것이다 */
      gaps: {
        noAddress: { count: noAddress, pct: pct(noAddress) },
        noPrice: { count: noPrice, pct: pct(noPrice) },
        noArea: { count: noArea, pct: pct(noArea) },
        noEnd: { count: noEnd, pct: pct(noEnd) },
      },
    })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : '공급 현황을 불러오지 못했습니다.' },
      { status: 500 },
    )
  }
}
