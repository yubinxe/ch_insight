import { isAdminRequest } from '@/lib/admin/auth'
import { NextRequest } from 'next/server'
import { triggerVacancyEvent } from '@/lib/crm/store'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (!(await isAdminRequest())) return Response.json({ error: '운영자 인증이 필요합니다.' }, { status: 401 })
  try {
    let propertyId: string | undefined
    try {
      const body = await req.json()
      propertyId = typeof body?.propertyId === 'string' ? body.propertyId : undefined
    } catch {
      propertyId = undefined
    }

    const result = await triggerVacancyEvent(propertyId)
    if (!result) {
      return Response.json({ error: '공실 이벤트를 발생시킬 주택이 없습니다.' }, { status: 409 })
    }
    return Response.json(result)
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : '이벤트 처리 실패' },
      { status: 500 },
    )
  }
}
