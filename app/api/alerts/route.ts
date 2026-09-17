import { checkMutation } from '@/lib/consumer/security'
import { NextRequest } from 'next/server'
import { resolveSession } from '@/lib/consumer/session'
import { getUser, listAlerts, subscribeAlert, track, unsubscribeAlert } from '@/lib/consumer/store'
import { propertyById } from '@/lib/crm/store'
import * as repo from '@/lib/db/repo'
import { sendConditionDigest } from '@/lib/services/digest'
import { baseUrl } from '@/lib/services/pipeline'
import type { AlertScope, SearchProfile } from '@/lib/crm/types'

export const dynamic = 'force-dynamic'

const SCOPES: AlertScope[] = ['NEW_NOTICE', 'DEADLINE']

/**
 * 동의 직후 보내는 첫 다이제스트.
 *
 * 화면에 그대로 옮길 수 있도록 결과를 좁혀서 돌려준다. 본문 전체는 보내지 않는다 —
 * 메일에 무엇이 담겼는지는 메일함이 답할 일이고, 화면은 "갔는지"만 알면 된다.
 */
async function sendFirstDigest(userId: string | null, profile: SearchProfile) {
  const user = getUser(userId)
  const outcome = await sendConditionDigest({
    to: user?.email ?? null,
    nickname: user?.nickname ?? null,
    profile,
    siteUrl: baseUrl(),
  })
  return {
    status: outcome.status,
    detail: outcome.detail,
    officialCount: outcome.officialCount,
    relaxedCount: outcome.relaxedCount,
  }
}

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
    // 명시적 동의를 받은 경우에만 CRM 에서도 알림 대상으로 켠다
    const customer = await repo.findCustomerBySession(session.id).catch(() => null)
    if (customer) {
      const pref = await repo.getPreference(customer.id).catch(() => null)
      if (pref) {
        await repo
          .savePreference(customer.id, { ...pref, notification_enabled: true })
          .catch(() => null)
      }
    }

    track(session, 'alert_opted_in', { scope, propertyId: propertyId ?? null })

    // 조건 알림에 막 동의한 사람에게는 지금 상태를 한 통 보낸다.
    // 다음 루틴까지 아무것도 오지 않으면 사용자는 그 침묵을 고장으로 읽는다.
    // 발송이 실패해도 동의는 이미 저장됐다 — 구독 자체를 되돌리지 않는다.
    const digest =
      scope === 'NEW_NOTICE' && session.profile
        ? await sendFirstDigest(session.userId, session.profile).catch(err => {
            console.error('sendConditionDigest', err)
            return null
          })
        : null

    return Response.json({ alerts: listAlerts(session), digest })
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
