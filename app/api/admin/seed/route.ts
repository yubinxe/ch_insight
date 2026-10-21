import { isAdminRequest } from '@/lib/admin/auth'
import { seedDemo } from '@/lib/services/seed'

export const dynamic = 'force-dynamic'

/** 시연용 결정적 데이터 생성. 생성물은 전부 is_demo = true. */
export async function POST() {
  if (!(await isAdminRequest())) {
    return Response.json({ error: '운영자 인증이 필요합니다.' }, { status: 401 })
  }
  try {
    return Response.json(await seedDemo())
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : '시드 생성에 실패했습니다.' },
      { status: 500 },
    )
  }
}
