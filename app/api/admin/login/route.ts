import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { ADMIN_COOKIE, checkPasscode, isAdminEnabled, issueToken } from '@/lib/admin/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (!isAdminEnabled()) {
    return Response.json({ error: '운영 화면이 설정되지 않았습니다.' }, { status: 503 })
  }
  const { passcode } = (await req.json().catch(() => ({}))) ?? {}
  if (typeof passcode !== 'string' || !checkPasscode(passcode)) {
    return Response.json({ error: '접속 코드가 올바르지 않습니다.' }, { status: 401 })
  }

  const jar = await cookies()
  jar.set(ADMIN_COOKIE, issueToken(), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12,
    secure: process.env.NODE_ENV === 'production',
  })
  return Response.json({ ok: true })
}
