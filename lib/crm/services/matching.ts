import type { Customer, Match, Property } from '../types'
import { buildReason, opportunityScore, scoreBreakdown } from './scoring'

export interface MatchOptions {
  /** 알림·추천 대상으로 볼 최소 점수 */
  threshold?: number
  limit?: number
  eventId?: string
  now?: Date
}

let matchSeq = 0
function nextMatchId() {
  matchSeq += 1
  return `M${String(Date.now()).slice(-6)}${String(matchSeq).padStart(3, '0')}`
}

export function evaluate(customer: Customer, property: Property, now = new Date()) {
  const breakdown = scoreBreakdown(customer, property, now)
  const score = opportunityScore(breakdown)
  return { breakdown, score, reason: buildReason(customer, property, breakdown, now) }
}

/** 하나의 주택에 대해 전체 고객을 평가하고 조건 일치 고객을 점수순으로 반환 */
export function matchCustomersToProperty(
  property: Property,
  customers: Customer[],
  options: MatchOptions = {},
): Match[] {
  const { threshold = 70, limit = 20, eventId, now = new Date() } = options
  const createdAt = now.toISOString()

  return customers
    .map(customer => {
      const { breakdown, score, reason } = evaluate(customer, property, now)
      const match: Match = {
        id: nextMatchId(),
        customerId: customer.id,
        propertyId: property.id,
        ...breakdown,
        opportunityScore: score,
        reason,
        createdAt,
        eventId,
      }
      return match
    })
    .filter(m => m.opportunityScore >= threshold)
    .sort((a, b) => b.opportunityScore - a.opportunityScore)
    .slice(0, limit)
}

/** 하나의 고객 조건에 대해 전체 주택을 평가 (/analyze 용) */
export function matchPropertiesToCustomer(
  customer: Customer,
  properties: Property[],
  options: MatchOptions = {},
): Match[] {
  const { threshold = 0, limit = 10, now = new Date() } = options
  const createdAt = now.toISOString()

  return properties
    .filter(p => p.status !== 'CLOSED')
    .map(property => {
      const { breakdown, score, reason } = evaluate(customer, property, now)
      const match: Match = {
        id: nextMatchId(),
        customerId: customer.id,
        propertyId: property.id,
        ...breakdown,
        opportunityScore: score,
        reason,
        createdAt,
      }
      return match
    })
    .filter(m => m.opportunityScore >= threshold)
    .sort((a, b) => b.opportunityScore - a.opportunityScore)
    .slice(0, limit)
}
