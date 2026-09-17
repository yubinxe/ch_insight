import type { Customer, Property } from '../types'

/** 탐색에는 확인하지 않은 연령·소득·가구 사실을 만들지 않는다. */
export interface SearchConditions {
  preferredRegions: string[]
  preferredHousingTypes: Customer['preferredHousingTypes']
  maxDeposit: number | null
  maxMonthlyRent: number | null
  minArea: number | null
}

/**
 * 후보 판정은 서로 의미가 다른 4가지를 분리한다.
 *
 *  1) 자격(eligibility)   — 소득·자산·거주기간 등 공식 요건. 자격 엔진 전까지 전부 UNKNOWN.
 *  2) 예산(budget)        — 사용자가 정한 상한. 기본 후보의 필수조건이다.
 *  3) 선호 적합도(fit)    — 지역·면적·주택유형이 희망과 얼마나 맞는지.
 *  4) 마감 긴급도(urgency)— 언제까지 접수인지. 적합도를 올리지 않는다.
 *
 * 이 넷을 하나의 점수로 합치지 않는다. 합치면 "예산 초과인데 점수가 높은" 결과가 나온다.
 */

/** 선호 적합도 가중치 — 예산·마감은 여기에 포함하지 않는다 */
export const FIT_WEIGHTS = {
  region: 50,
  area: 25,
  housingType: 25,
} as const

/** 자격 판정 엔진이 없으므로 현재 가능한 상태는 UNKNOWN 뿐이다 */
export type EligibilityStatus = 'UNKNOWN'

export interface BudgetCheck {
  /** 상한 초과액(만원). 0 이면 상한 이내 */
  depositOver: number
  rentOver: number
  /** 상한 이내 여유액(만원). 초과 시 0 */
  depositRoom: number
  rentRoom: number
  /**
   * 확인된 초과가 없다는 뜻이며 "예산에 맞는다"는 보장이 아니다.
   * 공고에 임대조건이 없으면 unverified 에 남는다. 화면에는 반드시 확인 필요로 적는다.
   */
  withinBudget: boolean
  /** 공고에 금액이 없어 비교하지 못한 항목 */
  unverified: ('DEPOSIT' | 'RENT')[]
}

export interface PreferenceFit {
  regionScore: number
  /** 공고에 면적이 없으면 null. 0 으로 두면 좁은 집으로 오인된다 */
  areaScore: number | null
  housingTypeScore: number
  /** 지역·면적·유형만 반영한 0~100. 면적을 모르면 그 가중치를 나머지에 재분배한다 */
  preferenceScore: number
}

export type UrgencyLevel = 'UNKNOWN' | 'CLOSED' | 'TODAY' | 'IMMINENT' | 'SOON' | 'NORMAL' | 'UPCOMING'

export interface UrgencyInfo {
  daysLeft: number | null
  level: UrgencyLevel
  label: string
}

export type CandidateTier = 'PRIMARY' | 'RELAXED'

/**
 * 판정에 쓴 정보가 충분했는지.
 *
 * PARTIAL 은 "조건에 안 맞는다"가 아니라 "공고가 값을 주지 않아 비교하지 못했다"는 뜻이다.
 * 적합도 점수만으로 줄을 세우면, 아무것도 확인하지 못한 공고가 전부 확인된 공고를 이긴다.
 */
export type CandidateConfidence = 'VERIFIED' | 'PARTIAL'

export interface Candidate {
  propertyId: string
  fit: PreferenceFit
  budget: BudgetCheck
  urgency: UrgencyInfo
  eligibility: EligibilityStatus
  /** 실제 값 차이로 만든 근거 문장 */
  reasons: string[]
  /** 확인이 필요한 사항 */
  cautions: string[]
  tier: CandidateTier
  /** 예산·면적을 실제로 비교했는지. PARTIAL 은 확인 필요로 표시한다 */
  confidence: CandidateConfidence
  /** 기본 후보에서 제외된 이유 (RELAXED 일 때만) */
  excludedBy: ('DEPOSIT' | 'RENT' | 'CLOSED')[]
}

/** 인접 생활권 — 1순위가 아니어도 부분 점수를 준다 */
const NEARBY: Record<string, string[]> = {
  관악구: ['동작구', '금천구', '영등포구', '서초구'],
  동작구: ['관악구', '영등포구', '서초구', '용산구'],
  마포구: ['서대문구', '영등포구', '용산구', '은평구'],
  서초구: ['강남구', '동작구', '송파구', '관악구'],
  강남구: ['서초구', '송파구', '성동구'],
  송파구: ['강남구', '성동구', '강동구'],
  성동구: ['광진구', '동대문구', '중구', '송파구'],
  영등포구: ['동작구', '관악구', '마포구', '금천구'],
  금천구: ['관악구', '영등포구'],
  서대문구: ['마포구', '은평구'],
}

/**
 * 서울 자치구 → 광역.
 *
 * LH 공고는 지역본부(광역) 단위로만 지역을 준다. "서울" 공고와 "관악구" 희망은
 * 문자열로는 안 맞지만 실제로는 관련이 있다. 다만 같은 지역이라고 단정하지 않고
 * 부분 점수만 주고 "세부 지역은 공고문 확인"을 남긴다.
 *
 * 광역시의 '남구·북구' 등은 부산·대구·울산·광주·인천에 중복 존재해 되짚을 수 없으므로
 * 서울만 다룬다. 확실한 것만 넣는다.
 */
const PROVINCE_OF: Record<string, string> = Object.fromEntries(
  [
    '강남구','강동구','강북구','강서구','관악구','광진구','구로구','금천구','노원구','도봉구',
    '동대문구','동작구','마포구','서대문구','서초구','성동구','성북구','송파구','양천구','영등포구',
    '용산구','은평구','종로구','중구','중랑구',
  ].map(gu => [gu, '서울']),
)

/** 전국 단위 공고 — 지역으로 걸러내면 안 되지만 "내 동네"라고 말할 수도 없다 */
const NATIONWIDE = '전국'

/** 희망지역과 공고 지역이 같은 광역에 속하는가 (어느 쪽이 광역이든) */
function sameProvince(pref: string, region: string): string | null {
  if (PROVINCE_OF[pref] === region) return region
  if (PROVINCE_OF[region] === pref) return pref
  return null
}

/**
 * 후보 목록에 넣을 만한 지역인가.
 * 정확히 같거나, 인접 생활권이거나, 같은 광역이면 통과시킨다.
 */
export function regionRelated(prefs: string[], region: string): boolean {
  if (region === NATIONWIDE) return true
  if (prefs.includes(region)) return true
  if (prefs.some(r => (NEARBY[r] ?? []).includes(region))) return true
  return prefs.some(r => sameProvince(r, region) !== null)
}

/** 달력 기준 남은 일수 (자정~자정). 시:분에 따라 값이 흔들리지 않게 한다. */
export function daysUntil(dateStr: string | null, now = new Date()) {
  if (!dateStr) return null
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
  const target = Date.parse(`${dateStr}T00:00:00+09:00`)
  if (!Number.isFinite(target)) return null
  return Math.round((target - Date.parse(`${today}T00:00:00+09:00`)) / 86400000)
}

/**
 * 값이 없으면 금액을 만들지 않고 "공고문 확인" 으로 적는다.
 * 0 원으로 표시하면 무료 임대처럼 읽힌다.
 */
export function formatManOr(man: number | null, fallback = '공고문 확인') {
  return man === null ? fallback : formatMan(man)
}

/** 면적도 같은 원칙 */
export function formatAreaOr(area: number | null, fallback = '공고문 확인') {
  return area === null ? fallback : `${area}㎡`
}

export function formatMan(man: number) {
  if (man >= 10000) {
    const eok = Math.floor(man / 10000)
    const rest = man % 10000
    return rest ? `${eok}억 ${rest.toLocaleString()}만원` : `${eok}억원`
  }
  return `${man.toLocaleString()}만원`
}

function regionFit(customer: SearchConditions, property: Property) {
  const prefs = customer.preferredRegions
  if (prefs[0] === property.region) return { score: 100, kind: 'FIRST' as const }
  if (prefs.includes(property.region)) return { score: 85, kind: 'LISTED' as const }
  const near = prefs.find(r => (NEARBY[r] ?? []).includes(property.region))
  if (near) return { score: 50, kind: 'NEARBY' as const, via: near }
  if (property.region === NATIONWIDE) return { score: 40, kind: 'NATIONWIDE' as const }
  // 광역 단위 공고 — 관련은 있지만 같은 동네라고 말할 수 없다
  for (const r of prefs) {
    const province = sameProvince(r, property.region)
    if (province) return { score: 45, kind: 'PROVINCE' as const, via: province }
  }
  return { score: 0, kind: 'OUTSIDE' as const }
}

/**
 * 면적은 "희망 최소" 기준이다. 최소 이상이면 충족이며 넓다고 감점하지 않는다.
 * 점수 구간으로 넓다/좁다를 역추정하지 않고 실제 ㎡ 차이를 그대로 쓴다.
 */
function areaFit(customer: SearchConditions, property: Property) {
  // 공고가 면적을 주지 않으면 비교하지 않는다. 0 점을 주면 "좁다"고 단정하는 셈이다.
  if (property.area === null) return { score: null, diff: null }
  const diff = property.area - (customer.minArea ?? 0)
  if (diff >= 0) return { score: 100, diff }
  if (diff >= -3) return { score: 60, diff }
  if (diff >= -6) return { score: 30, diff }
  return { score: 0, diff }
}

function housingTypeFit(customer: SearchConditions, property: Property) {
  if (!customer.preferredHousingTypes.length) return { score: 100, kind: 'UNKNOWN' as const }
  if (customer.preferredHousingTypes[0] === property.housingType) return { score: 100, kind: 'FIRST' as const }
  // 공고 표기는 자유 문자열이므로 선택지 목록과 문자열로 비교한다
  if ((customer.preferredHousingTypes as string[]).includes(property.housingType)) {
    return { score: 85, kind: 'LISTED' as const }
  }
  return { score: 30, kind: 'OTHER' as const }
}

export function checkBudget(customer: SearchConditions, property: Property): BudgetCheck {
  const unverified: BudgetCheck['unverified'] = []
  if (property.deposit === null) unverified.push('DEPOSIT')
  if (property.monthlyRent === null) unverified.push('RENT')

  const depositOver =
    customer.maxDeposit === null || property.deposit === null
      ? 0
      : Math.max(0, property.deposit - customer.maxDeposit)
  const rentOver =
    customer.maxMonthlyRent === null || property.monthlyRent === null
      ? 0
      : Math.max(0, property.monthlyRent - customer.maxMonthlyRent)

  return {
    depositOver,
    rentOver,
    depositRoom:
      depositOver > 0 || customer.maxDeposit === null || property.deposit === null
        ? 0
        : customer.maxDeposit - property.deposit,
    rentRoom:
      rentOver > 0 || customer.maxMonthlyRent === null || property.monthlyRent === null
        ? 0
        : customer.maxMonthlyRent - property.monthlyRent,
    withinBudget: depositOver === 0 && rentOver === 0,
    unverified,
  }
}

export function checkUrgency(property: Property, now = new Date()): UrgencyInfo {
  if (property.status === 'CLOSED' || property.status === 'CANCELLED') return { daysLeft: null, level: 'CLOSED', label: property.status === 'CANCELLED' ? '모집 취소' : '접수 마감' }
  const d = daysUntil(property.applicationEnd, now)
  if (d === null) return { daysLeft: null, level: 'UNKNOWN', label: '접수 마감일 미정' }
  if (d < 0) return { daysLeft: d, level: 'CLOSED', label: '접수 마감' }

  const start = daysUntil(property.applicationStart, now)
  if (start !== null && start > 0) {
    return { daysLeft: d, level: 'UPCOMING', label: `${start}일 뒤 접수 시작` }
  }
  if (d === 0) return { daysLeft: 0, level: 'TODAY', label: '오늘 접수 마감' }
  if (d <= 3) return { daysLeft: d, level: 'IMMINENT', label: `접수 마감 ${d}일 전` }
  if (d <= 7) return { daysLeft: d, level: 'SOON', label: `접수 마감 ${d}일 전` }
  return { daysLeft: d, level: 'NORMAL', label: `접수 마감까지 ${d}일` }
}

export function evaluateFit(customer: SearchConditions, property: Property): PreferenceFit {
  const r = regionFit(customer, property)
  const a = areaFit(customer, property)
  const h = housingTypeFit(customer, property)
  // 면적을 모르면 그 가중치(25)를 지역·유형에 비율대로 재분배한다.
  // 0 점으로 처리하면 정보가 없다는 이유로 점수가 깎인다.
  const parts: [number, number][] =
    a.score === null
      ? [
          [r.score, FIT_WEIGHTS.region],
          [h.score, FIT_WEIGHTS.housingType],
        ]
      : [
          [r.score, FIT_WEIGHTS.region],
          [a.score, FIT_WEIGHTS.area],
          [h.score, FIT_WEIGHTS.housingType],
        ]
  const totalWeight = parts.reduce((sum, [, w]) => sum + w, 0)
  const preferenceScore = Math.round(
    parts.reduce((sum, [score, w]) => sum + score * w, 0) / totalWeight,
  )
  return { regionScore: r.score, areaScore: a.score, housingTypeScore: h.score, preferenceScore }
}

/** 근거 문장은 전부 실제 값 차이에서 만든다 */
function buildReasons(customer: SearchConditions, property: Property, budget: BudgetCheck): string[] {
  const out: string[] = []

  const r = regionFit(customer, property)
  if (r.kind === 'FIRST') out.push(`희망 1순위 지역 ${property.region}`)
  else if (r.kind === 'LISTED') out.push(`희망지역 ${property.region}`)
  else if (r.kind === 'NEARBY') out.push(`희망하신 ${r.via} 인접 생활권`)
  else if (r.kind === 'PROVINCE') out.push(`${r.via} 전역 대상 공고 — 세부 지역은 공고문에서 확인하세요`)
  else if (r.kind === 'NATIONWIDE') out.push('전국 대상 공고 — 대상 지역은 공고문에서 확인하세요')

  if (
    budget.unverified.length === 0 &&
    budget.depositOver === 0 &&
    budget.rentOver === 0 &&
    customer.maxDeposit !== null &&
    property.deposit !== null &&
    property.monthlyRent !== null
  ) {
    out.push(
      `보증금 ${formatMan(property.deposit)} · 월 ${property.monthlyRent}만원 — 상한 대비 보증금 ${formatMan(
        budget.depositRoom,
      )} 여유`,
    )
  }

  const a = areaFit(customer, property)
  if (a.diff !== null && a.diff >= 0 && customer.minArea !== null) {
    out.push(
      a.diff === 0
        ? `전용 ${property.area}㎡ — 희망 최소 면적과 동일`
        : `전용 ${property.area}㎡ — 희망 최소 ${customer.minArea}㎡보다 ${a.diff}㎡ 넓음`,
    )
  }

  const h = housingTypeFit(customer, property)
  if (h.kind !== 'OTHER' && h.kind !== 'UNKNOWN') out.push(`관심 주택유형 ${property.housingType}`)

  return out
}

/**
 * 모든 후보에 빠짐없이 붙는 마지막 한 줄.
 *
 * 자격 판정 엔진이 없으므로 이 문장은 예외 없이 참이고, 화면 세 곳과 이메일이
 * 같은 말을 해야 한다. 각자 적어두면 한 곳만 고쳐지고 나머지는 옛말로 남는다.
 */
export const ELIGIBILITY_CAUTION = '소득·자산·거주기간 등 자격요건 체크 요망'

function buildCautions(
  customer: SearchConditions,
  property: Property,
  budget: BudgetCheck,
  urgency: UrgencyInfo,
): string[] {
  const out: string[] = []

  if (budget.depositOver > 0 && property.deposit !== null) {
    out.push(
      `보증금 ${formatMan(property.deposit)} — 상한 ${formatMan(customer.maxDeposit ?? 0)}보다 ${formatMan(
        budget.depositOver,
      )} 초과`,
    )
  }
  if (budget.rentOver > 0) {
    out.push(
      `월 임대료 ${property.monthlyRent}만원 — 상한 ${customer.maxMonthlyRent}만원보다 ${budget.rentOver}만원 초과`,
    )
  }

  const a = areaFit(customer, property)
  if (a.diff !== null && a.diff < 0) {
    out.push(`전용 ${property.area}㎡ — 희망 최소 ${customer.minArea}㎡보다 ${Math.abs(a.diff)}㎡ 좁음`)
  }

  const h = housingTypeFit(customer, property)
  if (h.kind === 'OTHER') out.push(`관심 목록에 없는 유형 (${property.housingType})`)

  // 공고가 임대조건·면적을 주지 않는 경우. 비었다고 예산 이내라고 말하지 않는다.
  // 카드에는 이 중 첫 줄만 들어가므로 한 호흡에 읽히게 끊어 쓴다.
  if (budget.unverified.length === 2) {
    out.push('공급금액 미공개 — 모집공고문 확인 요망')
  } else if (budget.unverified.includes('DEPOSIT')) {
    out.push('보증금 미공개 — 모집공고문 확인 요망')
  } else if (budget.unverified.includes('RENT')) {
    out.push('월 임대료 미공개 — 모집공고문 확인 요망')
  }
  if (property.area === null) out.push('전용면적 미공개 — 모집공고문 확인 요망')

  // 자격 엔진이 없으므로 항상 미확인이다. 미확인을 불충족으로 단정하지 않는다.
  out.push(ELIGIBILITY_CAUTION)
  if (customer.maxDeposit === null || customer.maxMonthlyRent === null) out.push('미입력 주거비 항목 — 예산 대조 안 함')

  if (urgency.level === 'CLOSED') out.push('접수 마감된 공고')
  if (urgency.level === 'UNKNOWN') out.push('접수 마감일 미공개')
  if (!property.resultDate) out.push('당첨자 발표일 미공개')

  return out
}

export function buildCandidate(customer: SearchConditions, property: Property, now = new Date()): Candidate {
  const fit = evaluateFit(customer, property)
  const budget = checkBudget(customer, property)
  const urgency = checkUrgency(property, now)

  const excludedBy: Candidate['excludedBy'] = []
  if (budget.depositOver > 0) excludedBy.push('DEPOSIT')
  if (budget.rentOver > 0) excludedBy.push('RENT')
  if (urgency.level === 'CLOSED') excludedBy.push('CLOSED')

  return {
    propertyId: property.id,
    fit,
    budget,
    urgency,
    eligibility: 'UNKNOWN',
    reasons: buildReasons(customer, property, budget),
    cautions: buildCautions(customer, property, budget, urgency),
    confidence: budget.unverified.length === 0 && property.area !== null ? 'VERIFIED' : 'PARTIAL',
    tier: excludedBy.length === 0 ? 'PRIMARY' : 'RELAXED',
    excludedBy,
  }
}

/**
 * 두 후보를 비교해 의사결정 문장을 만든다.
 * 예산을 만족하는 후보끼리만 비교하며, 비용·경쟁환경을 함께 언급한다.
 */
export function compareCandidates(
  a: { property: Property; candidate: Candidate },
  b: { property: Property; candidate: Candidate },
): string {
  // 목록 정렬과 같은 기준으로 고른다. 점수만 보면 "확인 못한 공고가 더 잘 맞는다"고 말하게 된다.
  const rank = (x: { candidate: Candidate }) =>
    (x.candidate.confidence === 'VERIFIED' ? 0 : 1000) - x.candidate.fit.preferenceScore
  const [hi, lo] = rank(a) <= rank(b) ? [a, b] : [b, a]

  // 한쪽이라도 값이 없으면 비교하지 않는다. 없는 값을 0 으로 두면 "더 싸다"가 뒤집힌다.
  const cost = (p: Property) =>
    p.monthlyRent === null || p.deposit === null ? null : p.monthlyRent + p.deposit / 100
  const hiCost = cost(hi.property)
  const loCost = cost(lo.property)
  const cheaper = hiCost !== null && loCost !== null && hiCost < loCost

  const lessCompetitive =
    hi.property.competitionRate !== null &&
    lo.property.competitionRate !== null &&
    hi.property.competitionRate < lo.property.competitionRate

  const bits: string[] = []
  if (cheaper) bits.push('비용 부담이 낮고')
  if (lessCompetitive) bits.push('직전 공고 경쟁이 덜해')
  if (hi.candidate.confidence === 'VERIFIED' && lo.candidate.confidence === 'PARTIAL') {
    bits.push('예산·면적까지 확인돼')
  }
  const why = bits.length ? bits.join(' ') : '희망 조건에 더 가까워'

  return `${lo.property.name}보다 ${hi.property.name}이(가) ${why} 먼저 살펴보시기 좋습니다.`
}
