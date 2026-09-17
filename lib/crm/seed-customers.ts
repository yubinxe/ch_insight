import { createRng } from './rng'
import type { Customer, HouseholdType, HousingType, IncomeBand } from './types'

const REGION_DIST: { value: string; weight: number }[] = [
  { value: '관악구', weight: 20 },
  { value: '동작구', weight: 15 },
  { value: '마포구', weight: 15 },
  { value: '서초구', weight: 10 },
  { value: '강남구', weight: 10 },
  { value: '송파구', weight: 10 },
  { value: '성동구', weight: 10 },
  { value: '영등포구', weight: 10 },
]

/** 인접 선호지역(2지망) — 실제 생활권 인접성 반영 */
const ADJACENT: Record<string, string[]> = {
  관악구: ['동작구', '금천구', '영등포구'],
  동작구: ['관악구', '영등포구', '서초구'],
  마포구: ['서대문구', '영등포구', '용산구'],
  서초구: ['강남구', '동작구', '송파구'],
  강남구: ['서초구', '송파구', '성동구'],
  송파구: ['강남구', '성동구', '강동구'],
  성동구: ['광진구', '중랑구', '동대문구'],
  영등포구: ['동작구', '관악구', '마포구'],
}

const AREA_DIST: { value: [number, number]; weight: number }[] = [
  { value: [20, 25], weight: 25 },
  { value: [25, 30], weight: 35 },
  { value: [30, 40], weight: 30 },
  { value: [40, 52], weight: 10 },
]

/**
 * 관심 주택유형은 가구 유형과 독립이 아니다.
 * (다자녀 가구가 청년매입임대를 1순위로 두는 식의 비현실적 조합을 막는다)
 * 전체 분포는 대략 청년매입 31% · 행복주택 34% · 공공임대 14% ·
 * 공공지원민간임대 14% · 신혼희망타운 8% 로 수렴한다.
 */
const HOUSING_BY_HOUSEHOLD: Record<HouseholdType, { value: HousingType; weight: number }[]> = {
  '1인가구': [
    { value: '청년매입임대', weight: 55 },
    { value: '행복주택', weight: 30 },
    { value: '공공지원민간임대', weight: 10 },
    { value: '공공임대', weight: 5 },
  ],
  신혼부부: [
    { value: '행복주택', weight: 40 },
    { value: '신혼희망타운', weight: 35 },
    { value: '공공지원민간임대', weight: 15 },
    { value: '공공임대', weight: 10 },
  ],
  '2인가구': [
    { value: '행복주택', weight: 40 },
    { value: '공공임대', weight: 25 },
    { value: '공공지원민간임대', weight: 20 },
    { value: '청년매입임대', weight: 15 },
  ],
  다자녀: [
    { value: '공공임대', weight: 55 },
    { value: '행복주택', weight: 25 },
    { value: '공공지원민간임대', weight: 20 },
  ],
  한부모: [
    { value: '공공임대', weight: 45 },
    { value: '행복주택', weight: 35 },
    { value: '공공지원민간임대', weight: 20 },
  ],
}

/** 가구원 수에 따른 최소 전용면적 하한 */
const AREA_FLOOR: Record<HouseholdType, number> = {
  '1인가구': 0,
  신혼부부: 26,
  '2인가구': 26,
  다자녀: 36,
  한부모: 30,
}

const HOUSEHOLD_DIST: { value: HouseholdType; weight: number }[] = [
  { value: '1인가구', weight: 52 },
  { value: '신혼부부', weight: 22 },
  { value: '2인가구', weight: 14 },
  { value: '다자녀', weight: 6 },
  { value: '한부모', weight: 6 },
]

const INCOME_DIST: { value: IncomeBand; weight: number }[] = [
  { value: '~50%', weight: 14 },
  { value: '50~70%', weight: 24 },
  { value: '70~100%', weight: 32 },
  { value: '100~120%', weight: 20 },
  { value: '120%~', weight: 10 },
]

const SURNAMES = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '송']
const GIVEN = [
  '민준', '서연', '지우', '하윤', '도윤', '서준', '지호', '예은', '수아', '주원',
  '지안', '유진', '연우', '현우', '아윤', '시우', '다은', '태현', '나연', '준서',
  '채원', '건우', '지민', '수빈', '해준', '윤서', '도현', '가은', '은우', '소율',
]

function maskName(full: string) {
  if (full.length <= 2) return full[0] + '*'
  return full[0] + '*'.repeat(full.length - 2) + full[full.length - 1]
}

export function generateCustomers(count = 100, seed = 20260911): Customer[] {
  const rng = createRng(seed)
  const out: Customer[] = []

  for (let i = 0; i < count; i++) {
    const primary = rng.weighted(REGION_DIST)
    const regions = [primary]
    if (rng.bool(0.62)) {
      const adj = ADJACENT[primary] ?? []
      const second = rng.pick(adj)
      if (second && !regions.includes(second)) regions.push(second)
    }

    const household = rng.weighted(HOUSEHOLD_DIST)

    const [areaMin, areaMax] = rng.weighted(AREA_DIST)
    const minArea = Math.max(AREA_FLOOR[household], rng.int(areaMin, areaMax))

    const housingDist = HOUSING_BY_HOUSEHOLD[household]
    const types: HousingType[] = [rng.weighted(housingDist)]
    if (rng.bool(0.45)) {
      const extra = rng.weighted(housingDist)
      if (!types.includes(extra)) types.push(extra)
    }

    const age =
      household === '1인가구'
        ? rng.int(24, 36)
        : household === '신혼부부'
          ? rng.int(28, 40)
          : rng.int(30, 52)

    // 보증금 3,000~15,000만원 / 월세 20~70만원
    const maxDeposit = rng.int(30, 150) * 100
    const maxMonthlyRent = rng.int(20, 70)

    const moveInMonth = rng.int(0, 8)
    const base = new Date(2026, 8, 1)
    base.setMonth(base.getMonth() + moveInMonth)
    const moveInPeriod = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}`

    const createdAt = new Date(2026, 8, 11)
    createdAt.setDate(createdAt.getDate() - rng.int(1, 300))

    const fullName = `${rng.pick(SURNAMES)}${rng.pick(GIVEN)}`

    out.push({
      id: `C${String(i + 1).padStart(3, '0')}`,
      name: maskName(fullName),
      age,
      householdType: household,
      incomeBand: rng.weighted(INCOME_DIST),
      preferredRegions: regions,
      maxDeposit,
      maxMonthlyRent,
      minArea,
      preferredHousingTypes: types,
      moveInPeriod,
      createdAt: createdAt.toISOString(),
      dataOrigin: 'SYNTHETIC',
    })
  }

  return out
}
