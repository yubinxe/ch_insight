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
  withinBudget: boolean
}

export interface PreferenceFit {
  regionScore: number
  areaScore: number
  housingTypeScore: number
  /** 지역·면적·유형만 반영한 0~100 */
  preferenceScore: number
}

export type UrgencyLevel = 'UNKNOWN' | 'CLOSED' | 'TODAY' | 'IMMINENT' | 'SOON' | 'NORMAL' | 'UPCOMING'

export interface UrgencyInfo {
  daysLeft: number | null
  level: UrgencyLevel
  label: string
}

export type CandidateTier = 'PRIMARY' | 'RELAXED'

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

/** 달력 기준 남은 일수 (자정~자정). 시:분에 따라 값이 흔들리지 않게 한다. */
export function daysUntil(dateStr: string | null, now = new Date()) {
  if (!dateStr) return null
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
  const target = Date.parse(`${dateStr}T00:00:00+09:00`)
  if (!Number.isFinite(target)) return null
  return Math.round((target - Date.parse(`${today}T00:00:00+09:00`)) / 86400000)
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
  return { score: 0, kind: 'OUTSIDE' as const }
}

/**
 * 면적은 "희망 최소" 기준이다. 최소 이상이면 충족이며 넓다고 감점하지 않는다.
 * 점수 구간으로 넓다/좁다를 역추정하지 않고 실제 ㎡ 차이를 그대로 쓴다.
 */
function areaFit(customer: SearchConditions, property: Property) {
  const diff = property.area - (customer.minArea ?? 0)
  if (diff >= 0) return { score: 100, diff }
  if (diff >= -3) return { score: 60, diff }
  if (diff >= -6) return { score: 30, diff }
  return { score: 0, diff }
}

function housingTypeFit(customer: SearchConditions, property: Property) {
  if (!customer.preferredHousingTypes.length) return { score: 100, kind: 'UNKNOWN' as const }
  if (customer.preferredHousingTypes[0] === property.housingType) return { score: 100, kind: 'FIRST' as const }
  if (customer.preferredHousingTypes.includes(property.housingType)) return { score: 85, kind: 'LISTED' as const }
  return { score: 30, kind: 'OTHER' as const }
}

export function checkBudget(customer: SearchConditions, property: Property): BudgetCheck {
  const depositOver = customer.maxDeposit === null ? 0 : Math.max(0, property.deposit - customer.maxDeposit)
  const rentOver = customer.maxMonthlyRent === null ? 0 : Math.max(0, property.monthlyRent - customer.maxMonthlyRent)
  return {
    depositOver,
    rentOver,
    depositRoom: depositOver > 0 || customer.maxDeposit === null ? 0 : customer.maxDeposit - property.deposit,
    rentRoom: rentOver > 0 || customer.maxMonthlyRent === null ? 0 : customer.maxMonthlyRent - property.monthlyRent,
    withinBudget: depositOver === 0 && rentOver === 0,
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
  const preferenceScore = Math.round(
    (r.score * FIT_WEIGHTS.region + a.score * FIT_WEIGHTS.area + h.score * FIT_WEIGHTS.housingType) / 100,
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

  if (budget.depositOver === 0 && budget.rentOver === 0 && customer.maxDeposit !== null) {
    out.push(
      `보증금 ${formatMan(property.deposit)} · 월 ${property.monthlyRent}만원 — 상한 대비 보증금 ${formatMan(
        budget.depositRoom,
      )} 여유`,
    )
  }

  const a = areaFit(customer, property)
  if (a.diff >= 0 && customer.minArea !== null) {
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

function buildCautions(
  customer: SearchConditions,
  property: Property,
  budget: BudgetCheck,
  urgency: UrgencyInfo,
): string[] {
  const out: string[] = []

  if (budget.depositOver > 0) {
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
  if (a.diff < 0) {
    out.push(`전용 ${property.area}㎡ — 희망 최소 ${customer.minArea}㎡보다 ${Math.abs(a.diff)}㎡ 좁음`)
  }

  const h = housingTypeFit(customer, property)
  if (h.kind === 'OTHER') out.push(`관심 목록에 없는 유형 (${property.housingType})`)

  // 자격 엔진이 없으므로 항상 미확인이다. 미확인을 불충족으로 단정하지 않는다.
  out.push('소득·자산·거주기간 등 자격요건은 아직 확인하지 않았습니다')
  if (customer.maxDeposit === null || customer.maxMonthlyRent === null) out.push('정하지 않은 주거비 항목은 예산 충족 여부를 확인하지 않았습니다')

  if (urgency.level === 'CLOSED') out.push('접수가 마감된 공고입니다')
  if (urgency.level === 'UNKNOWN') out.push('접수 마감일이 공고에 공개되지 않았습니다')
  if (!property.resultDate) out.push('당첨자 발표일이 공고에 공개되지 않았습니다')

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
  const [hi, lo] =
    a.candidate.fit.preferenceScore >= b.candidate.fit.preferenceScore ? [a, b] : [b, a]

  const cheaper =
    hi.property.monthlyRent + hi.property.deposit / 100 < lo.property.monthlyRent + lo.property.deposit / 100
  const lessCompetitive = hi.property.competitionRate < lo.property.competitionRate

  const bits: string[] = []
  if (cheaper) bits.push('비용 부담이 낮고')
  if (lessCompetitive) bits.push('직전 공고 경쟁이 덜해')
  const why = bits.length ? bits.join(' ') : '희망 조건에 더 가까워'

  return `${lo.property.name}보다 ${hi.property.name}이(가) ${why} 먼저 살펴보시기 좋습니다.`
}
