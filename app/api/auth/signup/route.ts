import { NextRequest } from 'next/server'
import { resolveSession, setSessionCookie } from '@/lib/consumer/session'
import {
  EmailInUseError,
  UsernameInUseError,
  USERNAME_RULE,
  normalizeUsername,
  signUp,
  track,
  rotateSession,
} from '@/lib/consumer/store'
import { authLimited, checkMutation } from '@/lib/consumer/security'
import { linkAccountToCrm } from '@/lib/consumer/account'

export const dynamic = 'force-dynamic'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  const denied = checkMutation(req)
  if (denied) return denied
  try {
    const session = await resolveSession()
    const { email, username, nickname, password } = (await req.json()) ?? {}

    if (typeof email !== 'string' || !EMAIL.test(email.trim())) {
      return Response.json({ error: '이메일 주소를 확인해 주세요.' }, { status: 400 })
    }
    if (typeof username !== 'string' || !USERNAME_RULE.test(normalizeUsername(username))) {
      return Response.json(
        { error: '아이디는 영문 소문자·숫자·밑줄 4~20자로 입력해 주세요.', code: 'USERNAME_INVALID' },
        { status: 400 },
      )
    }

    if (typeof password !== 'string' || password.length < 12 || password.length > 128 || email.length > 254) {
      return Response.json({ error: '비밀번호는 12~128자로 입력해 주세요.' }, { status: 400 })
    }
    if (authLimited(email)) return Response.json({ error: '잠시 후 다시 시도해 주세요.' }, { status: 429 })
    const user = signUp(session.id, {
      email,
      username,
      nickname: typeof nickname === 'string' ? nickname.slice(0, 40) : '',
      password,
    })
    // 알림은 CRM 고객 레코드의 이메일로 나간다. 여기서 이어붙이지 않으면
    // 가입은 되는데 메일만 영영 안 나가는 상태가 된다. 실패해도 가입은 막지 않는다.
    await linkAccountToCrm(session.id, user).catch(err => {
      console.error('linkAccountToCrm(signup)', err)
    })
    rotateSession(session)
    await setSessionCookie(session.id)
    track(session, 'signup_completed', {})

    return Response.json({ user })
  } catch (err) {
    if (err instanceof EmailInUseError) {
      return Response.json({ error: err.message, code: 'EMAIL_IN_USE' }, { status: 409 })
    }
    if (err instanceof UsernameInUseError) {
      return Response.json({ error: err.message, code: 'USERNAME_IN_USE' }, { status: 409 })
    }
    return Response.json(
      { error: err instanceof Error ? err.message : '가입하지 못했습니다.' },
      { status: 500 },
    )
  }
}
