import { resolveSession } from '@/lib/consumer/session'
import { getUser, listAlerts, listSaved } from '@/lib/consumer/store'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await resolveSession()
    return Response.json({
      user: getUser(session.userId),
      profile: session.profile,
      savedIds: listSaved(session).map(r => r.propertyId),
      alerts: listAlerts(session),
      pendingIntent: session.pendingIntent,
    })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : '세션을 불러오지 못했습니다.' },
      { status: 500 },
    )
  }
}
