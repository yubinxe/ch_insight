import { propertyById } from '@/lib/crm/store'
import { findOfficialProperty } from '@/lib/consumer/official'
import { fetchSupplyModels } from '@/lib/adapters/applyhome-models'
import { fetchTradeStat } from '@/lib/adapters/molit-trade'
import { geocode, isGeocodingConfigured } from '@/lib/consumer/geocode'
import { checkUrgency, buildCandidate } from '@/lib/crm/services/scoring'
import { buildTasks } from '@/lib/crm/services/scheduling'
import { resolveSession } from '@/lib/consumer/session'
import { track } from '@/lib/consumer/store'

export const dynamic = 'force-dynamic'

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    // 실제 공고만 연다. 예시를 먼저 찾던 예전 순서는, 목록에서 예시를 걷어낸
    // 뒤에도 주소창과 저장 목록으로 예시 상세가 열리게 두고 있었다.
    // 상세는 '예시' 배지 하나에 모든 구분을 걸어두기에 너무 깊은 자리다.
    const includeSample = new URL(req.url).searchParams.get('includeSample') === '1'
    const property =
      (await findOfficialProperty(id)) ?? (includeSample ? propertyById(id) : null)
    if (!property) {
      return Response.json({ error: '공고를 찾을 수 없습니다.' }, { status: 404 })
    }

    const session = await resolveSession()
    const now = new Date()
    const urgency = checkUrgency(property, now)

    // 저장된 조건이 있으면 이 공고에 대한 개인 판정을 함께 준다.
    let candidate = null
    if (session.profile) {
      const p = session.profile
      const searcher = {
        preferredRegions: p.regions, maxDeposit: p.maxDeposit,
        maxMonthlyRent: p.maxMonthlyRent, minArea: p.minArea,
        preferredHousingTypes: p.housingTypes,
      }
      candidate = buildCandidate(searcher, property, now)
    }

    // 준비 일정 미리보기 — 공식 기한과 권장 준비일을 구분해 보여준다.
    const schedule = buildTasks(property, { applicationId: `preview:${property.id}` })

    /**
     * 주택형별 공급. 청약홈 분양에만 있다 — LH 임대는 이 API 에 나오지 않는다.
     * 없거나 실패하면 빈 배열이고, 화면은 그 자리를 접는다.
     */
    const supply =
      property.dataOrigin === 'OFFICIAL' && property.source.includes('청약홈')
        ? await fetchSupplyModels(property.announcementId)
        : { models: [], ok: true, reason: null }

    /**
     * 주변 실거래.
     *
     * 국토부는 시군구 코드로만 물을 수 있다. 주소를 지오코딩할 때 카카오가
     * 법정동코드를 함께 주므로 그것을 쓴다 — 주소를 두 번 묻지 않는다.
     */
    const where =
      property.dataOrigin === 'OFFICIAL' && isGeocodingConfigured()
        ? await geocode(property.address).catch(() => null)
        : null
    const trade = where?.bCode
      ? await fetchTradeStat(where.bCode, where.dong)
      : null

    track(session, 'notice_viewed', { propertyId: property.id })

    return Response.json({
      property,
      urgency,
      candidate,
      schedule,
      budget: candidate?.budget ?? null,
      dataOrigin: property.dataOrigin,
      supplyModels: supply.models,
      trade: trade
        ? {
            ...trade,
            dong: where?.dong ?? null,
            sigungu: where?.sigungu ?? null,
          }
        : null,
    })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : '공고를 불러오지 못했습니다.' },
      { status: 500 },
    )
  }
}
