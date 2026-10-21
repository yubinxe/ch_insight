import { NextRequest } from 'next/server'
import { resolveSession } from '@/lib/consumer/session'
import * as repo from '@/lib/db/repo'
import { trackBehavior } from '@/lib/services/pipeline'
import { rankOpportunities } from '@/lib/services/matching'
import { describeSaved, extractInfo, hasAnyInfo, reply } from '@/lib/services/chat'
import { emailProvider } from '@/lib/notifications/email'

export const dynamic = 'force-dynamic'

const MAX_LEN = 1000

/**
 * 상담 챗봇.
 *
 * 사용자가 메시지에 개인정보를 넣으면 그대로 CRM 에 저장하고
 * 무엇을 저장했는지 바로 알린다.
 * 분석 이벤트에는 개인정보 원문을 넣지 않고 항목명만 남긴다.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await resolveSession()
    const body = (await req.json().catch(() => ({}))) ?? {}
    const message = typeof body.message === 'string' ? body.message.trim() : ''

    if (!message) return Response.json({ error: '메시지를 입력해 주세요.' }, { status: 400 })
    if (message.length > MAX_LEN) {
      return Response.json({ error: '메시지가 너무 깁니다.' }, { status: 413 })
    }

    const info = extractInfo(message)

    // 세션에 연결된 고객 (없고 저장할 정보가 있으면 만든다)
    let customer = await repo.findCustomerBySession(session.id)
    if (!customer && hasAnyInfo(info)) {
      customer = await repo.upsertCustomer({ session_id: session.id })
    }

    let savedNote = ''
    if (customer && hasAnyInfo(info)) {
      // 고객 식별 정보
      if (info.name || info.email || info.phone) {
        await repo.upsertCustomer({
          id: customer.id,
          ...(info.name ? { name: info.name } : {}),
          ...(info.email ? { email: info.email.toLowerCase() } : {}),
          ...(info.phone ? { phone: info.phone } : {}),
        })
      }

      // 조건 정보 — 기존 값을 지우지 않고 준 것만 덮어쓴다
      if (info.regions || info.maxDeposit !== undefined || info.maxMonthlyRent !== undefined || info.minArea !== undefined) {
        const pref = await repo.getPreference(customer.id)
        await repo.savePreference(customer.id, {
          preferred_regions: info.regions ?? pref?.preferred_regions ?? [],
          max_deposit: info.maxDeposit ?? pref?.max_deposit ?? null,
          max_monthly_rent: info.maxMonthlyRent ?? pref?.max_monthly_rent ?? null,
          min_area: info.minArea ?? pref?.min_area ?? null,
          preferred_housing_types: pref?.preferred_housing_types ?? [],
          move_in_period: pref?.move_in_period ?? null,
          notification_enabled: pref?.notification_enabled ?? false,
        })
      }

      savedNote = describeSaved(info)

      await trackBehavior({
        customerId: customer.id,
        sessionId: session.id,
        eventType: 'PREFERENCE_SAVED',
        source: 'CHAT',
        // 개인정보 원문을 넣지 않고 어떤 항목이 들어왔는지만 남긴다
        metadata: { fields: Object.keys(info) },
      })
    }

    // 문의로 분류되고 연락 수단이 있으면 상담 요청으로 남긴다
    const pref = customer ? await repo.getPreference(customer.id) : null
    const contact = info.email ?? info.phone ?? null

    const opportunities = await repo.listOpportunities({ limit: 200 })
    const candidates = pref ? rankOpportunities(pref, opportunities).primary.length : null
    // 실제 공고가 실제로 있는지로 답한다. "준비 중"을 고정 문구로 두지 않는다.
    const officialCount = opportunities.filter(o => !o.is_demo).length

    const answer = reply(message, {
      hasPreference: Boolean(pref && pref.preferred_regions.length),
      candidateCount: candidates,
      emailConfigured: emailProvider.isConfigured(),
      officialCount,
      regions: pref?.preferred_regions ?? [],
    })

    if (answer.scenario === 'S6' && contact) {
      await repo.insertInquiry({
        customer_id: customer?.id ?? null,
        session_id: session.id,
        opportunity_id: null,
        message,
        contact,
        status: 'OPEN',
      })
      await trackBehavior({
        customerId: customer?.id ?? null,
        sessionId: session.id,
        eventType: 'INQUIRY_CREATED',
        source: 'CHAT',
        metadata: {},
      })
    }

    return Response.json({
      scenario: answer.scenario,
      text: savedNote ? `${answer.text}\n\n${savedNote}` : answer.text,
      actions: answer.actions,
      saved: hasAnyInfo(info) ? Object.keys(info) : [],
    })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : '답변을 만들지 못했습니다.' },
      { status: 500 },
    )
  }
}
