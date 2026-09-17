import { NextRequest } from 'next/server'
import { dataPortalKey, hasDataPortalKey } from '@/lib/config/data-portal-key'

/**
 * 한 광역의 최근 청약 결과 요약.
 *
 * 통계 화면은 전국을 한 달씩 보여준다. 공고 상세에서 알고 싶은 것은 그게
 * 아니라 "이 지역은 요즘 어느 정도로 붐비나" 하나다. 그 한 줄을 위해
 * 110KB 를 받게 할 수는 없어 서버에서 추려 보낸다.
 *
 * 한 달치는 표본이 얇아 들쭉날쭉하다. 열두 달을 합쳐 하나로 말한다 —
 * 평균의 평균이 아니라 신청 총합 ÷ 공급 총합이다. 달마다 규모가 다르므로
 * 달별 경쟁률을 다시 평균하면 작은 달이 큰 달과 같은 무게를 갖는다.
 *
 * 과거 결과이고, 이 공고의 결과를 예측하지 않는다.
 */

export const dynamic = 'force-dynamic'

const BASE = 'https://api.odcloud.kr/api'
/** 통계는 두어 달 늦게 올라온다. 현재 달부터 세면 빈 달을 세는 셈이다 */
const LAG_MONTHS = 2

interface CompRow {
  STAT_DE?: string
  SUBSCRPT_AREA_CODE_NM?: string
  SUPLY_HSHLDCO?: number
  SUPLY_REQ_CNT?: number
}

interface ScoreRow {
  STAT_DE?: string
  SUBSCRPT_AREA_CODE_NM?: string
  RESIDE_SECD_NM?: string
  AVRG_SCORE?: number
  LWET_SCORE?: number
  TOP_SCORE?: number
}

function monthRange(count: number) {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - LAG_MONTHS)
  const to = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`
  d.setMonth(d.getMonth() - (count - 1))
  const from = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`
  return { from, to }
}

async function pull<T>(path: string, from: string, to: string, perPage: number): Promise<T[]> {
  const params = new URLSearchParams({
    serviceKey: dataPortalKey(),
    page: '1',
    perPage: String(perPage),
    returnType: 'JSON',
    'cond[STAT_DE::GTE]': from,
    'cond[STAT_DE::LTE]': to,
  })
  const res = await fetch(`${BASE}/ApplyhomeStatSvc/v1/${path}?${params}`, {
    next: { revalidate: 3600 },
  })
  if (!res.ok) return []
  const json = await res.json()
  return Array.isArray(json?.data) ? (json.data as T[]) : []
}

export async function GET(req: NextRequest) {
  const province = (req.nextUrl.searchParams.get('province') ?? '').trim()
  const months = Math.min(24, Math.max(3, Number(req.nextUrl.searchParams.get('months') ?? 12) || 12))
  if (!province) return Response.json({ error: '지역이 필요합니다.' }, { status: 400 })
  if (!hasDataPortalKey()) return Response.json({ province, months, competition: null, scores: [] })

  const { from, to } = monthRange(months)

  try {
    const [comp, score] = await Promise.all([
      pull<CompRow>('getAPTCmpetrtAreaStat', from, to, 2000),
      pull<ScoreRow>('getAPTApsPrzwnerStat', from, to, 1000),
    ])

    // LH 의 '전남·광주' 처럼 묶인 표기를 고른 사람도 맞도록 갈라서 견준다
    const wants = province.split('·').map(t => t.trim()).filter(Boolean)
    const mine = (name: string | undefined) => {
      const n = (name ?? '').trim()
      return n !== '' && wants.some(w => n === w || n.includes(w))
    }

    const rows = comp.filter(r => mine(r.SUBSCRPT_AREA_CODE_NM))
    const supply = rows.reduce((a, r) => a + (Number(r.SUPLY_HSHLDCO) || 0), 0)
    const applied = rows.reduce((a, r) => a + (Number(r.SUPLY_REQ_CNT) || 0), 0)

    // 월별 흐름 — 공급이 없던 달은 경쟁률을 말할 수 없으므로 뺀다
    const byMonth = new Map<string, { supply: number; applied: number }>()
    for (const r of rows) {
      const m = (r.STAT_DE ?? '').trim()
      if (!m) continue
      const cur = byMonth.get(m) ?? { supply: 0, applied: 0 }
      cur.supply += Number(r.SUPLY_HSHLDCO) || 0
      cur.applied += Number(r.SUPLY_REQ_CNT) || 0
      byMonth.set(m, cur)
    }
    const monthly = [...byMonth.entries()]
      .filter(([, v]) => v.supply > 0)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([m, v]) => ({
        month: `${m.slice(0, 4)}-${m.slice(4, 6)}`,
        rate: Math.round((v.applied / v.supply) * 10) / 10,
        supply: v.supply,
      }))

    // 가점은 거주 구분(해당지역/기타지역)으로 나뉜다. 섞으면 뜻이 흐려진다.
    const sRows = score.filter(r => mine(r.SUBSCRPT_AREA_CODE_NM))
    const buckets = new Map<string, { low: number[]; avg: number[]; top: number[] }>()
    for (const r of sRows) {
      const kind = (r.RESIDE_SECD_NM ?? '').trim() || '전체'
      const b = buckets.get(kind) ?? { low: [], avg: [], top: [] }
      // 0 점은 '가점제 당첨 없음·미발표'라 통계에 섞으면 최저값을 끌어내린다
      if (Number(r.LWET_SCORE) > 0) b.low.push(Number(r.LWET_SCORE))
      if (Number(r.AVRG_SCORE) > 0) b.avg.push(Number(r.AVRG_SCORE))
      if (Number(r.TOP_SCORE) > 0) b.top.push(Number(r.TOP_SCORE))
      buckets.set(kind, b)
    }
    const scores = [...buckets.entries()]
      .filter(([, b]) => b.avg.length > 0)
      .map(([kind, b]) => ({
        kind,
        lowest: b.low.length ? Math.min(...b.low) : null,
        average: b.avg.length ? Math.round((b.avg.reduce((x, y) => x + y, 0) / b.avg.length) * 10) / 10 : null,
        highest: b.top.length ? Math.max(...b.top) : null,
        months: b.avg.length,
      }))

    return Response.json({
      province,
      months,
      from,
      to,
      competition:
        supply > 0
          ? {
              rate: Math.round((applied / supply) * 10) / 10,
              supply,
              applied,
              monthly,
            }
          : null,
      scores,
    })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : '통계를 불러오지 못했습니다.' },
      { status: 500 },
    )
  }
}
