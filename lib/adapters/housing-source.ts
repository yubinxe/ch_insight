import { hasDataPortalKey } from '@/lib/config/data-portal-key'
import { generateProperties } from '@/lib/crm/seed-properties'
import type { Property } from '@/lib/crm/types'

/**
 * 주거 공고 데이터원 Adapter.
 *
 * 실제 공개 API(청약홈/LH/SH)는 "개별 호실의 실시간 공실 여부"를 제공하지 않는다.
 * 따라서 MVP 는 아래 두 계층을 명확히 분리한다.
 *   - OfficialAnnouncementAdapter : 실제 공고 데이터 (청약홈 OpenAPI 등)
 *   - SyntheticVacancyAdapter     : 데모용 합성 공실 데이터 (dataOrigin: SYNTHETIC)
 */
export interface HousingSourceAdapter {
  readonly id: string
  readonly label: string
  /** 실제 공개 데이터 여부 */
  readonly isOfficial: boolean
  loadProperties(now?: Date): Promise<Property[]>
}

export const syntheticAdapter: HousingSourceAdapter = {
  id: 'synthetic',
  label: '데모 합성 데이터 (Synthetic)',
  isOfficial: false,
  async loadProperties(now = new Date()) {
    return generateProperties(50, 990911, now)
  },
}

/**
 * 청약홈 OpenAPI 연결 지점. 키가 없으면 빈 배열을 반환하고
 * 상위 레이어가 합성 데이터로 폴백한다 — 데모가 죽지 않게 한다.
 *
 * 주의: 이 어댑터는 "공고 정보"만 제공한다. 공실 이벤트는 공개 API 범위 밖이다.
 */
export const applyHomeAdapter: HousingSourceAdapter = {
  id: 'applyhome',
  label: '청약홈 OpenAPI (공공데이터포털)',
  isOfficial: true,
  async loadProperties() {
    if (!hasDataPortalKey()) return []
    // 실제 매핑은 lib/api.ts 의 분양정보 조회 결과를 Property 로 변환해 연결한다.
    // MVP 데모 범위 밖이므로 빈 배열을 반환한다 (없는 데이터를 만들어내지 않는다).
    return []
  },
}

export const ADAPTERS: HousingSourceAdapter[] = [applyHomeAdapter, syntheticAdapter]

export async function loadPropertiesWithFallback(now = new Date()) {
  for (const adapter of ADAPTERS) {
    try {
      const rows = await adapter.loadProperties(now)
      if (rows.length) return { adapter, properties: rows }
    } catch {
      // 한 어댑터가 실패해도 다음 어댑터로 넘어간다
    }
  }
  return { adapter: syntheticAdapter, properties: await syntheticAdapter.loadProperties(now) }
}
