'use client'

import type {
  ActivityLog,
  Application,
  Customer,
  Match,
  NotificationLog,
  Property,
  Task,
  VacancyEvent,
} from './types'
import type { CrmKpi, FunnelStep, UpcomingTask } from './services/analytics'

export interface CrmSnapshot {
  kpi: CrmKpi
  funnel: FunnelStep[]
  customers: Customer[]
  properties: Property[]
  matches: Match[]
  applications: Application[]
  tasks: Task[]
  events: VacancyEvent[]
  notifications: NotificationLog[]
  activity: ActivityLog[]
  upcomingTasks: UpcomingTask[]
  notificationAdapter: { id: string; label: string; live: boolean }
  seededAt: string
}

export interface TriggerResponse {
  event: VacancyEvent
  property: Property
  matches: Match[]
  topCustomer: Customer | null
  notification: NotificationLog | null
  application: Application | null
  tasks: Task[]
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    cache: 'no-store',
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    ...init,
  })
  const json = await res.json().catch(() => null)
  if (!res.ok) throw new Error(json?.error ?? `요청 실패 (${res.status})`)
  return json as T
}

export const fetchSnapshot = () => request<CrmSnapshot>('/api/crm/snapshot')

export const triggerVacancy = (propertyId?: string) =>
  request<TriggerResponse>('/api/crm/trigger', {
    method: 'POST',
    body: JSON.stringify({ propertyId }),
  })

export const resetDemo = () => request<{ ok: true }>('/api/crm/reset', { method: 'POST' })

export const createApplicationReq = (customerId: string, propertyId: string) =>
  request<{ application: Application; tasks: Task[] }>('/api/crm/applications', {
    method: 'POST',
    body: JSON.stringify({ customerId, propertyId }),
  })

export const updateStage = (id: string, stage: Application['stage']) =>
  request<Application>('/api/crm/applications', {
    method: 'PATCH',
    body: JSON.stringify({ id, stage }),
  })

export interface AnalyzeResult {
  profile: Customer
  results: { match: Match; property: Property }[]
  insight: string
}

export const analyzeProfile = (body: Record<string, unknown>) =>
  request<AnalyzeResult>('/api/crm/analyze', { method: 'POST', body: JSON.stringify(body) })
