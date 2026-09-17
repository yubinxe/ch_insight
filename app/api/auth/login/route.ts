import { NextRequest } from 'next/server'
import { resolveSession, setSessionCookie } from '@/lib/consumer/session'
import { logIn, rotateSession } from '@/lib/consumer/store'
import { authLimited, checkMutation } from '@/lib/consumer/security'
import { linkAccountToCrm } from '@/lib/consumer/account'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const denied = checkMutation(req)
  if (denied) return denied
  try {
    const session = await resolveSession()
    const body = (await req.json()) ?? {}
    // 예전 클라이언트는 `email` 로 보냈다. 같은 자리를 아이디도 쓴다.
    const identifier = typeof body.identifier === 'string' ? body.identifier : body.email
    const password = typeof body.password === 'string' ? body.password : ''
    if (
      typeof identifier !== 'string' ||
      !identifier.trim() ||
      identifier.length > 254 ||
      password.length > 128
    ) {
      return Response.json({ error: '아이디 또는 이메일을 입력해 주세요.' }, { status: 400 })
    }
    if (authLimited(identifier)) return Response.json({ error: '잠시 후 다시 시도해 주세요.' }, { status: 429 })
    const user = logIn(session.id, identifier, password)
    if (!user) {
      return Response.json({ error: '아이디·이메일 또는 비밀번호를 확인해 주세요.' }, { status: 401 })
    }
    // 로그인할 때마다 고객 레코드를 현재 세션에 다시 잇는다. 기기를 바꿔
    // 들어오면 세션 ID 가 달라지는데, 그대로 두면 알림이 옛 세션에 묶인다.
    await linkAccountToCrm(session.id, user).catch(err => {
      console.error('linkAccountToCrm(login)', err)
    })
    rotateSession(session)
    await setSessionCookie(session.id)
    return Response.json({ user })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : '로그인하지 못했습니다.' },
      { status: 500 },
    )
  }
}
