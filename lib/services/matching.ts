import type { OpportunityRow, PreferenceRow } from '@/lib/db/types'

/**
 * Opportunity Score.
 *
 * 당첨확률이 아니다. "지금 어느 기회부터 볼지" 정하는 조건 적합도다.
 * 화면에는 Opportunity Score / 추천 우선순위 / 조건 적합도로만 표기한다.
 */

export const SCORE_WEIGHTS = {
  region: 30,
  affordability: 20,
  area: 15,
  housingType: 15,
  competition: 10,
  urgency: 10,
} as const

/** 알림을 보낼 최소 점수. 코드 곳곳에 흩뿌리지 않고 여기서만 바꾼다. */
export const MATCH_CONFIG = {
  notifyThreshold: Number(process.env.MATCH_NOTIFY_THRESHOLD ?? 75),
  /** 후보 목록에 넣을 최소 점수 */
  candidateThreshold: Number(process.env.MATCH_CANDIDATE_THRESHOLD ?? 45),
  maxNotificationsPerEvent: Number(process.env.MATCH_MAX_NOTIFY ?? 20),
} as const

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

export interface ScoreBreakdown {
  regionScore: number
  affordabilityScore: number
  areaScore: number
  housingTypeScore: number
  /** 공개 경쟁률이 없으면 null — 만들어내지 않고 가중치를 재분배한다 */
  competitionScore: number | null
  urgencyScore: number
  opportunityScore: number
}

export interface BudgetCheck {
  withinBudget: boolean
  /** 만원. 0 이면 상한 이내 */
  depositOver: number
  rentOver: number
  depositRoom: number
  rentRoom: number
}

export interface MatchResult extends ScoreBreakdown {
  budget: BudgetCheck
  reason: string
  /** 자격 판정 엔진 전까지 항상 UNKNOWN */
  eligibility: 'UNKNOWN'
}

export function daysUntil(date: string | null, now = new Date()): number | null {
  if (!date) return null
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((new Date(`${date}T00:00:00`).getTime() - today.getTime()) / 86400000)
}

export function formatMan(man: number): string {
  if (man >= 10000) {
    const eok = Math.floor(man / 10000)
    const rest = man % 10000
    return rest ? `${eok}억 ${rest.toLocaleString()}만원` : `${eok}억원`
  }
  return `${man.toLocaleString()}만원`
}

function regionScore(pref: PreferenceRow, opp: OpportunityRow) {
  const regions = pref.preferred_regions ?? []
  if (regions[0] === opp.region) return { score: 100, kind: 'FIRST' as const }
  if (regions.includes(opp.region)) return { score: 85, kind: 'LISTED' as const }
  const via = regions.find(r => (NEARBY[r] ?? []).includes(opp.region))
  if (via) return { score: 50, kind: 'NEARBY' as const, via }
  return { score: 0, kind: 'OUTSIDE' as const }
}

export function checkBudget(pref: PreferenceRow, opp: OpportunityRow): BudgetCheck {
  // 상한을 정하지 않았으면 제약이 없다 (임의 기본값을 만들지 않는다)
  const maxDep = pref.max_deposit
  const maxRent = pref.max_monthly_rent
  const dep = opp.deposit ?? 0
  const rent = opp.monthly_rent ?? 0

  const depositOver = maxDep === null ? 0 : Math.max(0, dep - maxDep)
  const rentOver = maxRent === null ? 0 : Math.max(0, rent - maxRent)

  return {
    depositOver,
    rentOver,
    depositRoom: maxDep === null || depositOver > 0 ? 0 : maxDep - dep,
    rentRoom: maxRent === null || rentOver > 0 ? 0 : maxRent - rent,
    withinBudget: depositOver === 0 && rentOver === 0,
  }
}

function affordabilityScore(pref: PreferenceRow, opp: OpportunityRow, budget: BudgetCheck) {
  if (pref.max_deposit === null && pref.max_monthly_rent === null) return 60 // 미정 — 중립
  if (!budget.withinBudget) {
    // 초과 정도에 따라 감점. 많이 넘을수록 0 에 수렴.
    const depRatio = pref.max_deposit ? budget.depositOver / pref.max_deposit : 0
    const rentRatio = pref.max_monthly_rent ? budget.rentOver / pref.max_monthly_rent : 0
    const worst = Math.max(depRatio, rentRatio)
    return Math.max(0, Math.round(40 * (1 - Math.min(1, worst))))
  }
  // 여유가 클수록 높은 점수
  const depRoomRatio = pref.max_deposit ? budget.depositRoom / pref.max_deposit : 0.5
  const rentRoomRatio = pref.max_monthly_rent ? budget.rentRoom / pref.max_monthly_rent : 0.5
  return Math.round(80 + Math.min(20, ((depRoomRatio + rentRoomRatio) / 2) * 40))
}

function areaScore(pref: PreferenceRow, opp: OpportunityRow) {
  if (pref.min_area === null || opp.area === null) return { score: 60, diff: null as number | null }
  const diff = Math.round((opp.area - pref.min_area) * 10) / 10
  if (diff >= 0) return { score: 100, diff }
  if (diff >= -3) return { score: 60, diff }
  if (diff >= -6) return { score: 30, diff }
  return { score: 0, diff }
}

function housingTypeScore(pref: PreferenceRow, opp: OpportunityRow) {
  const types = pref.preferred_housing_types ?? []
  if (types.length === 0) return { score: 60, kind: 'ANY' as const }
  if (types[0] === opp.housing_type) return { score: 100, kind: 'FIRST' as const }
  if (types.includes(opp.housing_type)) return { score: 85, kind: 'LISTED' as const }
  return { score: 20, kind: 'OTHER' as const }
}

/** 공개 경쟁률이 있을 때만 점수를 낸다. 없으면 null. */
function competitionScore(opp: OpportunityRow): number | null {
  const rate = opp.competition_rate
  if (rate === null || rate === undefined) return null
  if (rate <= 3) return 100
  if (rate <= 8) return 80
  if (rate <= 15) return 60
  if (rate <= 30) return 40
  return 20
}

function urgencyScore(opp: OpportunityRow, now: Date) {
  const d = daysUntil(opp.application_end, now)
  if (d === null) return { score: 30, days: null as number | null }
  if (d < 0) return { score: 0, days: d }
  if (d === 0) return { score: 100, days: 0 }
  if (d <= 3) return { score: 100, days: d }
  if (d <= 7) return { score: 85, days: d }
  if (d <= 14) return { score: 60, days: d }
  if (d <= 30) return { score: 40, days: d }
  return { score: 25, days: d }
}

/**
 * 경쟁률이 없으면 해당 가중치(10)를 나머지 항목에 비례 재분배한다.
 * 데이터가 없다고 임의의 경쟁 점수를 만들지 않는다.
 */
function weightedTotal(parts: { score: number; weight: number }[], missingWeight: number): number {
  const available = parts.reduce((s, p) => s + p.weight, 0)
  const scale = missingWeight > 0 ? (available + missingWeight) / available : 1
  const raw = parts.reduce((s, p) => s + p.score * p.weight * scale, 0) / (available + missingWeight)
  return Math.round(Math.max(0, Math.min(100, raw)))
}

export function buildReason(pref: PreferenceRow, opp: OpportunityRow, budget: BudgetCheck): string {
  const bits: string[] = []

  const r = regionScore(pref, opp)
  if (r.kind === 'FIRST') bits.push(`희망 1순위 지역인 ${opp.region}`)
  else if (r.kind === 'LISTED') bits.push(`희망지역 ${opp.region}`)
  else if (r.kind === 'NEARBY') bits.push(`희망하신 ${r.via} 인접 생활권`)

  if (budget.withinBudget && (pref.max_deposit !== null || pref.max_monthly_rent !== null)) {
    bits.push(
      pref.max_deposit !== null && budget.depositRoom > 0
        ? `보증금이 설정한 예산보다 ${formatMan(budget.depositRoom)} 여유 있음`
        : '보증금·월 임대료가 설정한 예산 범위 내',
    )
  }

  const a = areaScore(pref, opp)
  if (a.diff !== null && a.diff >= 0 && pref.min_area !== null) {
    bits.push(
      a.diff === 0
        ? `희망 최소면적 ${pref.min_area}㎡ 충족`
        : `희망 최소면적보다 ${a.diff}㎡ 넓은 전용 ${opp.area}㎡`,
    )
  }

  const h = housingTypeScore(pref, opp)
  if (h.kind === 'FIRST' || h.kind === 'LISTED') bits.push(`관심 주택유형 ${opp.housing_type}`)

  const head = bits.length
    ? `${bits.join(', ')}에 해당합니다.`
    : '희망 조건과 부분적으로 일치합니다.'

  const cautions: string[] = []
  if (!budget.withinBudget) {
    if (budget.depositOver > 0) cautions.push(`보증금이 예산보다 ${formatMan(budget.depositOver)} 높음`)
    if (budget.rentOver > 0) cautions.push(`월 임대료가 예산보다 ${budget.rentOver.toLocaleString()}만원 높음`)
  }
  const u = urgencyScore(opp, new Date())
  if (u.days !== null && u.days >= 0 && u.days <= 7) {
    cautions.push(u.days === 0 ? '오늘 접수 마감' : `접수 마감까지 ${u.days}일`)
  }

  const tail = cautions.length ? ` ${cautions.join(' · ')}.` : ''
  return `${head}${tail} 소득·자산 등 세부 자격은 공식 공고문 확인이 필요합니다.`
}

export function scoreMatch(pref: PreferenceRow, opp: OpportunityRow, now = new Date()): MatchResult {
  const budget = checkBudget(pref, opp)
  const r = regionScore(pref, opp)
  const a = areaScore(pref, opp)
  const h = housingTypeScore(pref, opp)
  const afford = affordabilityScore(pref, opp, budget)
  const comp = competitionScore(opp)
  const urg = urgencyScore(opp, now)

  const parts = [
    { score: r.score, weight: SCORE_WEIGHTS.region },
    { score: afford, weight: SCORE_WEIGHTS.affordability },
    { score: a.score, weight: SCORE_WEIGHTS.area },
    { score: h.score, weight: SCORE_WEIGHTS.housingType },
    { score: urg.score, weight: SCORE_WEIGHTS.urgency },
  ]
  if (comp !== null) parts.push({ score: comp, weight: SCORE_WEIGHTS.competition })

  const opportunityScore = weightedTotal(parts, comp === null ? SCORE_WEIGHTS.competition : 0)

  return {
    regionScore: r.score,
    affordabilityScore: afford,
    areaScore: a.score,
    housingTypeScore: h.score,
    competitionScore: comp,
    urgencyScore: urg.score,
    opportunityScore,
    budget,
    reason: buildReason(pref, opp, budget),
    eligibility: 'UNKNOWN',
  }
}

export interface RankedOpportunity {
  opportunity: OpportunityRow
  match: MatchResult
}

/** 한 사람의 조건으로 여러 기회를 평가한다 (소비자 탐색) */
export function rankOpportunities(
  pref: PreferenceRow,
  opportunities: OpportunityRow[],
  now = new Date(),
): { primary: RankedOpportunity[]; relaxed: RankedOpportunity[] } {
  const scored = opportunities
    .filter(o => o.status !== 'CANCELLED')
    .map(opportunity => ({ opportunity, match: scoreMatch(pref, opportunity, now) }))

  const open = scored.filter(r => r.opportunity.status !== 'CLOSED')

  const primary = open
    .filter(r => r.match.budget.withinBudget)
    .filter(r => r.match.opportunityScore >= MATCH_CONFIG.candidateThreshold)
    .sort((x, y) => y.match.opportunityScore - x.match.opportunityScore)

  const relaxed = open
    .filter(r => !r.match.budget.withinBudget)
    .filter(r => r.match.regionScore >= 50)
    .sort((x, y) => {
      const ox = x.match.budget.depositOver / 100 + x.match.budget.rentOver
      const oy = y.match.budget.depositOver / 100 + y.match.budget.rentOver
      return ox - oy
    })
    .slice(0, 4)

  return { primary, relaxed }
}
