import type { Customer, MatchScoreBreakdown, Property } from '../types'

/**
 * Opportunity Score — "당첨확률"이 아니다.
 * 통계적으로 검증된 당첨 확률이 아니라, 고객 조건 대비 지원 우선순위 점수다.
 *
 * 가중치: 지역 30 · 가격 20 · 면적 15 · 주택유형 15 · 경쟁강도 10 · 마감긴급도 10
 */
export const SCORE_WEIGHTS = {
  region: 30,
  affordability: 20,
  area: 15,
  housingType: 15,
  competition: 10,
  urgency: 10,
} as const

/** 인접 생활권 — 1지망이 아니어도 부분 점수를 준다 */
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

function regionScore(customer: Customer, property: Property) {
  const prefs = customer.preferredRegions
  if (prefs[0] === property.region) return 1
  if (prefs.includes(property.region)) return 0.85
  if (prefs.some(r => (NEARBY[r] ?? []).includes(property.region))) return 0.45
  return 0
}

function affordabilityScore(customer: Customer, property: Property) {
  // 보증금·월세 각각 예산 대비 여유도. 초과 시 급격히 감점.
  const depositRatio = property.deposit / Math.max(1, customer.maxDeposit)
  const rentRatio = property.monthlyRent / Math.max(1, customer.maxMonthlyRent)
  const one = (ratio: number) => {
    if (ratio <= 0.7) return 1
    if (ratio <= 1) return 1 - (ratio - 0.7) * 0.5 // 0.85~1
    if (ratio <= 1.2) return 0.5 - (ratio - 1) * 1.5 // 0.2~0.5
    return 0
  }
  return one(depositRatio) * 0.5 + one(rentRatio) * 0.5
}

function areaScore(customer: Customer, property: Property) {
  const diff = property.area - customer.minArea
  if (diff >= 0 && diff <= 8) return 1
  if (diff > 8) return Math.max(0.6, 1 - (diff - 8) * 0.03)
  if (diff >= -3) return 0.6
  if (diff >= -6) return 0.3
  return 0
}

function housingTypeScore(customer: Customer, property: Property) {
  if (customer.preferredHousingTypes[0] === property.housingType) return 1
  if (customer.preferredHousingTypes.includes(property.housingType)) return 0.8
  return 0.15
}

/** 경쟁강도: 낮을수록 높은 점수 (참고 통계 기반) */
function competitionScore(property: Property) {
  const rate = property.competitionRate
  if (rate <= 3) return 1
  if (rate <= 8) return 0.8
  if (rate <= 15) return 0.6
  if (rate <= 30) return 0.4
  return 0.2
}

/** 달력 기준 남은 일수 (자정~자정). 시:분에 따라 값이 흔들리지 않게 한다. */
export function daysUntil(dateStr: string | null, now = new Date()) {
  if (!dateStr) return null
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(`${dateStr}T00:00:00`)
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

/** 마감 긴급도: 마감이 가까울수록 우선 검토 필요 */
function urgencyScore(property: Property, now: Date) {
  const d = daysUntil(property.applicationEnd, now)
  if (d === null) return 0.3
  if (d < 0) return 0
  if (d <= 3) return 1
  if (d <= 7) return 0.85
  if (d <= 14) return 0.6
  if (d <= 30) return 0.4
  return 0.25
}

export function scoreBreakdown(
  customer: Customer,
  property: Property,
  now = new Date(),
): MatchScoreBreakdown {
  const r = (n: number) => Math.round(n * 100)
  return {
    regionScore: r(regionScore(customer, property)),
    affordabilityScore: r(affordabilityScore(customer, property)),
    areaScore: r(areaScore(customer, property)),
    housingTypeScore: r(housingTypeScore(customer, property)),
    competitionScore: r(competitionScore(property)),
    urgencyScore: r(urgencyScore(property, now)),
  }
}

export function opportunityScore(b: MatchScoreBreakdown) {
  const total =
    (b.regionScore * SCORE_WEIGHTS.region +
      b.affordabilityScore * SCORE_WEIGHTS.affordability +
      b.areaScore * SCORE_WEIGHTS.area +
      b.housingTypeScore * SCORE_WEIGHTS.housingType +
      b.competitionScore * SCORE_WEIGHTS.competition +
      b.urgencyScore * SCORE_WEIGHTS.urgency) /
    100
  return Math.round(total)
}

/** 점수만으로는 행동할 수 없다 — 판단 가능한 문장으로 변환한다. */
export function buildReason(
  customer: Customer,
  property: Property,
  b: MatchScoreBreakdown,
  now = new Date(),
): string {
  const strong: string[] = []
  const weak: string[] = []

  if (b.regionScore >= 85) strong.push('희망지역 일치')
  else if (b.regionScore >= 40) weak.push('희망지역 인접 생활권')
  else weak.push('희망지역과 거리 있음')

  if (b.affordabilityScore >= 85) strong.push('예산 범위 내')
  else if (b.affordabilityScore >= 50) weak.push('예산 상단에 근접')
  else weak.push('예산 초과 구간')

  if (b.areaScore >= 90) strong.push('희망면적 충족')
  else if (b.areaScore >= 60) weak.push('희망면적보다 다소 좁음')
  else weak.push('희망면적 미달')

  if (b.housingTypeScore >= 80) strong.push(`선호 유형(${property.housingType})`)
  else weak.push(`비선호 유형(${property.housingType})`)

  const head = strong.length
    ? `${strong.join('·')} 조건을 충족합니다.`
    : '핵심 조건 일치도가 낮습니다.'

  const competition =
    property.competitionRate >= 20
      ? `직전 공고 경쟁강도가 ${property.competitionRate}:1로 높은 편입니다.`
      : property.competitionRate >= 8
        ? `경쟁강도는 ${property.competitionRate}:1로 보통 수준입니다.`
        : `경쟁강도가 ${property.competitionRate}:1로 낮아 상대적으로 유리합니다.`

  const d = daysUntil(property.applicationEnd, now)
  const deadline =
    d === null
      ? '접수 일정이 아직 공개되지 않아 공고문 확인이 필요합니다.'
      : d < 0
        ? '접수가 마감되어 다음 공고 대기 대상입니다.'
        : d === 0
          ? '오늘이 접수 마감일이라 즉시 검토가 필요합니다.'
          : d <= 3
            ? `접수 마감까지 ${d}일 남아 즉시 검토가 필요합니다.`
            : d <= 7
              ? `접수 마감까지 ${d}일 남아 우선 검토 대상입니다.`
              : `접수 마감까지 ${d}일 여유가 있습니다.`

  const caveat = weak.length ? ` 다만 ${weak.slice(0, 2).join(', ')} 항목은 확인이 필요합니다.` : ''

  return `${head}${caveat} ${competition} ${deadline}`
}

/** 두 기회를 비교해 의사결정 문장을 만든다 (단순 나열이 아닌 해석) */
export function compareOpportunities(
  a: { property: Property; score: number; breakdown: MatchScoreBreakdown },
  b: { property: Property; score: number; breakdown: MatchScoreBreakdown },
): string {
  const [hi, lo] = a.score >= b.score ? [a, b] : [b, a]
  const cheaper =
    hi.property.monthlyRent + hi.property.deposit / 100 <
    lo.property.monthlyRent + lo.property.deposit / 100
  const lessCompetitive = hi.property.competitionRate < lo.property.competitionRate
  const bits: string[] = []
  if (cheaper) bits.push('비용 부담이 낮고')
  if (lessCompetitive) bits.push('경쟁강도가 완만해')
  const why = bits.length ? bits.join(' ') : '조건 일치도가 높아'
  return `${lo.property.name}보다 ${hi.property.name}이(가) ${why} 지원 우선순위가 높습니다.`
}
