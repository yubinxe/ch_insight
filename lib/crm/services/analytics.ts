import type { CrmState } from '../store'
import type { Application, ApplicationStage } from '../types'

export interface CrmKpi {
  customers: number
  properties: number
  currentVacancy: number
  newVacancyToday: number
  matchedCustomers: number
  activeApplications: number
  notifications: number
  repeatApplicants: number
  repeatRate: number
}

/** North Star 퍼널 — 분석 → 프로필 → 알림 → 지원 → 재지원 */
export interface FunnelStep {
  key: string
  label: string
  value: number
  hint: string
}

const ACTIVE_STAGES: ApplicationStage[] = [
  'DISCOVERED',
  'REVIEWING',
  'APPLYING',
  'DOCUMENTS',
  'SUBMITTED',
  'RESULT_WAITING',
]

function isToday(iso: string, now: Date) {
  const d = new Date(iso)
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

export function countByCustomer(applications: Application[]) {
  const map = new Map<string, number>()
  for (const a of applications) map.set(a.customerId, (map.get(a.customerId) ?? 0) + 1)
  return map
}

export function buildKpi(state: CrmState, now = new Date()): CrmKpi {
  const perCustomer = countByCustomer(state.applications)
  const repeatApplicants = [...perCustomer.values()].filter(n => n >= 2).length
  const appliedCustomers = perCustomer.size

  return {
    customers: state.customers.length,
    properties: state.properties.length,
    currentVacancy: state.properties.reduce((s, p) => s + p.vacancyCount, 0),
    newVacancyToday: state.events.filter(e => isToday(e.occurredAt, now)).length,
    matchedCustomers: new Set(state.matches.map(m => m.customerId)).size,
    activeApplications: state.applications.filter(a => ACTIVE_STAGES.includes(a.stage)).length,
    notifications: 0,
    repeatApplicants,
    repeatRate: appliedCustomers ? Math.round((repeatApplicants / appliedCustomers) * 100) : 0,
  }
}

export function buildFunnel(state: CrmState): FunnelStep[] {
  // 운영 데모는 실제 소비자 퍼널과 모집단이 다르다. 합성 과거이력은 아래에서 제외한다.
  const sessionApps = state.applications.filter(a => a.createdAt >= state.seededAt)
  return [
    { key: 'profile', label: '시연 조건', value: state.customers.length, hint: '합성 고객 · 실사용 성과 아님' },
    { key: 'matched', label: '후보 생성', value: new Set(state.matches.map(m => m.customerId)).size, hint: '이번 시연의 선호조건 일치 고객' },
    { key: 'draft', label: '알림 초안', value: state.notifications.filter(n => n.status === 'DRAFT').length, hint: '미발송 · 고객 발송 아님' },
    { key: 'prepared', label: '준비 초안', value: sessionApps.length, hint: '자동 생성 포함 · 실제 신청 아님' },
    { key: 'delivered', label: '고객 발송', value: 0, hint: '수신자별 발송 미연결 · 미측정' },
  ]
}

export interface UpcomingTask {
  id: string
  applicationId: string
  title: string
  dueDate: string | null
  status: string
  customerName: string
  customerId: string
  propertyName: string
  dday: number | null
}

export function buildUpcomingTasks(state: CrmState, now = new Date(), limit = 12): UpcomingTask[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const activeAppIds = new Set(
    state.applications.filter(a => ACTIVE_STAGES.includes(a.stage)).map(a => a.id),
  )

  return state.tasks
    .filter(t => activeAppIds.has(t.applicationId) && t.status !== 'DONE')
    .map(t => {
      const app = state.applications.find(a => a.id === t.applicationId)!
      const customer = state.customers.find(c => c.id === app.customerId)
      const property = state.properties.find(p => p.id === app.propertyId)
      const dday = t.dueDate
        ? Math.round((new Date(`${t.dueDate}T00:00:00`).getTime() - today.getTime()) / 86400000)
        : null
      return {
        id: t.id,
        applicationId: t.applicationId,
        title: t.title,
        dueDate: t.dueDate,
        status: t.status,
        customerName: customer?.name ?? app.customerId,
        customerId: app.customerId,
        propertyName: property?.name ?? app.propertyId,
        dday,
      }
    })
    .sort((a, b) => {
      if (a.dueDate === null) return 1
      if (b.dueDate === null) return -1
      return a.dueDate.localeCompare(b.dueDate)
    })
    .slice(0, limit)
}
