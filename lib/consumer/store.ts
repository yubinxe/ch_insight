import { randomUUID, randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { mkdirSync, readFileSync, writeFileSync, renameSync, existsSync } from 'fs'
import { join } from 'path'
import type {
  AlertScope,
  AlertSubscription,
  ConsumerSession,
  ConsumerUser,
  PendingIntent,
  SavedNotice,
  SearchProfile,
} from '@/lib/crm/types'

/**
 * 소비자 세션 저장소.
 *
 * 지금은 서버 메모리에만 보관하므로 서버가 재시작하면 사라진다.
 * 실사용 전에는 영속 저장소로 교체해야 하며, 그 전까지 어떤 화면에서도
 * "영구 보관된다"고 표시하지 않는다.
 */
interface ConsumerState {
  sessions: Map<string, ConsumerSession>
  users: Map<string, ConsumerUser>
  usersByEmail: Map<string, string>
  saved: SavedNotice[]
  alerts: AlertSubscription[]
  events: ConsumerEvent[]
  credentials: Map<string, string>
  profiles: Map<string, SearchProfile>
}

export interface ConsumerEvent {
  id: string
  at: string
  name: string
  sessionId: string
  userId: string | null
  /** 개인정보를 문자열에 그대로 넣지 않는다 */
  props: Record<string, string | number | boolean | null>
}

const globalRef = globalThis as unknown as { __myhomeplzConsumer?: ConsumerState }
const dataDir = process.env.CONSUMER_DATA_DIR || join(process.cwd(), '.data')
const dataFile = join(dataDir, 'consumer.json')

/** 단일 Node 프로세스의 로컬 영속 저장. 다중 인스턴스 배포에는 DB adapter가 필요하다. */
function persist() {
  const s = globalRef.__myhomeplzConsumer!
  mkdirSync(dataDir, { recursive: true })
  const json = JSON.stringify({ ...s, sessions: [...s.sessions], users: [...s.users],
    usersByEmail: [...s.usersByEmail], credentials: [...s.credentials], profiles: [...s.profiles] })
  writeFileSync(`${dataFile}.tmp`, json, { mode: 0o600 })
  renameSync(`${dataFile}.tmp`, dataFile)
}

function getState(): ConsumerState {
  if (!globalRef.__myhomeplzConsumer) {
    globalRef.__myhomeplzConsumer = {
      sessions: new Map(),
      users: new Map(),
      usersByEmail: new Map(),
      saved: [],
      alerts: [],
      events: [],
      credentials: new Map(),
      profiles: new Map(),
    }
    if (existsSync(dataFile)) {
      const saved = JSON.parse(readFileSync(dataFile, 'utf8'))
      globalRef.__myhomeplzConsumer = { ...saved,
        sessions: new Map(saved.sessions), users: new Map(saved.users),
        usersByEmail: new Map(saved.usersByEmail), credentials: new Map(saved.credentials ?? []),
        profiles: new Map(saved.profiles ?? []),
      }
    }
  }
  return globalRef.__myhomeplzConsumer!
}

function nowIso() {
  return new Date().toISOString()
}

export function createSession(): ConsumerSession {
  const session: ConsumerSession = {
    id: randomUUID(),
    userId: null,
    profile: null,
    pendingIntent: null,
    createdAt: nowIso(),
    lastSeenAt: nowIso(),
  }
  getState().sessions.set(session.id, session)
  persist()
  return session
}

export function getSession(id: string | undefined): ConsumerSession | null {
  if (!id) return null
  const s = getState().sessions.get(id)
  if (!s) return null
  if (Date.now() - Date.parse(s.lastSeenAt) > 30 * 86400000) return null
  s.lastSeenAt = nowIso()
  return s
}

/** 세션이 없으면 새로 만든다 */
export function ensureSession(id: string | undefined): ConsumerSession {
  return getSession(id) ?? createSession()
}

export function saveProfile(sessionId: string, profile: SearchProfile) {
  const s = getSession(sessionId)
  if (!s) return null
  s.profile = profile
  if (s.userId) getState().profiles.set(s.userId, profile)
  persist()
  return s
}

export function setPendingIntent(sessionId: string, intent: PendingIntent | null) {
  const s = getSession(sessionId)
  if (!s) return null
  s.pendingIntent = intent
  persist()
  return s
}

export function getUser(id: string | null): ConsumerUser | null {
  if (!id) return null
  return getState().users.get(id) ?? null
}

export class EmailInUseError extends Error {
  constructor() {
    super('이미 가입된 이메일입니다. 로그인해 주세요.')
    this.name = 'EmailInUseError'
  }
}

/**
 * 가입. 같은 세션의 가입 전 탐색 기록(관심공고·알림)을 계정에 연결한다.
 * 비밀번호 인증은 아직 구현하지 않았으므로 실서비스 인증이라고 표시하지 않는다.
 */
export function signUp(sessionId: string, email: string, nickname: string, password: string) {
  const state = getState()
  const normalized = email.trim().toLowerCase()

  if (state.usersByEmail.has(normalized)) throw new EmailInUseError()
  if (!password || password.length < 12 || password.length > 128) throw new Error('비밀번호는 12~128자로 입력해 주세요.')
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')

  const user: ConsumerUser = {
    id: randomUUID(),
    email: normalized,
    nickname: nickname.trim() || normalized.split('@')[0],
    createdAt: nowIso(),
  }
  state.users.set(user.id, user)
  state.usersByEmail.set(normalized, user.id)
  state.credentials.set(user.id, `${salt}:${hash}`)

  const session = getSession(sessionId)
  if (session) session.userId = user.id
  if (session?.profile) state.profiles.set(user.id, session.profile)

  // 가입 전 같은 세션에서 만든 기록을 계정에 승계한다 (중복 생성 없이 연결만).
  for (const row of state.saved) if (row.sessionId === sessionId) row.userId = user.id
  for (const row of state.alerts) if (row.sessionId === sessionId) row.userId = user.id
  for (const row of state.events) if (row.sessionId === sessionId) row.userId = user.id
  persist()

  return user
}

export function logIn(sessionId: string, email: string, password: string) {
  const state = getState()
  const userId = state.usersByEmail.get(email.trim().toLowerCase())
  const stored = userId ? state.credentials.get(userId) : null
  const [salt, hash] = stored?.split(':') ?? ['missing-account', '00'.repeat(64)]
  const computed = scryptSync(password, salt, 64)
  if (!userId || !timingSafeEqual(computed, Buffer.from(hash, 'hex'))) return null
  const session = getSession(sessionId)
  if (session) session.userId = userId
  if (session) {
    if (session.profile) state.profiles.set(userId, session.profile)
    else session.profile = state.profiles.get(userId) ?? null
  }
  for (const row of state.saved) if (row.sessionId === sessionId) row.userId = userId
  for (const row of state.alerts) if (row.sessionId === sessionId) row.userId = userId
  state.saved = state.saved.filter((r, i, all) => all.findIndex(x => x.userId === r.userId && x.propertyId === r.propertyId && (r.userId || x.sessionId === r.sessionId)) === i)
  for (const row of state.events) if (row.sessionId === sessionId) row.userId = userId
  persist()
  return state.users.get(userId) ?? null
}

/** 같은 공고를 두 번 저장해도 기록이 중복되지 않는다 */
export function saveNotice(session: ConsumerSession, propertyId: string): SavedNotice {
  const state = getState()
  const existing = state.saved.find(
    r =>
      r.propertyId === propertyId &&
      (session.userId ? r.userId === session.userId : r.sessionId === session.id),
  )
  if (existing) return existing

  const row: SavedNotice = {
    id: randomUUID(),
    sessionId: session.id,
    userId: session.userId,
    propertyId,
    createdAt: nowIso(),
  }
  state.saved.push(row)
  persist()
  return row
}

export function unsaveNotice(session: ConsumerSession, propertyId: string) {
  const state = getState()
  const before = state.saved.length
  state.saved = state.saved.filter(
    r =>
      !(
        r.propertyId === propertyId &&
        (session.userId ? r.userId === session.userId : r.sessionId === session.id)
      ),
  )
  persist()
  return before !== state.saved.length
}

export function listSaved(session: ConsumerSession): SavedNotice[] {
  return getState().saved.filter(r =>
    session.userId ? r.userId === session.userId : r.sessionId === session.id,
  )
}

export interface AlertInput {
  scope: AlertScope
  propertyId: string | null
  profile: SearchProfile | null
}

/** 알림 수신은 가입과 별개로 명시적 동의를 받은 뒤에만 만든다 */
export function subscribeAlert(session: ConsumerSession, input: AlertInput): AlertSubscription {
  const state = getState()
  const existing = state.alerts.find(
    r =>
      r.scope === input.scope &&
      r.propertyId === input.propertyId &&
      (session.userId ? r.userId === session.userId : r.sessionId === session.id),
  )
  if (existing) {
    existing.profile = input.profile
    existing.consentedAt = nowIso()
    persist()
    return existing
  }

  const row: AlertSubscription = {
    id: randomUUID(),
    sessionId: session.id,
    userId: session.userId,
    scope: input.scope,
    propertyId: input.propertyId,
    profile: input.profile,
    channel: 'EMAIL',
    consentedAt: nowIso(),
    createdAt: nowIso(),
  }
  state.alerts.push(row)
  persist()
  return row
}

export function listAlerts(session: ConsumerSession): AlertSubscription[] {
  return getState().alerts.filter(r =>
    session.userId ? r.userId === session.userId : r.sessionId === session.id,
  )
}

export function unsubscribeAlert(session: ConsumerSession, alertId: string) {
  const state = getState()
  const before = state.alerts.length
  state.alerts = state.alerts.filter(
    r =>
      !(
        r.id === alertId &&
        (session.userId ? r.userId === session.userId : r.sessionId === session.id)
      ),
  )
  persist()
  return before !== state.alerts.length
}

/** 실제로 성공한 행동만 기록한다 */
export function track(
  session: ConsumerSession,
  name: string,
  props: ConsumerEvent['props'] = {},
) {
  const state = getState()
  const key = JSON.stringify(props)
  if (state.events.some(e => e.sessionId === session.id && e.name === name && JSON.stringify(e.props) === key && Date.now() - Date.parse(e.at) < 1000)) return
  state.events.push({
    id: randomUUID(),
    at: nowIso(),
    name,
    sessionId: session.id,
    userId: session.userId,
    props,
  })
  if (state.events.length > 2000) state.events.splice(0, state.events.length - 2000)
  persist()
}

export function revokeSession(id: string) { getState().sessions.delete(id); persist() }

export function rotateSession(session: ConsumerSession) {
  const oldId = session.id
  const state = getState()
  state.sessions.delete(oldId)
  session.id = randomUUID()
  state.sessions.set(session.id, session)
  for (const row of [...state.saved, ...state.alerts, ...state.events]) {
    if (row.sessionId === oldId) row.sessionId = session.id
  }
  persist()
  return session
}

export function listEvents() {
  return getState().events
}
