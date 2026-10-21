import type { BehaviorEventType, LifecycleStage } from '@/lib/db/types'

/**
 * Lead Score.
 *
 * 값은 전부 여기 한 곳에만 둔다. UI 나 라우트에 숫자를 흩뿌리지 않는다.
 * CRM 이 답해야 하는 질문: "누가 지금 가장 행동 가능성이 높은 고객인가?"
 */

export const BEHAVIOR_POINTS: Record<BehaviorEventType, number> = {
  NOTIFICATION_SENT: 0, // 발송은 고객의 행동이 아니다
  NOTIFICATION_CLICKED: 5,
  DETAIL_VIEWED: 3,
  FAVORITED: 10,
  UNFAVORITED: -10,
  RETURN_VISIT: 5,
  APPLICATION_STARTED: 15,
  APPLICATION_SUBMITTED: 25,
  INQUIRY_CREATED: 30,
  SEARCH_COMPLETED: 2,
  PREFERENCE_SAVED: 8,
}

export const LIFECYCLE_THRESHOLDS: { stage: LifecycleStage; min: number }[] = [
  { stage: 'APPLICATION_INTENT', min: 60 },
  { stage: 'HOT', min: 35 },
  { stage: 'WARM', min: 15 },
  { stage: 'COLD', min: 0 },
]

export const LEAD_SCORE_MAX = 200

export function pointsFor(eventType: BehaviorEventType): number {
  return BEHAVIOR_POINTS[eventType] ?? 0
}

export function clampScore(score: number): number {
  return Math.max(0, Math.min(LEAD_SCORE_MAX, Math.round(score)))
}

export function stageFor(score: number): LifecycleStage {
  return LIFECYCLE_THRESHOLDS.find(t => score >= t.min)?.stage ?? 'COLD'
}

export interface LeadScoreChange {
  before: number
  after: number
  delta: number
  stageBefore: LifecycleStage
  stageAfter: LifecycleStage
  stageChanged: boolean
}

export function applyBehavior(currentScore: number, eventType: BehaviorEventType): LeadScoreChange {
  const before = clampScore(currentScore)
  const after = clampScore(before + pointsFor(eventType))
  const stageBefore = stageFor(before)
  const stageAfter = stageFor(after)
  return {
    before,
    after,
    delta: after - before,
    stageBefore,
    stageAfter,
    stageChanged: stageBefore !== stageAfter,
  }
}

export const STAGE_LABEL: Record<LifecycleStage, string> = {
  COLD: '관심 초기',
  WARM: '관심 상승',
  HOT: '적극 탐색',
  APPLICATION_INTENT: '지원 의향',
}
