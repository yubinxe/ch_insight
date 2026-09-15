import type { Customer, Property } from '../types'
import {
  buildCandidate,
  compareCandidates,
  regionRelated,
  type Candidate,
  type SearchConditions,
} from './scoring'

export interface CandidateResult {
  property: Property
  candidate: Candidate
}

export interface MatchOutcome {
  /** 예산 상한을 만족하고 접수가 마감되지 않은 후보 */
  primary: CandidateResult[]
  /** 예산 초과 또는 마감된 후보 — 초과액을 함께 보여준다 */
  relaxed: CandidateResult[]
  /** 상위 두 건을 비교한 판단 문장 (후보 2건 이상일 때만) */
  insight: string
}

function sortByFit(a: CandidateResult, b: CandidateResult) {
  // 확인된 후보를 먼저 보여준다.
  // 금액·면적을 주지 않는 공고는 그 항목의 가중치가 재분배돼 점수가 오히려 높아지는데,
  // 그대로 줄을 세우면 "아무것도 확인하지 못한 공고"가 1순위가 된다.
  const known = (c: CandidateResult) => (c.candidate.confidence === 'VERIFIED' ? 0 : 1)
  if (known(a) !== known(b)) return known(a) - known(b)

  if (b.candidate.fit.preferenceScore !== a.candidate.fit.preferenceScore) {
    return b.candidate.fit.preferenceScore - a.candidate.fit.preferenceScore
  }
  // 적합도가 같으면 마감이 가까운 쪽을 먼저 보여준다 (적합도 자체는 올리지 않는다)
  const ad = a.candidate.urgency.daysLeft ?? 9999
  const bd = b.candidate.urgency.daysLeft ?? 9999
  return ad - bd
}

/** 초과액이 적은 순으로 완화 후보를 정렬한다 */
function sortByOverage(a: CandidateResult, b: CandidateResult) {
  const over = (c: CandidateResult) => c.candidate.budget.depositOver / 100 + c.candidate.budget.rentOver
  const diff = over(a) - over(b)
  if (diff !== 0) return diff
  return b.candidate.fit.preferenceScore - a.candidate.fit.preferenceScore
}

/** 한 사람의 조건으로 전체 물건을 평가한다 (소비자 탐색용) */
export function findCandidatesForCustomer(
  customer: SearchConditions,
  properties: Property[],
  options: { limit?: number; relaxedLimit?: number; now?: Date } = {},
): MatchOutcome {
  const { limit = 12, relaxedLimit = 4, now = new Date() } = options

  const all = properties.map(property => ({ property, candidate: buildCandidate(customer, property, now) }))

  const primary = all
    .filter(r => r.candidate.tier === 'PRIMARY')
    .filter(r => regionRelated(customer.preferredRegions, r.property.region))
    .filter(
      r =>
        !customer.preferredHousingTypes.length ||
        (customer.preferredHousingTypes as string[]).includes(r.property.housingType),
    )
    // 면적이 공개되지 않은 공고는 조건 불충족으로 단정하지 않는다.
    // 대신 buildCandidate 가 "면적을 비교하지 못했다"는 주의를 남긴다.
    .filter(r => customer.minArea === null || r.property.area === null || r.property.area >= customer.minArea)
    // 관심 목록에 없는 유형까지 섞이면 결과가 흐려진다. 최소 적합도를 둔다.
    .filter(r => r.candidate.fit.preferenceScore >= 40)
    .sort(sortByFit)
    .slice(0, limit)

  const relaxed = all
    .filter(r => r.candidate.tier === 'RELAXED')
    .filter(r => regionRelated(customer.preferredRegions, r.property.region))
    .filter(r => !r.candidate.excludedBy.includes('CLOSED'))
    .filter(r => r.candidate.fit.preferenceScore >= 50)
    .sort(sortByOverage)
    .slice(0, relaxedLimit)

  const insight =
    primary.length >= 2
      ? compareCandidates(primary[0], primary[1])
      : primary.length === 1
        ? `현재 조건에 맞는 후보는 ${primary[0].property.name} 1건입니다. 지역이나 예산 범위를 넓히면 후보가 늘어납니다.`
        : ''

  return { primary, relaxed, insight }
}

/** 한 물건에 대해 선호조건이 맞는 고객을 찾는다 (내부 CRM 용) */
export function findCustomersForProperty(
  property: Property,
  customers: Customer[],
  options: { limit?: number; minFit?: number; now?: Date } = {},
): { customer: Customer; candidate: Candidate }[] {
  const { limit = 60, minFit = 60, now = new Date() } = options

  return customers
    .map(customer => ({ customer, candidate: buildCandidate(customer, property, now) }))
    // 예산 초과 고객에게 먼저 권하지 않는다. 선호 적합도만으로 대상을 넓히지 않는다.
    .filter(r => !r.candidate.excludedBy.includes('CLOSED') && r.candidate.budget.withinBudget && r.candidate.fit.preferenceScore >= minFit)
    .sort((a, b) => b.candidate.fit.preferenceScore - a.candidate.fit.preferenceScore)
    .slice(0, limit)
}
