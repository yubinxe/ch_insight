import { NextRequest } from 'next/server'
import { dataPortalKey, hasDataPortalKey } from '@/lib/config/data-portal-key'

/**
 * 근처에서 최근에 끝난 청약은 어땠나.
 *
 * 지역 평균은 "경기가 4.7 : 1" 까지만 말한다. 그런데 같은 경기라도 의정부와
 * 화성은 다르고, 같은 의정부에서도 단지마다 갈린다. 바로 옆에서 실제로
 * 어떻게 끝났는지가 훨씬 가까운 참고가 된다.
 *
 * 같은 시·군·구를 먼저 채우고 모자라면 같은 광역으로 넓힌다. 어느 쪽에서
 * 가져왔는지는 응답에 적어 화면이 구분해 보일 수 있게 한다.
 *
 * 과거 결과이고, 이 공고의 결과를 예측하지 않는다.
 */

export const dynamic = 'force-dynamic'

const BASE = 'https://api.odcloud.kr/api'
/** 경쟁률까지 캐물을 공고 수. 한 건마다 한 번씩 더 부르므로 넉넉히 두지 않는다 */
const MAX_LOOKUP = 8
/** 화면에 내보낼 수 */
const MAX_OUT = 6

interface PblancRow {
  HOUSE_MANAGE_NO?: string
  PBLANC_NO?: string
  HOUSE_NM?: string
  HOUSE_SECD_NM?: string
  SUBSCRPT_AREA_CODE_NM?: string
  HSSPLY_ADRES?: string
  PRZWNER_PRESNATN_DE?: string
  RCEPT_ENDDE?: string
}

interface CmpetRow {
  HOUSE_TY?: string
  MODEL_NO?: string
  SUBSCRPT_RANK_CODE?: number | string
  RESIDE_SENM?: string
  SUPLY_HSHLDCO?: number | string
  REQ_CNT?: number | string
  CMPET_RATE?: string
}

function n(v: unknown): number {
  const x = Number(String(v ?? '').replace(/[^\d.-]/g, ''))
  return Number.isFinite(x) ? x : 0
}

function isoDate(raw: string | undefined): string | null {
  const d = (raw ?? '').replace(/[^\d]/g, '')
  return d.length === 8 ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : null
}

async function odcloud<T>(path: string, params: URLSearchParams, revalidate: number): Promise<T[]> {
  const res = await fetch(`${BASE}/${path}?${params}`, { next: { revalidate } })
  if (!res.ok) return []
  const json = await res.json()
  return Array.isArray(json?.data) ? (json.data as T[]) : []
}

/** 공고 하나의 1순위 경쟁률 — 해당지역을 먼저 보고, 없으면 순위 전체로 */
async function rateOf(pblancNo: string) {
  const params = new URLSearchParams({
    serviceKey: dataPortalKey(),
    page: '1',
    perPage: '100',
    returnType: 'JSON',
    'cond[PBLANC_NO::EQ]': pblancNo,
  })
  const rows = await odcloud<CmpetRow>('ApplyhomeInfoCmpetRtSvc/v1/getAPTLttotPblancCmpet', params, 86400)
  if (rows.length === 0) return null

  const first = rows.filter(r => n(r.SUBSCRPT_RANK_CODE) === 1)
  const pool = first.length > 0 ? first : rows

  /**
   * 공급세대는 주택형마다 한 번만 센다.
   *
   * 이 API 는 같은 주택형을 거주구분(해당지역·기타경기·기타지역)으로 나눠
   * 여러 줄로 준다. 그런데 공급세대수는 줄마다 같은 값이 반복된다. 그대로
   * 더하면 거주구분 수만큼 부풀고, 경쟁률은 그만큼 낮아진다 —
   * 1.4 : 1 로 끝난 단지가 '미달 0.69 : 1' 로 적히는 식이다.
   *
   * 신청건수는 줄마다 다르므로 그대로 더한다.
   */
  const perModel = new Map<string, number>()
  for (const r of pool) {
    const key = `${(r.HOUSE_TY ?? '').trim()}|${(r.MODEL_NO ?? '').trim()}`
    if (!perModel.has(key)) perModel.set(key, n(r.SUPLY_HSHLDCO))
  }
  const supply = [...perModel.values()].reduce((a, b) => a + b, 0)
  const applied = pool.reduce((a, r) => a + n(r.REQ_CNT), 0)
  if (supply <= 0) return null

  return {
    supply,
    applied,
    rate: Math.round((applied / supply) * 100) / 100,
    /** 공급보다 신청이 적으면 경쟁률이 아니라 미달이다. 섞어 적지 않는다 */
    under: applied < supply,
  }
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const region = (sp.get('region') ?? '').trim()
  const province = (sp.get('province') ?? '').trim()
  const exclude = (sp.get('exclude') ?? '').trim()
  if (!region && !province) return Response.json({ error: '지역이 필요합니다.' }, { status: 400 })
  if (!hasDataPortalKey()) return Response.json({ items: [] })

  try {
    // 최근 1년 안에 공고된 것들. 발표가 끝난 건이라야 경쟁률이 있다.
    const from = new Date()
    from.setFullYear(from.getFullYear() - 1)
    const params = new URLSearchParams({
      serviceKey: dataPortalKey(),
      page: '1',
      perPage: '600',
      returnType: 'JSON',
      'cond[RCRIT_PBLANC_DE::GTE]': `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}-01`,
    })
    const all = await odcloud<PblancRow>('ApplyhomeInfoDetailSvc/v1/getAPTLttotPblancDetail', params, 3600)

    const today = new Date().toISOString().slice(0, 10)
    const done = all.filter(p => {
      const no = (p.PBLANC_NO ?? '').trim()
      if (!no || no === exclude) return false
      // 발표일이 지난 건만. 아직 안 뽑힌 공고에는 경쟁률이 없다.
      const d = isoDate(p.PRZWNER_PRESNATN_DE)
      return d !== null && d <= today
    })

    const addr = (p: PblancRow) => `${p.HSSPLY_ADRES ?? ''} ${p.SUBSCRPT_AREA_CODE_NM ?? ''}`
    const sameRegion = region ? done.filter(p => addr(p).includes(region)) : []
    const sameProvince = province
      ? done.filter(p => !sameRegion.includes(p) && addr(p).includes(province))
      : []

    const sortByRecent = (a: PblancRow, b: PblancRow) =>
      (isoDate(b.PRZWNER_PRESNATN_DE) ?? '').localeCompare(isoDate(a.PRZWNER_PRESNATN_DE) ?? '')

    // 가까운 데서 먼저 채우고 모자라면 넓힌다
    const picked = [
      ...sameRegion.sort(sortByRecent).slice(0, 3).map(p => ({ p, scope: 'REGION' as const })),
      ...sameProvince.sort(sortByRecent).slice(0, MAX_LOOKUP).map(p => ({ p, scope: 'PROVINCE' as const })),
    ].slice(0, MAX_LOOKUP)

    const rows = await Promise.all(
      picked.map(async ({ p, scope }) => {
        const no = (p.PBLANC_NO ?? '').trim()
        const r = await rateOf(no).catch(() => null)
        if (!r) return null
        return {
          name: (p.HOUSE_NM ?? '').trim(),
          kind: (p.HOUSE_SECD_NM ?? '').trim(),
          area: (p.SUBSCRPT_AREA_CODE_NM ?? '').trim(),
          resultDate: isoDate(p.PRZWNER_PRESNATN_DE),
          scope,
          ...r,
        }
      }),
    )

    const items = rows
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => (b.resultDate ?? '').localeCompare(a.resultDate ?? ''))
      .slice(0, MAX_OUT)

    return Response.json({ items, region, province })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : '인근 단지를 불러오지 못했습니다.' },
      { status: 500 },
    )
  }
}
