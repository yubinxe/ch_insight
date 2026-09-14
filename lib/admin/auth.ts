import { cookies } from 'next/headers'
import { createHmac, timingSafeEqual } from 'crypto'

export const ADMIN_COOKIE = 'ci_admin'

/**
 * 운영 화면 접근 제어.
 *
 * 공개 메뉴에서 링크를 숨기는 것으로 대신하지 않고, 서버에서 매 요청 검사한다.
 * ADMIN_PASSCODE 가 설정되지 않으면 운영 화면 전체를 잠근다 (기본값을 두지 않는다).
 */
function secret() {
  return process.env.ADMIN_PASSCODE ?? ''
}

export function isAdminEnabled() {
  return secret().length > 0
}

function sign(value: string) {
  return createHmac('sha256', secret()).update(value).digest('hex')
}

export function issueToken() {
  const issued = String(Date.now())
  return `${issued}.${sign(issued)}`
}

export function verifyToken(token: string | undefined) {
  if (!token || !isAdminEnabled()) return false
  const [issued, mac] = token.split('.')
  if (!issued || !mac) return false

  const expected = sign(issued)
  const a = Buffer.from(mac)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false

  // 12시간 유효
  const age = Date.now() - Number(issued)
  return Number.isFinite(age) && age >= 0 && age < 12 * 60 * 60 * 1000
}

export function checkPasscode(input: string) {
  const s = secret()
  if (!s) return false
  const a = Buffer.from(input)
  const b = Buffer.from(s)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function isAdminRequest() {
  const jar = await cookies()
  return verifyToken(jar.get(ADMIN_COOKIE)?.value)
}
