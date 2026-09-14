import { checkMutation } from '@/lib/consumer/security'
import { NextRequest } from 'next/server'
import { resolveSession } from '@/lib/consumer/session'
import { listAlerts, subscribeAlert, track, unsubscribeAlert } from '@/lib/consumer/store'
import { propertyById } from '@/lib/crm/store'
import type { AlertScope } from '@/lib/crm/types'

export const dynamic = 'force-dynamic'

const SCOPES: AlertScope[] = ['NEW_NOTICE', 'DEADLINE']

export async function GET() {
  const session = await resolveSession()
  return Response.json({ alerts: listAlerts(session) })
}

/**
 * 알림 수신은 가입과 별개의 명시적 동의다.
 * consent 가 true 로 오지 않으면 만들지 않는다.
 */
export async function POST(req: NextRequest) {
  const denied = checkMutation(req)
  if (denied) return denied
  try {
    const session = await resolveSession()
    const body = (await req.json()) ?? {}
    const { scope, propertyId, consent } = body

    if (!SCOPES.includes(scope)) {
      return Response.json({ error: '알 수 없는 알림 종류입니다.' }, { status: 400 })
    }
    if (consent !== true) {
      return Response.json({ error: '알림 수신 동의가 필요합니다.' }, { status: 400 })
    }
    if (scope === 'DEADLINE' && (typeof propertyId !== 'string' || !propertyById(propertyId))) {
      return Response.json({ error: '공고를 찾을 수 없습니다.' }, { status: 404 })
    }
    if (scope === 'NEW_NOTICE' && !session.profile) {
      return Response.json({ error: '먼저 조건을 입력해 주세요.' }, { status: 400 })
    }

    subscribeAlert(session, {
      scope,
      propertyId: scope === 'DEADLINE' ? propertyId : null,
      profile: scope === 'NEW_NOTICE' ? session.profile : null,
    })
    track(session, 'alert_opted_in', { scope, propertyId: propertyId ?? null })

    return Response.json({ alerts: listAlerts(session) })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : '알림을 설정하지 못했습니다.' },
      { status: 500 },
    )
  }
}

export async function DELETE(req: NextRequest) {
  const denied = checkMutation(req)
  if (denied) return denied
  try {
    const session = await resolveSession()
    const { alertId } = (await req.json()) ?? {}
    if (typeof alertId !== 'string') {
      return Response.json({ error: '잘못된 요청입니다.' }, { status: 400 })
    }
    unsubscribeAlert(session, alertId)
    return Response.json({ alerts: listAlerts(session) })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : '해제하지 못했습니다.' },
      { status: 500 },
    )
  }
}
