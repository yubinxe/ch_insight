import { checkMutation } from '@/lib/consumer/security'
import { NextRequest } from 'next/server'
import { resolveSession } from '@/lib/consumer/session'
import { setPendingIntent } from '@/lib/consumer/store'
import type { PendingIntentKind } from '@/lib/crm/types'

export const dynamic = 'force-dynamic'

const KINDS: PendingIntentKind[] = ['SAVE_NOTICE', 'ALERT_NEW', 'ALERT_DEADLINE']

/** 가입 화면으로 넘어가기 직전의 의도를 보관한다. 가입 후 이 지점으로 되돌린다. */
export async function POST(req: NextRequest) {
  const denied = checkMutation(req)
  if (denied) return denied
  try {
    const session = await resolveSession()
    const body = await req.json().catch(() => null)

    if (body === null || body.kind === null) {
      setPendingIntent(session.id, null)
      return Response.json({ ok: true, pendingIntent: null })
    }

    if (!KINDS.includes(body.kind)) {
      return Response.json({ error: '알 수 없는 요청입니다.' }, { status: 400 })
    }

    const intent = {
      kind: body.kind as PendingIntentKind,
      propertyId: typeof body.propertyId === 'string' ? body.propertyId : null,
      createdAt: new Date().toISOString(),
    }
    setPendingIntent(session.id, intent)
    return Response.json({ ok: true, pendingIntent: intent })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : '요청을 처리하지 못했습니다.' },
      { status: 500 },
    )
  }
}
