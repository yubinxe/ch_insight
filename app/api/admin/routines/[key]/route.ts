import { isAdminRequest } from '@/lib/admin/auth'
import * as rr from '@/lib/db/routines-repo'

export const dynamic = 'force-dynamic'

/** 루틴 켜고 끄기 */
export async function PATCH(req: Request, ctx: { params: Promise<{ key: string }> }) {
  if (!(await isAdminRequest())) {
    return Response.json({ error: '운영자 인증이 필요합니다.' }, { status: 401 })
  }
  const { key } = await ctx.params
  const body = (await req.json().catch(() => ({}))) ?? {}
  if (typeof body.enabled !== 'boolean') {
    return Response.json({ error: 'enabled 값이 필요합니다.' }, { status: 400 })
  }
  const routine = await rr.setRoutineEnabled(key, body.enabled)
  if (!routine) return Response.json({ error: '루틴을 찾을 수 없습니다.' }, { status: 404 })
  return Response.json({ routine })
}
