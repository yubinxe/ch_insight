import { generateCustomers } from './seed-customers'
import { generateProperties } from './seed-properties'
import { matchCustomersToProperty } from './services/matching'
import { buildTasks } from './services/scheduling'
import { createRng } from './rng'
import {
  buildNotificationPayload,
  dispatchNotification,
  activeNotificationAdapter,
} from '@/lib/adapters/notification'
import type {
  ActivityKind,
  ActivityLog,
  Application,
  ApplicationStage,
  Customer,
  Match,
  NotificationLog,
  Property,
  Task,
  VacancyEvent,
} from './types'

export interface CrmState {
  customers: Customer[]
  properties: Property[]
  events: VacancyEvent[]
  matches: Match[]
  applications: Application[]
  tasks: Task[]
  notifications: NotificationLog[]
  activity: ActivityLog[]
  /** 데모 공실 이벤트 후보 큐 */
  triggerQueue: string[]
  seededAt: string
}

let seq = 0
function uid(prefix: string) {
  seq += 1
  return `${prefix}${Date.now().toString(36)}${seq.toString(36)}`
}

function nowIso() {
  return new Date().toISOString()
}

/**
 * 재지원 Retention 을 보여주기 위한 과거 지원 이력.
 * 일부 고객은 2회 이상 지원(탈락 후 재지원)한 상태로 시드된다.
 */
function seedHistory(state: CrmState) {
  const rng = createRng(424242)
  const closed = state.properties.filter(p => p.status === 'CLOSED')
  if (!closed.length) return

  const pool = state.customers.slice(0, 46)
  for (const customer of pool) {
    const rounds = rng.weighted([
      { value: 1, weight: 58 },
      { value: 2, weight: 30 },
      { value: 3, weight: 12 },
    ])
    for (let r = 0; r < rounds; r++) {
      const property = rng.pick(closed)
      const stage = rng.weighted<ApplicationStage>([
        { value: 'LOST', weight: 66 },
        { value: 'WON', weight: 10 },
        { value: 'CONTRACT', weight: 6 },
        { value: 'RESULT_WAITING', weight: 10 },
        { value: 'SUBMITTED', weight: 8 },
      ])
      const created = new Date(state.seededAt)
      created.setDate(created.getDate() - rng.int(20, 280))
      const app: Application = {
        id: uid('A'),
        customerId: customer.id,
        propertyId: property.id,
        stage,
        opportunityScore: rng.int(62, 94),
        createdAt: created.toISOString(),
        updatedAt: created.toISOString(),
      }
      state.applications.push(app)
      state.tasks.push(...buildTasks(app, property).map(t => ({ ...t, status: 'DONE' as const })))
    }
  }
}

function createState(): CrmState {
  const now = new Date()
  const state: CrmState = {
    customers: generateCustomers(100),
    properties: generateProperties(50, 990911, now),
    events: [],
    matches: [],
    applications: [],
    tasks: [],
    notifications: [],
    activity: [],
    triggerQueue: ['H023', 'H011', 'H038', 'H005', 'H029', 'H042', 'H017'],
    seededAt: now.toISOString(),
  }
  seedHistory(state)
  state.activity.push({
    id: uid('L'),
    at: now.toISOString(),
    kind: 'SYSTEM',
    message: `데이터 로드 완료 — 고객 ${state.customers.length}명 · 주택 ${state.properties.length}건 (합성 데모 데이터)`,
  })
  return state
}

// Next.js dev HMR 에서도 상태가 유지되도록 globalThis 에 보관한다.
const globalRef = globalThis as unknown as { __myhomeplzCrm?: CrmState }

export function getState(): CrmState {
  if (!globalRef.__myhomeplzCrm) globalRef.__myhomeplzCrm = createState()
  return globalRef.__myhomeplzCrm
}

export function resetState() {
  globalRef.__myhomeplzCrm = createState()
  return globalRef.__myhomeplzCrm
}

export function log(kind: ActivityKind, message: string, refId?: string) {
  const state = getState()
  const entry: ActivityLog = { id: uid('L'), at: nowIso(), kind, message, refId }
  state.activity.unshift(entry)
  if (state.activity.length > 200) state.activity.length = 200
  return entry
}

export function customerById(id: string) {
  return getState().customers.find(c => c.id === id)
}

export function propertyById(id: string) {
  return getState().properties.find(p => p.id === id)
}

export function createApplication(
  customerId: string,
  propertyId: string,
  match?: Match,
): { application: Application; tasks: Task[] } | null {
  const state = getState()
  const property = propertyById(propertyId)
  const customer = customerById(customerId)
  if (!property || !customer) return null

  const existing = state.applications.find(
    a => a.customerId === customerId && a.propertyId === propertyId && a.stage !== 'LOST',
  )
  if (existing) {
    return { application: existing, tasks: state.tasks.filter(t => t.applicationId === existing.id) }
  }

  const at = nowIso()
  const application: Application = {
    id: uid('A'),
    customerId,
    propertyId,
    stage: 'DISCOVERED',
    matchId: match?.id,
    opportunityScore: match?.opportunityScore,
    createdAt: at,
    updatedAt: at,
  }
  state.applications.push(application)

  const tasks = buildTasks(application, property)
  state.tasks.push(...tasks)

  const roundNo = state.applications.filter(a => a.customerId === customerId).length
  log(
    'APPLICATION',
    `${customer.name}(${customerId}) 지원 절차 생성 — ${property.name} · 통산 ${roundNo}회차`,
    application.id,
  )
  const dated = tasks.filter(t => t.dueDate).length
  const pending = tasks.length - dated
  log(
    'TASK',
    `할 일 ${dated}건 자동 생성${pending ? ` · 날짜 미정 ${pending}건 보류` : ''}`,
    application.id,
  )

  return { application, tasks }
}

export function advanceApplication(id: string, stage: ApplicationStage) {
  const state = getState()
  const app = state.applications.find(a => a.id === id)
  if (!app) return null
  app.stage = stage
  app.updatedAt = nowIso()
  const customer = customerById(app.customerId)
  log('APPLICATION', `${customer?.name ?? app.customerId} 지원 단계 변경 → ${stage}`, app.id)
  return app
}

export interface TriggerResult {
  event: VacancyEvent
  property: Property
  matches: Match[]
  topCustomer: Customer | null
  notification: NotificationLog | null
  application: Application | null
  tasks: Task[]
}

/**
 * Hero Demo — 공실 이벤트 발생 → 탐지 → 매칭 → 알림 → Pipeline → 일정.
 * 합성(Synthetic) 이벤트이며 실제 공실 정보가 아니다.
 */
export async function triggerVacancyEvent(propertyId?: string): Promise<TriggerResult | null> {
  const state = getState()
  const now = new Date()

  // 데모 큐 순서를 그대로 따른다 (properties 배열 순서가 아니라).
  const queued = state.triggerQueue
    .map(id => state.properties.find(p => p.id === id))
    .find(p => p && p.vacancyCount === 0)

  const target =
    (propertyId ? propertyById(propertyId) : undefined) ??
    queued ??
    state.properties.find(p => p.vacancyCount === 0 && p.status === 'OPEN') ??
    state.properties.find(p => p.vacancyCount === 0)

  if (!target) return null

  const previousVacancy = target.vacancyCount
  target.vacancyCount = previousVacancy + 1

  const event: VacancyEvent = {
    id: uid('E'),
    propertyId: target.id,
    occurredAt: now.toISOString(),
    previousVacancy,
    currentVacancy: target.vacancyCount,
    eventType: previousVacancy === 0 ? 'VACANCY_CREATED' : 'VACANCY_INCREASED',
    dataOrigin: 'SYNTHETIC',
  }
  state.events.unshift(event)
  log(
    'EVENT',
    `빈 집 발생 ${target.id} — ${target.name} · 공실 ${previousVacancy} → ${target.vacancyCount}건`,
    event.id,
  )

  const matches = matchCustomersToProperty(target, state.customers, {
    threshold: 70,
    limit: 60,
    eventId: event.id,
    now,
  })
  state.matches = [...matches, ...state.matches].slice(0, 400)
  log('MATCH', `조건 맞는 고객 ${matches.length}명 추출 (지원 우선순위 70점 이상)`, event.id)

  const top = matches[0]
  const topCustomer = top ? (customerById(top.customerId) ?? null) : null

  if (top && topCustomer) {
    log(
      'SCORE',
      `${topCustomer.name}(${topCustomer.id}) 지원 우선순위 ${top.opportunityScore}점 — 1순위 알림 대상`,
      top.id,
    )
  }

  let notification: NotificationLog | null = null
  if (top && topCustomer) {
    const payload = buildNotificationPayload(topCustomer, target, top, now)
    const result = await dispatchNotification(payload)
    notification = {
      id: uid('N'),
      customerId: topCustomer.id,
      propertyId: target.id,
      matchId: top.id,
      channel: 'KAKAO',
      status: result.status,
      adapter: result.adapter,
      title: payload.title,
      body: payload.body,
      detail: result.detail,
      createdAt: nowIso(),
    }
    state.notifications.unshift(notification)
    log(
      'NOTIFICATION',
      result.status === 'SENT'
        ? `${topCustomer.name} 카카오톡 알림 발송 완료`
        : `${topCustomer.name} 맞춤 알림 생성 (${activeNotificationAdapter().label})`,
      notification.id,
    )
  }

  let application: Application | null = null
  let tasks: Task[] = []
  if (top && topCustomer) {
    const created = createApplication(topCustomer.id, target.id, top)
    if (created) {
      application = created.application
      tasks = created.tasks
    }
  }

  state.triggerQueue = state.triggerQueue.filter(id => id !== target.id)

  return { event, property: target, matches, topCustomer, notification, application, tasks }
}
