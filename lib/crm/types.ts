// ──────────────────────────────────────────────────────────
// Housing Opportunity CRM — 도메인 모델
// 실제 공공데이터(청약홈/LH)와 데모용 합성 데이터를 구분하기 위해
// 모든 엔티티는 dataOrigin 을 갖는다.
// ──────────────────────────────────────────────────────────

export type DataOrigin = 'OFFICIAL' | 'SYNTHETIC'

export type HouseholdType = '1인가구' | '신혼부부' | '2인가구' | '다자녀' | '한부모'

export type IncomeBand = '~50%' | '50~70%' | '70~100%' | '100~120%' | '120%~'

export type HousingType =
  | '청년매입임대'
  | '행복주택'
  | '공공임대'
  | '공공지원민간임대'
  | '신혼희망타운'

export const HOUSING_TYPES: HousingType[] = [
  '청년매입임대',
  '행복주택',
  '공공임대',
  '공공지원민간임대',
  '신혼희망타운',
]

export interface Customer {
  id: string
  name: string
  age: number
  householdType: HouseholdType
  incomeBand: IncomeBand
  preferredRegions: string[]
  /** 만원 단위 */
  maxDeposit: number
  /** 만원 단위 */
  maxMonthlyRent: number
  /** ㎡ */
  minArea: number
  preferredHousingTypes: HousingType[]
  /** YYYY-MM */
  moveInPeriod: string
  createdAt: string
  dataOrigin: DataOrigin
}

export type PropertyStatus = 'OPEN' | 'UPCOMING' | 'CLOSED'

export interface Property {
  id: string
  source: string
  announcementId: string
  name: string
  housingType: HousingType
  region: string
  district: string
  address: string
  /** ㎡ */
  area: number
  /** 만원 */
  deposit: number
  /** 만원 */
  monthlyRent: number
  supplyCount: number
  vacancyCount: number
  /** YYYY-MM-DD | null */
  applicationStart: string | null
  applicationEnd: string | null
  resultDate: string | null
  status: PropertyStatus
  /** 직전 공고 경쟁률(배수). 공개 통계 기반 참고값 */
  competitionRate: number
  dataOrigin: DataOrigin
}

export type VacancyEventType =
  | 'VACANCY_CREATED'
  | 'VACANCY_INCREASED'
  | 'VACANCY_DECREASED'
  | 'VACANCY_CLOSED'
  | 'NEW_ANNOUNCEMENT'

export interface VacancyEvent {
  id: string
  propertyId: string
  occurredAt: string
  previousVacancy: number
  currentVacancy: number
  eventType: VacancyEventType
  dataOrigin: DataOrigin
}

export interface MatchScoreBreakdown {
  regionScore: number
  affordabilityScore: number
  areaScore: number
  housingTypeScore: number
  competitionScore: number
  urgencyScore: number
}

export interface Match extends MatchScoreBreakdown {
  id: string
  customerId: string
  propertyId: string
  opportunityScore: number
  reason: string
  createdAt: string
  eventId?: string
}

export type ApplicationStage =
  | 'DISCOVERED'
  | 'REVIEWING'
  | 'APPLYING'
  | 'DOCUMENTS'
  | 'SUBMITTED'
  | 'RESULT_WAITING'
  | 'WON'
  | 'LOST'
  | 'CONTRACT'

export const APPLICATION_STAGES: ApplicationStage[] = [
  'DISCOVERED',
  'REVIEWING',
  'APPLYING',
  'DOCUMENTS',
  'SUBMITTED',
  'RESULT_WAITING',
  'WON',
  'LOST',
  'CONTRACT',
]

export const STAGE_LABEL: Record<ApplicationStage, string> = {
  DISCOVERED: '공고 발견',
  REVIEWING: '지원 검토',
  APPLYING: '신청',
  DOCUMENTS: '서류 준비',
  SUBMITTED: '서류 제출',
  RESULT_WAITING: '결과 대기',
  WON: '당첨',
  LOST: '탈락',
  CONTRACT: '계약',
}

export interface Application {
  id: string
  customerId: string
  propertyId: string
  stage: ApplicationStage
  matchId?: string
  opportunityScore?: number
  createdAt: string
  updatedAt: string
}

export type TaskStatus = 'TODO' | 'DONE' | 'PENDING_DATE'
export type ReminderType = 'KAKAO' | 'PUSH' | 'NONE'

export interface Task {
  id: string
  applicationId: string
  title: string
  /** 공고에 날짜가 없으면 null — 임의 생성하지 않는다 */
  dueDate: string | null
  status: TaskStatus
  reminderType: ReminderType
}

export type NotificationChannel = 'KAKAO'
export type NotificationStatus = 'SENT' | 'PREVIEW' | 'FAILED'

export interface NotificationLog {
  id: string
  customerId: string
  propertyId: string
  matchId: string
  channel: NotificationChannel
  status: NotificationStatus
  adapter: string
  title: string
  body: string
  detail?: string
  createdAt: string
}

export type ActivityKind =
  | 'EVENT'
  | 'MATCH'
  | 'SCORE'
  | 'NOTIFICATION'
  | 'APPLICATION'
  | 'TASK'
  | 'SYSTEM'

export interface ActivityLog {
  id: string
  at: string
  kind: ActivityKind
  message: string
  refId?: string
}
