import { cookies } from 'next/headers'
import { SESSION_COOKIE } from '@/lib/consumer/session'
import { revokeSession } from '@/lib/consumer/store'

export const dynamic = 'force-dynamic'

export async function POST() {
  const jar = await cookies()
  const id = jar.get(SESSION_COOKIE)?.value
  if (id) revokeSession(id)
  jar.delete(SESSION_COOKIE)
  return Response.json({ ok: true })
}
