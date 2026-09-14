import { isAdminRequest } from '@/lib/admin/auth'
import { resetState } from '@/lib/crm/store'

export const dynamic = 'force-dynamic'

export async function POST() {
  if (!(await isAdminRequest())) return Response.json({ error: '운영자 인증이 필요합니다.' }, { status: 401 })
  try {
    resetState()
    return Response.json({ ok: true })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : '초기화 실패' },
      { status: 500 },
    )
  }
}
