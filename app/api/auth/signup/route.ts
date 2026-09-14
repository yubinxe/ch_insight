import { NextRequest } from 'next/server'
import { resolveSession, setSessionCookie } from '@/lib/consumer/session'
import { EmailInUseError, signUp, track, rotateSession } from '@/lib/consumer/store'
import { authLimited, checkMutation } from '@/lib/consumer/security'

export const dynamic = 'force-dynamic'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  const denied = checkMutation(req)
  if (denied) return denied
  try {
    const session = await resolveSession()
    const { email, nickname, password } = (await req.json()) ?? {}

    if (typeof email !== 'string' || !EMAIL.test(email.trim())) {
      return Response.json({ error: '이메일 주소를 확인해 주세요.' }, { status: 400 })
    }

    if (typeof password !== 'string' || password.length < 12 || password.length > 128 || email.length > 254) {
      return Response.json({ error: '비밀번호는 12~128자로 입력해 주세요.' }, { status: 400 })
    }
    if (authLimited(email)) return Response.json({ error: '잠시 후 다시 시도해 주세요.' }, { status: 429 })
    const user = signUp(session.id, email, typeof nickname === 'string' ? nickname.slice(0, 40) : '', password)
    rotateSession(session)
    await setSessionCookie(session.id)
    track(session, 'signup_completed', {})

    return Response.json({ user })
  } catch (err) {
    if (err instanceof EmailInUseError) {
      return Response.json({ error: err.message, code: 'EMAIL_IN_USE' }, { status: 409 })
    }
    return Response.json(
      { error: err instanceof Error ? err.message : '가입하지 못했습니다.' },
      { status: 500 },
    )
  }
}
