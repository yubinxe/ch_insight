import { dataPortalKey, hasDataPortalKey } from '@/lib/config/data-portal-key'

/**
 * 청약홈 주택형별 공급 — 같은 공고 안에서 무엇이 몇 세대, 얼마인지.
 *
 * 공고 목록 API 는 "총 463세대"까지만 준다. 그런데 사람이 알고 싶은 것은
 * 총계가 아니라 "내가 넣을 84㎡ 가 몇 세대이고 얼마인가"다. 총계만 보여주면
 * 결국 공고문 PDF 를 열어야 하고, 그러면 이 서비스를 거칠 이유가 없다.
 *
 * 이 값들은 공고가 뜨고 나면 거의 바뀌지 않는다. 오래 캐시한다.
 */

const BASE = 'https://api.odcloud.kr/api'
/** 공고 하나의 주택형이 이보다 많은 경우는 없다 */
const PER_PAGE = 100

/** 평 환산 — 1평 = 3.3058㎡ */
const PYEONG = 3.3058

interface RawModel {
  HOUSE_MANAGE_NO?: string
  PBLANC_NO?: string
  MODEL_NO?: string
  /** 주택형. '059.9200A' 처럼 전용면적과 타입이 붙어 있다 */
  HOUSE_TY?: string
  /** 공급면적 ㎡ */
  SUPLY_AR?: string | number
  /** 공급 세대수 */
  SUPLY_HSHLDCO?: string | number
  /** 특별공급 세대수 */
  SPSPLY_HSHLDCO?: string | number
  /** 분양 최고금액 (만원) */
  LTTOT_TOP_AMOUNT?: string | number
}

export interface SupplyModel {
  /** 주택형 표기 그대로 */
  name: string
  /** 공급면적 ㎡ — 없으면 null */
  supplyArea: number | null
  /** 전용면적 ㎡ — 주택형 표기에서 읽는다. 없으면 null */
  exclusiveArea: number | null
  /** 공급 세대수 */
  households: number | null
  /** 분양 최고금액(만원) */
  topAmount: number | null
  /** 공급면적 기준 평당가(만원). 둘 다 있을 때만 센다 */
  perPyeong: number | null
}

export interface SupplyModelResult {
  models: SupplyModel[]
  ok: boolean
  reason: string | null
}

const EMPTY: SupplyModelResult = { models: [], ok: true, reason: null }

function num(v: string | number | undefined | null): number | null {
  if (v === undefined || v === null || v === '') return null
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[^\d.-]/g, ''))
  return Number.isFinite(n) ? n : null
}

/**
 * 주택형 표기에서 전용면적을 읽는다.
 * '059.9200A' → 59.92 · '084.9500' → 84.95
 *
 * 못 읽으면 null 을 준다 — 표기 규칙이 바뀌었는데 그럴듯한 수를 만들면,
 * 화면에서는 진짜 면적과 구별되지 않는다.
 */
function exclusiveFrom(houseTy: string): number | null {
  const m = houseTy.match(/(\d{2,3}(?:\.\d+)?)/)
  if (!m) return null
  const n = Number(m[1])
  return Number.isFinite(n) && n > 0 ? n : null
}

function normalize(rows: RawModel[]): SupplyModel[] {
  return rows
    .map(r => {
      const name = (r.HOUSE_TY ?? '').trim()
      if (!name) return null

      const supplyArea = num(r.SUPLY_AR)
      const topAmount = num(r.LTTOT_TOP_AMOUNT)
      // 일반공급과 특별공급이 따로 오면 합쳐야 그 주택형의 규모가 된다
      const general = num(r.SUPLY_HSHLDCO)
      const special = num(r.SPSPLY_HSHLDCO)
      const households = general === null && special === null ? null : (general ?? 0) + (special ?? 0)

      return {
        name,
        supplyArea,
        exclusiveArea: exclusiveFrom(name),
        households,
        topAmount,
        perPyeong:
          topAmount !== null && supplyArea !== null && supplyArea > 0
            ? Math.round(topAmount / (supplyArea / PYEONG))
            : null,
      } satisfies SupplyModel
    })
    .filter((m): m is SupplyModel => m !== null)
    // 작은 평형부터. 면적을 모르는 것은 뒤로 보낸다.
    .sort((a, b) => (a.supplyArea ?? a.exclusiveArea ?? 1e9) - (b.supplyArea ?? b.exclusiveArea ?? 1e9))
}

/**
 * 공고 하나의 주택형별 공급.
 *
 * `announcementId` 는 `${HOUSE_MANAGE_NO}-${PBLANC_NO}` 로 만들어 두었다.
 * 앞뒤가 같은 값인 경우가 많지만 규칙에 기대지 않고 갈라 쓴다.
 *
 * 실패해도 던지지 않는다. 주택형 표가 없다고 공고 상세가 열리지 않으면
 * 곁들이는 정보 때문에 본문을 잃는 셈이다.
 */
export async function fetchSupplyModels(announcementId: string | null): Promise<SupplyModelResult> {
  const id = (announcementId ?? '').trim()
  if (!id || !hasDataPortalKey()) return EMPTY

  const dash = id.indexOf('-')
  const houseManageNo = dash > 0 ? id.slice(0, dash) : id
  const pblancNo = dash > 0 ? id.slice(dash + 1) : id
  if (!houseManageNo) return EMPTY

  const params = new URLSearchParams({
    serviceKey: dataPortalKey(),
    page: '1',
    perPage: String(PER_PAGE),
    returnType: 'JSON',
    'cond[HOUSE_MANAGE_NO::EQ]': houseManageNo,
    'cond[PBLANC_NO::EQ]': pblancNo,
  })

  try {
    const res = await fetch(`${BASE}/ApplyhomeInfoDetailSvc/v1/getAPTLttotPblancMdl?${params}`, {
      // 공고가 뜬 뒤 주택형이 바뀌는 일은 거의 없다. 하루 동안 다시 묻지 않는다.
      next: { revalidate: 86400 },
    })
    if (!res.ok) return { models: [], ok: false, reason: `주택형 조회 응답 ${res.status}` }

    const json = await res.json()
    // 공공데이터포털은 200 으로 오류 본문을 주기도 한다
    if (json?.code !== undefined && json.code < 0) {
      return { models: [], ok: false, reason: `공공데이터포털 응답: ${json.msg ?? json.code}` }
    }
    if (!Array.isArray(json?.data)) return { models: [], ok: false, reason: '예상과 다른 응답 형식' }

    return { models: normalize(json.data as RawModel[]), ok: true, reason: null }
  } catch (err) {
    return {
      models: [],
      ok: false,
      reason: `호출 실패: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}
