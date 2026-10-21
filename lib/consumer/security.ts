import { createHash } from 'crypto'

const attempts = new Map<string, { count: number; until: number }>()

/** Same-origin mutations; auth attempts are bounded per browser and account. */
export function checkMutation(req: Request) {
  const origin = req.headers.get('origin')
  if (origin && origin !== new URL(req.url).origin) {
    return Response.json({ error: '다른 사이트에서 보낸 요청은 처리할 수 없어요.' }, { status: 403 })
  }
  if (!req.headers.get('content-type')?.includes('application/json')) {
    return Response.json({ error: 'JSON 요청이 필요합니다.' }, { status: 415 })
  }
  return null
}

export function authLimited(email: string) {
  const now = Date.now()
  for (const [k, v] of attempts) if (v.until < now) attempts.delete(k)
  const key = createHash('sha256').update(email.trim().toLowerCase()).digest('hex')
  const row = attempts.get(key) ?? { count: 0, until: now + 15 * 60000 }
  row.count += 1
  attempts.set(key, row)
  return row.count > 15
}
