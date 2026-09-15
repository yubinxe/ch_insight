import { isAdminRequest } from '@/lib/admin/auth'
import { fetchApplyhome, isApplyhomeConfigured } from '@/lib/adapters/applyhome'
import * as repo from '@/lib/db/repo'

export const dynamic = 'force-dynamic'

/** 청약홈 OpenAPI 에서 모집공고를 받아 Opportunity 로 정규화·저장한다. */
export async function POST() {
  if (!(await isAdminRequest())) {
    return Response.json({ error: '운영자 인증이 필요합니다.' }, { status: 401 })
  }

  const result = await fetchApplyhome({ perPage: 100, monthsBack: 2 })

  if (!result.ok) {
    // 실패를 예시 데이터로 덮어 가리지 않는다
    return Response.json(
      {
        ok: false,
        configured: isApplyhomeConfigured(),
        reason: result.reason,
        fetched: 0,
        inserted: 0,
        updated: 0,
      },
      { status: 200 },
    )
  }

  const upsert = await repo.upsertOpportunities(result.rows)
  return Response.json({
    ok: true,
    configured: true,
    fetchedAt: result.fetchedAt,
    fetched: result.rows.length,
    inserted: upsert.inserted,
    updated: upsert.updated,
    failed: upsert.failed,
    errors: upsert.errors,
    storage: repo.storageMode(),
  })
}

export async function GET() {
  if (!(await isAdminRequest())) {
    return Response.json({ error: '운영자 인증이 필요합니다.' }, { status: 401 })
  }
  const probe = await fetchApplyhome({ perPage: 1, monthsBack: 1 })
  return Response.json({
    configured: isApplyhomeConfigured(),
    ok: probe.ok,
    reason: probe.reason,
    sample: probe.rows.length,
  })
}
