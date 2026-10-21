import type { Property } from '@/lib/crm/types'
import type { OpportunityRow } from '@/lib/db/types'
import * as repo from '@/lib/db/repo'

/**
 * CRM 저장소(opportunities)의 **실제 공고**를 소비자 화면 모델로 옮긴다.
 *
 * 두 가지를 섞지 않는다.
 *  - `is_demo = false` — 청약홈 등에서 수집한 실제 공고. 여기서만 가져온다.
 *  - `is_demo = true`  — 운영 시연용. 소비자 화면에 내보내지 않는다.
 *
 * 원본이 주지 않는 값(면적·보증금·월 임대료)은 null 로 남긴다.
 * 0 으로 채우면 무료 임대처럼 읽히고, 예산 판정까지 틀어진다.
 */

const SOURCE_LABEL: Record<string, string> = {
  APPLYHOME: '청약홈 (공공데이터포털)',
  LH: 'LH 청약플러스 (공공데이터포털)',
}

/** 공고가 '민영'·'국민' 처럼 자체 표기를 쓰면 그대로 둔다 */
function displayType(row: OpportunityRow): string {
  const t = (row.housing_type ?? '').trim()
  if (t) return t
  return row.opportunity_type === 'SUBSCRIPTION' ? '분양' : '임대'
}

function toProperty(row: OpportunityRow): Property {
  return {
    id: row.id,
    source: SOURCE_LABEL[row.source] ?? row.source,
    announcementId: row.external_id ?? row.id,
    name: row.title,
    housingType: displayType(row),
    region: row.region,
    // 광역명이 없으면 만들지 않는다. 지역명을 두 번 찍게 된다 ("전북 전북").
    district: row.district ?? '',
    address: row.address ?? '',
    area: row.area,
    deposit: row.deposit,
    monthlyRent: row.monthly_rent,
    supplyCount: row.supply_count ?? 0,
    vacancyCount: row.vacancy_count ?? 0,
    applicationStart: row.application_start,
    applicationEnd: row.application_end,
    documentDeadline: row.document_deadline,
    resultDate: row.result_date,
    contractStart: row.contract_start,
    sourceUrl: row.source_url,
    status: row.status,
    competitionRate: row.competition_rate,
    dataOrigin: 'OFFICIAL',
  }
}

export interface OfficialQuery {
  region?: string
  /** 공고 표기 기준. 선택지 이름과 정확히 같지 않을 수 있어 부분일치로 본다 */
  housingType?: string
  limit?: number
}

/**
 * 실제 공고 목록. 저장소 오류로 화면 전체가 죽지 않게 빈 배열로 떨어진다.
 * 실패를 예시 데이터로 덮지 않는다 — 호출부가 개수로 구분한다.
 */
export async function listOfficialProperties(q: OfficialQuery = {}): Promise<Property[]> {
  try {
    const rows = await repo.listOpportunities({
      region: q.region,
      includeDemo: false,
      limit: q.limit ?? 100,
    })
    const out = rows.map(toProperty)
    if (!q.housingType) return out
    return out.filter(p => p.housingType.includes(q.housingType!) || q.housingType!.includes(p.housingType))
  } catch {
    return []
  }
}

/** 실제 공고 1건. 없으면 null (예시 공고 조회는 호출부가 따로 한다) */
export async function findOfficialProperty(id: string): Promise<Property | null> {
  try {
    const row = await repo.getOpportunity(id)
    if (!row || row.is_demo) return null
    return toProperty(row)
  } catch {
    return null
  }
}
