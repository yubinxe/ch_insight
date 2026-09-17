import type { NotificationChannel } from '@/lib/db/types'

/**
 * 알림 채널 추상화.
 *
 * Telegram 은 MVP 채널일 뿐 제품 아키텍처가 아니다.
 * Kakao / RCS / Email / Push 를 나중에 같은 인터페이스로 붙인다.
 * 매칭 서비스에 채널별 코드가 섞이지 않게 한다.
 */

export interface NotificationPayload {
  /** 채널별 수신자 식별자 (telegram chat id, email 등) */
  to: string | null
  title: string
  body: string
  /** 클릭 추적 링크. 원문 URL 을 직접 넣지 않는다 */
  linkUrl?: string
  linkLabel?: string
}

export type SendOutcome =
  /** 실제로 발송됨 */
  | { status: 'SENT'; detail: string }
  /** 자격증명·수신자 없음 → 원문만 보관 */
  | { status: 'PREVIEW'; detail: string }
  | { status: 'FAILED'; detail: string }

export interface NotificationProvider {
  readonly channel: NotificationChannel
  readonly label: string
  /** 자격증명이 준비됐는지 */
  isConfigured(): boolean
  send(payload: NotificationPayload): Promise<SendOutcome>
}
