import * as repo from '@/lib/db/repo'
import type { OpportunityRow } from '@/lib/db/types'

/**
 * 시연용 결정적(deterministic) 시드.
 *
 * 순수 난수를 쓰지 않는다 — 데모가 실행마다 달라지면 안 된다.
 * 생성물은 전부 is_demo = true 로 실데이터와 구분한다.
 */

function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a += 0x6d2b79f5
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const REGIONS = ['관악구', '동작구', '마포구', '영등포구', '성동구', '송파구', '서초구', '강남구', '금천구', '서대문구']
const TYPES = ['청년매입임대', '행복주택', '공공임대', '공공지원민간임대', '신혼희망타운']
const NAME_HEAD = ['행복', '청년', '새길', '도담', '한울', '온누리', '푸른', '해오름', '나래', '별빛', '소담', '가온', '누리', '한빛', '라온']
const NAME_TAIL = ['주택', '스테이', '하우스', '타운', '빌리지']
const SURNAME = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권']
const GIVEN = ['민준', '서연', '지우', '하윤', '도윤', '서준', '예은', '수아', '주원', '지안', '유진', '현우', '시우', '다은', '태현']

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function shift(base: Date, days: number) {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d
}
function maskName(full: string) {
  return full.length <= 2 ? full[0] + '*' : full[0] + '*'.repeat(full.length - 2) + full[full.length - 1]
}

export interface SeedResult {
  customers: number
  preferences: number
  opportunities: number
  heroOpportunityId: string | null
  storage: 'supabase' | 'memory'
}

/**
 * 히어로 공고(H023 대응)는 고정 스펙으로 만든다.
 * 동작구 / 청년매입임대 / 29㎡ / 보증금 6,500만 / 월 32만 / 마감 임박.
 * 여기에 정확히 맞는 고객을 심어 90점 이상이 반드시 나오게 한다.
 */
const HERO: Partial<OpportunityRow> = {
  source: 'DEMO',
  external_id: 'DEMO-H023',
  opportunity_type: 'RENTAL',
  housing_type: '청년매입임대',
  title: '동작구 청년 매입임대 (노량진)',
  region: '동작구',
  district: '서울특별시',
  address: '서울특별시 동작구 노량진로 100',
  area: 29,
  deposit: 6500,
  monthly_rent: 32,
  supply_count: 12,
  vacancy_count: 0,
  status: 'OPEN',
  source_url: null,
  competition_rate: 6.8,
  is_demo: true,
}

export async function seedDemo(opts: { customers?: number; opportunities?: number } = {}): Promise<SeedResult> {
  const { customers: customerCount = 100, opportunities: oppCount = 60 } = opts
  const today = new Date()
  const storage = repo.storageMode()

  // ── 기회 ──────────────────────────────────────────────
  const rand = rng(990915)
  const opportunities: Partial<OpportunityRow>[] = []

  const heroStart = shift(today, -3)
  const heroEnd = shift(today, 3)
  opportunities.push({
    ...HERO,
    application_start: iso(heroStart),
    application_end: iso(heroEnd),
    document_deadline: null,
    result_date: iso(shift(heroEnd, 21)),
    contract_start: null,
  })

  for (let i = 1; i < oppCount; i++) {
    const region = REGIONS[Math.floor(rand() * REGIONS.length)]
    const housingType = TYPES[Math.floor(rand() * TYPES.length)]
    const startOffset = Math.floor(rand() * 60) - 35
    const duration = 7 + Math.floor(rand() * 14)
    const start = shift(today, startOffset)
    const end = shift(start, duration)
    const hasResult = rand() < 0.7
    const hasDocDeadline = rand() < 0.35

    const t = iso(today)
    const s = iso(start)
    const e = iso(end)

    opportunities.push({
      source: 'DEMO',
      // 히어로(DEMO-H023)와 절대 충돌하지 않는 접두사를 쓴다
      external_id: `DEMO-R${String(i).padStart(3, '0')}`,
      opportunity_type: 'RENTAL',
      housing_type: housingType,
      title: `${NAME_HEAD[Math.floor(rand() * NAME_HEAD.length)]}${NAME_TAIL[Math.floor(rand() * NAME_TAIL.length)]} ${region} ${i + 1}차`,
      region,
      district: '서울특별시',
      address: `서울특별시 ${region} ${Math.floor(rand() * 400) + 10}`,
      area: 20 + Math.floor(rand() * 26),
      deposit: (28 + Math.floor(rand() * 120)) * 100,
      monthly_rent: 18 + Math.floor(rand() * 54),
      supply_count: 4 + Math.floor(rand() * 80),
      vacancy_count: 0,
      application_start: s,
      application_end: e,
      document_deadline: hasDocDeadline ? iso(shift(end, 2 + Math.floor(rand() * 5))) : null,
      result_date: hasResult ? iso(shift(end, 14 + Math.floor(rand() * 20))) : null,
      contract_start: null,
      status: t < s ? 'UPCOMING' : t > e ? 'CLOSED' : 'OPEN',
      source_url: null,
      // 경쟁률은 일부에만 — 없는 건 null 로 두고 매칭이 가중치를 재분배하게 한다
      competition_rate: rand() < 0.6 ? Math.round(rand() * rand() * 400) / 10 + 1.2 : null,
      is_demo: true,
    })
  }

  await repo.upsertOpportunities(opportunities)
  const stored = await repo.listOpportunities({ limit: 300 })
  const hero = stored.find(o => o.external_id === 'DEMO-H023') ?? null

  // ── 고객 + 관심조건 ───────────────────────────────────
  const crand = rng(20260915)
  let madeCustomers = 0
  let madePrefs = 0

  for (let i = 0; i < customerCount; i++) {
    const idx = i + 1
    const sessionId = `demo-session-${String(idx).padStart(3, '0')}`

    // 이미 있으면 다시 만들지 않는다 (재실행해도 중복되지 않음)
    const existing = await repo.findCustomerBySession(sessionId)
    if (existing) continue

    const fullName = `${SURNAME[Math.floor(crand() * SURNAME.length)]}${GIVEN[Math.floor(crand() * GIVEN.length)]}`

    // C034 위치의 고객은 히어로 공고에 정확히 맞춘다 (90점 이상 보장)
    const isHeroCustomer = idx === 34
    const regions = isHeroCustomer
      ? ['동작구', '관악구']
      : [REGIONS[Math.floor(crand() * REGIONS.length)]]
    if (!isHeroCustomer && crand() < 0.6) {
      const second = REGIONS[Math.floor(crand() * REGIONS.length)]
      if (!regions.includes(second)) regions.push(second)
    }

    const customer = await repo.upsertCustomer({
      name: maskName(fullName),
      email: `demo${String(idx).padStart(3, '0')}@example.com`,
      session_id: sessionId,
      lead_score: 0,
      lifecycle_stage: 'COLD',
    })
    madeCustomers++

    await repo.savePreference(customer.id, {
      preferred_regions: regions,
      max_deposit: isHeroCustomer ? 7000 : (30 + Math.floor(crand() * 120)) * 100,
      max_monthly_rent: isHeroCustomer ? 40 : 20 + Math.floor(crand() * 50),
      min_area: isHeroCustomer ? 28 : 20 + Math.floor(crand() * 20),
      preferred_housing_types: isHeroCustomer
        ? ['청년매입임대']
        : [TYPES[Math.floor(crand() * TYPES.length)]],
      move_in_period: null,
      // 시연을 위해 대부분 알림 동의 상태로 둔다
      notification_enabled: true,
    })
    madePrefs++
  }

  return {
    customers: madeCustomers,
    preferences: madePrefs,
    opportunities: opportunities.length,
    heroOpportunityId: hero?.id ?? null,
    storage,
  }
}
