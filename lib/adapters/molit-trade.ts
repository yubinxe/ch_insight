import { dataPortalKey, hasDataPortalKey } from '@/lib/config/data-portal-key'

/**
 * 국토교통부 아파트 매매 실거래가.
 *
 * 분양가가 싼지 비싼지는 그 숫자만 봐서는 알 수 없다. 견줄 것이 있어야 한다.
 * 같은 동네에서 실제로 얼마에 거래됐는지가 가장 가까운 견줌자다.
 *
 * ── 이 비교의 한계를 먼저 적는다 ──
 *
 * 주변 아파트는 연식·규모·브랜드·단지 여건이 제각각이다. 평당가 중앙값 하나로
 * 환산한 값은 "이 동네 아파트가 대체로 이쯤" 이상을 말하지 못한다. 새 아파트가
 * 주변 낡은 아파트보다 비싼 것은 당연하므로, 차액이 곧 이익이나 손해가 아니다.
 *
 * 그래서 화면에서는 '시세 환산액'이라 부르고 '적정가'라 하지 않는다.
 *
 * 평균이 아니라 중앙값을 쓴다. 한 건의 특이 거래가 평균을 통째로 끌고 가는데,
 * 거래가 적은 동네일수록 그렇다.
 */

const BASE = 'https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade'
const PYEONG = 3.3058
/** 이보다 적게 거래된 달은 대푯값을 내지 않는다 — 한두 건으로 시세를 말할 수 없다 */
const MIN_PER_MONTH = 3

export interface TradeDeal {
  /** 법정동 */
  dong: string
  apartment: string
  /** 전용면적 ㎡ */
  area: number
  /** 거래금액 만원 */
  amount: number
  /** 계약 연월 'YYYY-MM' */
  month: string
  floor: number | null
  builtYear: number | null
  /** 전용 평당가 만원 */
  perPyeong: number
}

export interface TradeStat {
  /** 같은 법정동 거래 */
  sameDong: { count: number; medianPerPyeong: number | null }
  /** 같은 시군구 거래 — 동에 표본이 없을 때 물러설 자리 */
  sameSigungu: { count: number; medianPerPyeong: number | null }
  /** 월별 중앙값 추이 (오래된 달부터) */
  monthly: { month: string; medianPerPyeong: number; count: number }[]
  /** 조회한 개월 수 */
  months: number
  ok: boolean
  reason: string | null
}

const EMPTY: TradeStat = {
  sameDong: { count: 0, medianPerPyeong: null },
  sameSigungu: { count: 0, medianPerPyeong: null },
  monthly: [],
  months: 0,
  ok: true,
  reason: null,
}

function median(ns: number[]): number | null {
  if (ns.length === 0) return null
  const s = [...ns].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2)
}

/** 최근 N개월의 'YYYYMM' 목록 (오래된 달부터) */
function recentMonths(n: number, now = new Date()): string[] {
  const out: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    out.push(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return out
}

function text(v: unknown): string {
  return typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : ''
}

function money(v: unknown): number | null {
  // '40,646' 처럼 쉼표가 섞여 온다
  const n = Number(text(v).replace(/[^\d.-]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}

interface RawItem {
  [k: string]: unknown
}

/**
 * 응답 한 건을 우리 모양으로.
 *
 * 국토부 응답의 필드 이름은 개편을 거치며 바뀌어 왔다(`거래금액`/`dealAmount`,
 * `전용면적`/`excluUseAr` 등). 어느 쪽으로 오든 읽도록 후보를 늘어놓는다 —
 * 이름 하나 때문에 화면이 통째로 비는 편보다 낫다.
 */
function pick(it: RawItem, keys: string[]): unknown {
  for (const k of keys) if (it[k] !== undefined && it[k] !== null && it[k] !== '') return it[k]
  return undefined
}

function normalize(items: RawItem[], ym: string): TradeDeal[] {
  const month = `${ym.slice(0, 4)}-${ym.slice(4, 6)}`
  return items
    .map(it => {
      const amount = money(pick(it, ['dealAmount', '거래금액']))
      const area = Number(text(pick(it, ['excluUseAr', '전용면적'])))
      if (amount === null || !Number.isFinite(area) || area <= 0) return null

      // 해제된 거래는 뺀다. 계약이 무른 건을 시세로 세면 안 된다.
      const canceled = text(pick(it, ['cdealType', '해제여부']))
      if (canceled === 'O' || canceled === 'Y') return null

      const floorRaw = Number(text(pick(it, ['floor', '층'])))
      const builtRaw = Number(text(pick(it, ['buildYear', '건축년도'])))

      return {
        dong: text(pick(it, ['umdNm', '법정동'])),
        apartment: text(pick(it, ['aptNm', 'aptName', '아파트'])),
        area,
        amount,
        month,
        floor: Number.isFinite(floorRaw) ? floorRaw : null,
        builtYear: Number.isFinite(builtRaw) ? builtRaw : null,
        perPyeong: Math.round(amount / (area / PYEONG)),
      } satisfies TradeDeal
    })
    .filter((d): d is TradeDeal => d !== null)
}

async function fetchMonth(lawdCd: string, ym: string): Promise<TradeDeal[]> {
  const params = new URLSearchParams({
    serviceKey: dataPortalKey(),
    LAWD_CD: lawdCd,
    DEAL_YMD: ym,
    numOfRows: '1000',
    pageNo: '1',
  })
  const res = await fetch(`${BASE}?${params}`, { next: { revalidate: 21600 } })
  if (!res.ok) throw new Error(`실거래 응답 ${res.status}`)

  const body = await res.text()
  // 이 API 는 XML 이 기본이고, 오류도 XML 로 온다
  if (body.includes('<returnAuthMsg>') || body.includes('SERVICE_KEY')) {
    throw new Error('실거래 인증키가 거부되었습니다 (활용신청 확인 필요)')
  }

  const items: RawItem[] = []
  for (const m of body.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const row: RawItem = {}
    for (const f of m[1].matchAll(/<([A-Za-z가-힣_]+)>([\s\S]*?)<\/\1>/g)) {
      row[f[1]] = f[2].trim()
    }
    items.push(row)
  }
  return normalize(items, ym)
}

/**
 * 주변 실거래 통계.
 *
 * 실패해도 던지지 않는다. 견줌자가 없다고 공고 상세가 열리지 않으면
 * 곁들이는 정보 때문에 본문을 잃는 셈이다.
 */
export async function fetchTradeStat(
  lawdCd: string | null,
  dong: string | null,
  { months = 12 }: { months?: number } = {},
): Promise<TradeStat> {
  const code = (lawdCd ?? '').trim().slice(0, 5)
  if (code.length !== 5 || !hasDataPortalKey()) return EMPTY

  try {
    const yms = recentMonths(months)
    const batches = await Promise.all(
      yms.map(ym => fetchMonth(code, ym).catch(() => [] as TradeDeal[])),
    )
    const all = batches.flat()
    if (all.length === 0) {
      return { ...EMPTY, months, ok: true, reason: '해당 기간에 신고된 거래가 없습니다.' }
    }

    const target = (dong ?? '').trim()
    const inDong = target ? all.filter(d => d.dong === target) : []

    const monthly = yms
      .map(ym => {
        const label = `${ym.slice(0, 4)}-${ym.slice(4, 6)}`
        // 동에 표본이 얇으면 월별 선이 들쭉날쭉해진다. 시군구 전체로 그린다.
        const rows = all.filter(d => d.month === label)
        const med = rows.length >= MIN_PER_MONTH ? median(rows.map(d => d.perPyeong)) : null
        return med === null ? null : { month: label, medianPerPyeong: med, count: rows.length }
      })
      .filter((m): m is { month: string; medianPerPyeong: number; count: number } => m !== null)

    return {
      sameDong: { count: inDong.length, medianPerPyeong: median(inDong.map(d => d.perPyeong)) },
      sameSigungu: { count: all.length, medianPerPyeong: median(all.map(d => d.perPyeong)) },
      monthly,
      months,
      ok: true,
      reason: null,
    }
  } catch (err) {
    return {
      ...EMPTY,
      months,
      ok: false,
      reason: err instanceof Error ? err.message : '실거래를 불러오지 못했습니다.',
    }
  }
}
