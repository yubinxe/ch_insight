import type { Customer, Match, Property } from '@/lib/crm/types'
import { daysUntil } from '@/lib/crm/services/scoring'

export interface NotificationPayload {
  customerId: string
  propertyId: string
  matchId: string
  title: string
  body: string
  /** 공고 원문 링크 (있을 때만) */
  linkUrl?: string
}

export interface NotificationResult {
  status: 'SENT' | 'PREVIEW' | 'FAILED'
  adapter: string
  detail: string
}

/**
 * 메시징 Adapter.
 * 이 환경에 카카오/메시징 MCP tool 이 없으면 KakaoMemoAdapter 가 비활성화되고
 * PreviewAdapter 가 payload 를 그대로 로그에 남긴다 — 데모는 중단되지 않는다.
 */
export interface NotificationAdapter {
  readonly id: string
  readonly label: string
  isAvailable(): boolean
  send(payload: NotificationPayload): Promise<NotificationResult>
}

function formatMoney(man: number) {
  if (man >= 10000) {
    const eok = Math.floor(man / 10000)
    const rest = man % 10000
    return rest ? `${eok}억 ${rest.toLocaleString()}만원` : `${eok}억원`
  }
  return `${man.toLocaleString()}만원`
}

function formatDeadline(dateStr: string | null) {
  if (!dateStr) return '공고문 확인 필요'
  const [, m, d] = dateStr.split('-')
  return `${Number(m)}월 ${Number(d)}일`
}

export function buildNotificationPayload(
  customer: Customer,
  property: Property,
  match: Match,
  now = new Date(),
): NotificationPayload {
  const d = daysUntil(property.applicationEnd, now)
  const dday = d === null ? '' : d < 0 ? ' (마감됨)' : d === 0 ? ' (오늘 마감!)' : ` · D-${d}`

  const body = [
    `🏠 ${customer.name}님, 조건에 맞는 집이 나왔어요`,
    '',
    property.name,
    `서울 ${property.region} · ${property.housingType} · 전용 ${property.area}㎡`,
    '',
    `보증금 ${formatMoney(property.deposit)}`,
    `월 임대료 ${property.monthlyRent}만원`,
    '',
    `지원 우선순위 ${match.opportunityScore}점 / 100점`,
    '',
    '이 집을 추천하는 이유',
    match.reason,
    '',
    `📅 접수 마감 ${formatDeadline(property.applicationEnd)}${dday}`,
    '',
    '※ AI 참고 분석이에요. 지원 전 공식 공고문을 꼭 확인해 주세요.',
  ].join('\n')

  return {
    customerId: customer.id,
    propertyId: property.id,
    matchId: match.id,
    title: `조건에 맞는 집 알림 · ${property.name}`,
    body,
  }
}

/**
 * 카카오톡 "나에게 보내기" (메모 API).
 * KAKAO_ACCESS_TOKEN 이 설정된 경우에만 실제 발송한다. 키는 .env 로만 주입한다.
 */
export const kakaoMemoAdapter: NotificationAdapter = {
  id: 'kakao-memo',
  label: '카카오톡 나에게 보내기',
  isAvailable() {
    return Boolean(process.env.KAKAO_ACCESS_TOKEN)
  },
  async send(payload) {
    const token = process.env.KAKAO_ACCESS_TOKEN
    if (!token) {
      return { status: 'FAILED', adapter: this.id, detail: 'KAKAO_ACCESS_TOKEN 미설정' }
    }
    try {
      const template = {
        object_type: 'text',
        text: payload.body.slice(0, 200),
        link: { web_url: payload.linkUrl ?? 'https://www.applyhome.co.kr' },
        button_title: '공고 확인',
      }
      const res = await fetch('https://kapi.kakao.com/v2/api/talk/memo/default/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ template_object: JSON.stringify(template) }),
      })
      if (!res.ok) {
        const text = await res.text()
        return { status: 'FAILED', adapter: this.id, detail: `카카오 API ${res.status}: ${text.slice(0, 160)}` }
      }
      return { status: 'SENT', adapter: this.id, detail: '카카오톡 나에게 보내기 전송 완료' }
    } catch (err) {
      return {
        status: 'FAILED',
        adapter: this.id,
        detail: `전송 실패: ${err instanceof Error ? err.message : String(err)}`,
      }
    }
  },
}

/** 발송 권한이 없는 환경의 폴백 — payload 를 그대로 보존해 Dashboard 에 미리보기로 노출 */
export const previewAdapter: NotificationAdapter = {
  id: 'preview',
  label: '미리보기 (아직 발송 안 함)',
  isAvailable() {
    return true
  },
  async send() {
    return {
      status: 'PREVIEW',
      adapter: 'preview',
      detail: '카카오 연동이 아직 없어 실제로 보내지는 않고, 보낼 내용만 저장했습니다.',
    }
  },
}

const CHAIN: NotificationAdapter[] = [kakaoMemoAdapter, previewAdapter]

export function activeNotificationAdapter(): NotificationAdapter {
  return CHAIN.find(a => a.isAvailable()) ?? previewAdapter
}

export async function dispatchNotification(payload: NotificationPayload) {
  const adapter = activeNotificationAdapter()
  try {
    const result = await adapter.send(payload)
    if (result.status === 'FAILED' && adapter.id !== 'preview') {
      const fallback = await previewAdapter.send(payload)
      return { ...fallback, detail: `${result.detail} → 미리보기로 폴백` }
    }
    return result
  } catch (err) {
    return {
      status: 'PREVIEW' as const,
      adapter: 'preview',
      detail: `어댑터 예외로 폴백: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}
