import { isAdminRequest } from '@/lib/admin/auth'
import * as rr from '@/lib/db/routines-repo'
import { ensureRoutines } from '@/lib/services/routine-runner'
import { storageMode } from '@/lib/db/repo'

export const dynamic = 'force-dynamic'

/** 루틴 목록 + 최근 실행 이력 */
export async function GET() {
  if (!(await isAdminRequest())) {
    return Response.json({ error: '운영자 인증이 필요합니다.' }, { status: 401 })
  }

  const routines = await ensureRoutines()
  const runs = await rr.listRuns({ limit: 60 })

  return Response.json({
    routines,
    runs,
    storage: storageMode(),
    // 스케줄러가 실제로 붙어 있는지. 없으면 화면에 "수동만 가능"으로 적는다.
    scheduler: Boolean((process.env.CRON_SECRET ?? '').trim()),
  })
}
