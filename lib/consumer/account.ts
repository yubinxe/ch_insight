import * as repo from '@/lib/db/repo'
import type { ConsumerUser } from '@/lib/crm/types'

/**
 * 소비자 계정을 CRM 고객 레코드에 잇는다.
 *
 * 알림은 `customers.email` 로 나간다. 탐색 단계에서 만들어지는 고객 레코드는
 * 세션 ID 만 갖고 있어서, 가입 이메일을 여기로 옮겨주지 않으면 발송 직전에
 * "수신자 없음"으로 조용히 보관만 된다 — 화면에는 아무 흔적도 남지 않는다.
 *
 * 같은 사람을 두 번 만들지 않도록 세션 → 이메일 순으로 찾아 붙인다.
 * 가입 전 세션에서 쌓인 조건·행동 기록을 그대로 승계하는 것이 목적이므로
 * 세션으로 찾은 레코드를 먼저 쓴다.
 */
export async function linkAccountToCrm(sessionId: string, user: ConsumerUser) {
  const email = user.email.trim().toLowerCase()

  const bySession = await repo.findCustomerBySession(sessionId)
  const byEmail = bySession ? null : await repo.findCustomerByEmail(email)
  const existing = bySession ?? byEmail

  return repo.upsertCustomer({
    ...(existing ? { id: existing.id } : {}),
    session_id: sessionId,
    email,
    // 닉네임은 인사말에만 쓴다. 비어 있으면 기존 값을 지우지 않는다.
    name: user.nickname || existing?.name || null,
  })
}
