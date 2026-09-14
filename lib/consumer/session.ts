import { cookies } from 'next/headers'
import { createSession, getSession, type ConsumerEvent } from './store'
import type { ConsumerSession } from '@/lib/crm/types'

export const SESSION_COOKIE = 'ci_sid'

export async function setSessionCookie(id: string) {
  const jar = await cookies()
  jar.set(SESSION_COOKIE, id, { httpOnly: true, sameSite: 'lax', path: '/',
    secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 * 30 })
}

/**
 * 요청에서 소비자 세션을 읽고, 없으면 새로 만들어 쿠키에 심는다.
 * 가입 전 탐색을 이어 붙이기 위한 식별자이며 인증 수단이 아니다.
 */
export async function resolveSession(): Promise<ConsumerSession> {
  const jar = await cookies()
  const existing = getSession(jar.get(SESSION_COOKIE)?.value)
  if (existing) return existing

  const created = createSession()
  await setSessionCookie(created.id)
  return created
}

export type { ConsumerEvent }
