import { randomUUID, randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { mkdirSync, readFileSync, writeFileSync, renameSync, existsSync } from 'fs'
import { join } from 'path'
import { getSupabase, isSupabaseConfigured } from '@/lib/db/supabase'
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
 * 상태는 프로세스 메모리에 두고, 아래 순서로 밖에 내보낸다.
 *
 *   1) Supabase `consumer_state` 문서  — 있으면 이것을 쓴다. 인스턴스가 바뀌어도 남는다.
 *   2) 로컬 파일 `.data/consumer.json` — 로컬 개발용.
 *   3) 메모리만                        — 위 둘이 모두 막히면 여기까지 내려온다.
 *
 * 서버리스(Vercel)의 파일시스템은 읽기 전용이라 2번이 EROFS 로 죽는다.
 * 예전에는 그 예외가 그대로 올라와 `/api/me` 가 500 을 냈다. 이제는 한 번 감지하고
 * 파일 쓰기를 접는다 — 저장이 안 되는 것과 앱이 죽는 것은 다른 문제다.
 *
 * 문서 한 건으로 통째 저장하므로 **동시 쓰기는 마지막 쓰기가 이긴다.**
 * 세션·관심공고·알림을 정규화된 테이블로 분리하는 것이 다음 단계다.
 */
interface ConsumerState {
  sessions: Map<string, ConsumerSession>
  users: Map<string, ConsumerUser>
  usersByEmail: Map<string, string>
  /** 아이디 → userId. 이메일과 같은 자격의 열쇠라 색인도 나란히 둔다 */
  usersByUsername: Map<string, string>
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

const globalRef = globalThis as unknown as {
  __myhomeplzConsumer?: ConsumerState
  /** 파일 쓰기가 막힌 환경인지 (서버리스). 한 번 확인하면 다시 시도하지 않는다 */
  __myhomeplzFsBlocked?: boolean
  /** 프로세스당 한 번만 도는 하이드레이션 */
  __myhomeplzHydrate?: Promise<void>
}

const dataDir = process.env.CONSUMER_DATA_DIR || join(process.cwd(), '.data')
const dataFile = join(dataDir, 'consumer.json')
const DOC_ID = 'consumer'

/** 저장 형태 — Map 은 JSON 으로 바로 안 나가므로 배열로 편다 */
function serialize(s: ConsumerState) {
  return {
    ...s,
    sessions: [...s.sessions],
    users: [...s.users],
    usersByEmail: [...s.usersByEmail],
    // 아이디 색인은 나중에 생겼다. 배포가 도는 동안 이 항목이 없는 상태가
    // 메모리에 남아 있을 수 있으므로, 없으면 빈 색인으로 내보낸다 —
    // 여기서 터지면 저장 전체가 멈춘다.
    usersByUsername: [...(s.usersByUsername ?? new Map())],
    credentials: [...s.credentials],
    profiles: [...s.profiles],
  }
}

function deserialize(saved: ReturnType<typeof serialize>): ConsumerState {
  return {
    ...saved,
    sessions: new Map(saved.sessions),
    users: new Map(saved.users),
    usersByEmail: new Map(saved.usersByEmail),
    usersByUsername: new Map(saved.usersByUsername ?? []),
    credentials: new Map(saved.credentials ?? []),
    profiles: new Map(saved.profiles ?? []),
  }
}

/** 파일로 내보낸다. 읽기 전용 파일시스템이면 한 번만 확인하고 접는다 */
function persistToFile(json: string) {
  if (globalRef.__myhomeplzFsBlocked) return
  try {
    mkdirSync(dataDir, { recursive: true })
    writeFileSync(`${dataFile}.tmp`, json, { mode: 0o600 })
    renameSync(`${dataFile}.tmp`, dataFile)
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code === 'EROFS' || code === 'EACCES' || code === 'EPERM') {
      globalRef.__myhomeplzFsBlocked = true
      console.warn(
        `[consumer] 파일 저장 불가(${code}) — 이 환경에서는 파일로 보관하지 않습니다.` +
          (isSupabaseConfigured() ? '' : ' Supabase 도 없어 메모리에만 남습니다.'),
      )
      return
    }
    throw err
  }
}

/** Supabase 문서로 내보낸다. 응답을 기다리지 않는다 — 저장 실패가 요청을 막지 않는다 */
function persistToSupabase(doc: unknown) {
  const sb = getSupabase()
  if (!sb) return
  void sb
    .from('consumer_state')
    .upsert({ id: DOC_ID, doc, updated_at: new Date().toISOString() })
    .then(({ error }) => {
      if (error) console.error('[consumer] Supabase 저장 실패:', error.message)
    })
}

function persist() {
  const state = globalRef.__myhomeplzConsumer!
  const doc = serialize(state)
  persistToSupabase(doc)
  persistToFile(JSON.stringify(doc))
}

/**
 * Supabase 문서를 프로세스에 한 번 올린다.
 *
 * 저장소가 비동기라 동기 getState() 안에서는 읽을 수 없다.
 * 모든 소비자 라우트가 거쳐 가는 resolveSession() 에서 먼저 await 한다.
 */
export function hydrate(): Promise<void> {
  if (globalRef.__myhomeplzHydrate) return globalRef.__myhomeplzHydrate

  globalRef.__myhomeplzHydrate = (async () => {
    const sb = getSupabase()
    if (!sb) return
    try {
      const { data, error } = await sb.from('consumer_state').select('doc').eq('id', DOC_ID).maybeSingle()
      if (error) {
        console.error('[consumer] Supabase 로드 실패:', error.message)
        return
      }
      if (data?.doc) globalRef.__myhomeplzConsumer = deserialize(data.doc)
    } catch (err) {
      console.error('[consumer] Supabase 로드 예외:', err)
    }
  })()

  return globalRef.__myhomeplzHydrate
}

function getState(): ConsumerState {
  if (!globalRef.__myhomeplzConsumer) {
    globalRef.__myhomeplzConsumer = {
      sessions: new Map(),
      users: new Map(),
      usersByEmail: new Map(),
      usersByUsername: new Map(),
      saved: [],
      alerts: [],
      events: [],
      credentials: new Map(),
      profiles: new Map(),
    }
    // 로컬 파일이 있으면 올린다. 서버리스에서는 애초에 없다.
    try {
      if (existsSync(dataFile)) {
        globalRef.__myhomeplzConsumer = deserialize(JSON.parse(readFileSync(dataFile, 'utf8')))
      }
    } catch (err) {
      console.warn('[consumer] 로컬 파일을 읽지 못했습니다:', err)
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

/** 아이디 규칙 — 영문 소문자·숫자·밑줄, 4~20자. 이메일 모양은 아이디로 받지 않는다 */
export const USERNAME_RULE = /^[a-z0-9_]{4,20}$/

export class UsernameInUseError extends Error {
  constructor() {
    super('이미 사용 중인 아이디입니다.')
    this.name = 'UsernameInUseError'
  }
}

export function normalizeUsername(v: string) {
  return v.trim().toLowerCase()
}

/**
 * 아이디 색인을 보장한다.
 *
 * 색인은 나중에 생긴 물건이라, 옛 문서에서 올라온 상태나 배포 중간에 남아 있던
 * 상태에는 없을 수 있다. 읽기 직전에 한 번 세워 두면 호출부마다 방어할 필요가 없다.
 */
function usernameIndex(state: ConsumerState) {
  if (!state.usersByUsername) {
    state.usersByUsername = new Map(
      [...state.users.values()].filter(u => u.username).map(u => [u.username, u.id]),
    )
  }
  return state.usersByUsername
}

/**
 * 가입.
 *
 * 아이디와 이메일을 함께 받는다. 이메일만 받으면 다음 방문마다 주소를 통째로
 * 적어야 하고, 아이디만 받으면 알림을 보낼 곳이 없다. 둘 다 열쇠가 된다.
 * 같은 세션의 가입 전 탐색 기록(관심공고·알림)은 계정으로 승계한다.
 */
export function signUp(
  sessionId: string,
  input: { email: string; username: string; nickname?: string; password: string },
) {
  const state = getState()
  const byUsername = usernameIndex(state)
  const normalized = input.email.trim().toLowerCase()
  const username = normalizeUsername(input.username)

  if (!USERNAME_RULE.test(username)) {
    throw new Error('아이디는 영문 소문자·숫자·밑줄 4~20자로 입력해 주세요.')
  }
  if (state.usersByEmail.has(normalized)) throw new EmailInUseError()
  if (byUsername.has(username)) throw new UsernameInUseError()
  if (!input.password || input.password.length < 12 || input.password.length > 128) {
    throw new Error('비밀번호는 12~128자로 입력해 주세요.')
  }
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(input.password, salt, 64).toString('hex')

  const user: ConsumerUser = {
    id: randomUUID(),
    email: normalized,
    username,
    // 부르는 이름을 따로 받지 않았으면 아이디를 쓴다. 이메일 앞자리는
    // 본명이나 소속이 드러나는 경우가 있어 기본값으로 삼지 않는다.
    nickname: (input.nickname ?? '').trim() || username,
    createdAt: nowIso(),
  }
  state.users.set(user.id, user)
  state.usersByEmail.set(normalized, user.id)
  byUsername.set(username, user.id)
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

/**
 * 아이디 또는 이메일로 로그인한다.
 *
 * 어느 쪽으로 들어왔는지 되묻지 않는다. `@` 가 있으면 이메일로 보고, 없으면
 * 아이디로 본다. 둘 다 못 찾아도 비밀번호 비교는 그대로 수행한다 —
 * 일찍 돌아가면 응답 시간만으로 계정 존재 여부가 새어 나간다.
 */
export function logIn(sessionId: string, identifier: string, password: string) {
  const state = getState()
  const key = identifier.trim().toLowerCase()
  const userId = key.includes('@') ? state.usersByEmail.get(key) : usernameIndex(state).get(key)
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
