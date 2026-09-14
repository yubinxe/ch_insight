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
    notifications: state.notifications.length,
    repeatApplicants,
    repeatRate: appliedCustomers ? Math.round((repeatApplicants / appliedCustomers) * 100) : 0,
  }
}

export function buildFunnel(state: CrmState): FunnelStep[] {
  const perCustomer = countByCustomer(state.applications)
  const notified = new Set(state.notifications.map(n => n.customerId)).size
  return [
    {
      key: 'profile',
      label: '조건 저장한 고객',
      value: state.customers.length,
      hint: '조건을 저장해 둔 사람',
    },
    {
      key: 'matched',
      label: '맞는 기회 나온 고객',
      value: new Set(state.matches.map(m => m.customerId)).size,
      hint: '지원 우선순위 70점 이상 기회 보유',
    },
    {
      key: 'notified',
      label: '알림 받은 고객',
      value: notified,
      hint: '맞춤 알림이 만들어진 고객',
    },
    {
      key: 'applied',
      label: '실제 지원한 고객',
      value: perCustomer.size,
      hint: '지원 절차에 진입',
    },
    {
      key: 'repeat',
      label: '두 번 이상 지원',
      value: [...perCustomer.values()].filter(n => n >= 2).length,
      hint: '가장 중요한 지표 — 반복지원률',
    },
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
