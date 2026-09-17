import { isAdminRequest } from '@/lib/admin/auth'
import { NextRequest } from 'next/server'
import { advanceApplication, createApplication } from '@/lib/crm/store'
import { APPLICATION_STAGES, type ApplicationStage } from '@/lib/crm/types'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (!(await isAdminRequest())) return Response.json({ error: '운영자 인증이 필요합니다.' }, { status: 401 })
  try {
    const body = await req.json()
    const { customerId, propertyId } = body ?? {}
    if (typeof customerId !== 'string' || typeof propertyId !== 'string') {
      return Response.json({ error: 'customerId, propertyId 가 필요합니다.' }, { status: 400 })
    }
    const created = createApplication(customerId, propertyId)
    if (!created) return Response.json({ error: '고객 또는 주택을 찾을 수 없습니다.' }, { status: 404 })
    return Response.json(created)
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : '지원 생성 실패' },
      { status: 500 },
    )
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdminRequest())) return Response.json({ error: '운영자 인증이 필요합니다.' }, { status: 401 })
  try {
    const body = await req.json()
    const { id, stage } = body ?? {}
    if (typeof id !== 'string' || !APPLICATION_STAGES.includes(stage as ApplicationStage)) {
      return Response.json({ error: 'id, stage 가 올바르지 않습니다.' }, { status: 400 })
    }
    const app = advanceApplication(id, stage as ApplicationStage)
    if (!app) return Response.json({ error: '지원 건을 찾을 수 없습니다.' }, { status: 404 })
    return Response.json(app)
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : '단계 변경 실패' },
      { status: 500 },
    )
  }
}
