'use client'

import Link from 'next/link'
import type { Candidate } from '@/lib/crm/services/scoring'
import type { Property } from '@/lib/crm/types'
import { formatMan } from '@/lib/crm/services/scoring'
import SaveButton from './SaveButton'

export function statusBadge(urgency: Candidate['urgency']) {
  switch (urgency.level) {
    case 'CLOSED':
      return { cls: '', text: '접수 마감' }
    case 'TODAY':
    case 'IMMINENT':
      return { cls: 'cs-badge--urgent', text: urgency.label }
    case 'SOON':
      return { cls: 'cs-badge--check', text: urgency.label }
    case 'UPCOMING':
      return { cls: 'cs-badge--brand', text: urgency.label }
    case 'UNKNOWN':
      return { cls: '', text: '마감일 미정' }
    default:
      return { cls: 'cs-badge--ok', text: '접수중' }
  }
}

export default function NoticeCard({
  property,
  candidate,
  showReasons = true,
  index,
}: {
  property: Property
  candidate: Candidate | null
  showReasons?: boolean
  /** 카탈로그 인덱스 (0-based). 주면 카드 머리에 번호가 붙는다 */
  index?: number
}) {
  const badge = candidate ? statusBadge(candidate.urgency) : null
  const overBudget = candidate ? candidate.budget.depositOver > 0 || candidate.budget.rentOver > 0 : false

  return (
    <article className="cs-notice">
      <Link
        href={`/notices/${property.id}`}
        className="cs-notice__link"
        aria-label={`${property.name} 자세히 보기`}
      />

      {index !== undefined && (
        <span className="cs-notice__index">{String(index + 1).padStart(3, '0')}</span>
      )}

      <div className="cs-notice__top">
        {property.dataOrigin === 'SYNTHETIC' && <span className="cs-sample">예시 공고</span>}
        <span className="cs-badge cs-badge--brand">{property.housingType}</span>
        {badge && (
          <span className={`cs-badge ${badge.cls}`}>
            {(badge.cls === 'cs-badge--urgent' || badge.cls === 'cs-badge--ok') && (
              <span className="cs-badge__dot" />
            )}
            {badge.text}
          </span>
        )}
        {overBudget && <span className="cs-badge cs-badge--check">예산 초과</span>}
      </div>

      <h3 className="cs-notice__name">{property.name}</h3>
      <p className="cs-notice__where">
        {property.district} {property.region} · 전용 {property.area}㎡
      </p>

      <div className="cs-notice__price">
        <div className="cs-notice__deposit cs-num">보증금 {formatMan(property.deposit)}</div>
        <div className="cs-notice__rent cs-num">월 임대료 {property.monthlyRent.toLocaleString()}만원</div>
      </div>

      {showReasons && candidate && candidate.reasons.length > 0 && (
        <ul className="cs-notice__reasons">
          {candidate.reasons.slice(0, 2).map(r => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}

      {candidate && (
        <div className="cs-notice__caution">
          확인 필요 · {candidate.cautions[0]}
        </div>
      )}

      <div className="cs-notice__foot">
        <div className="cs-notice__meta">
          {property.applicationEnd ? (
            <>{property.dataOrigin === 'SYNTHETIC' ? '예시' : '공식'} 접수 마감 {property.applicationEnd}</>
          ) : (
            <>접수 마감일 공고 미공개</>
          )}
          <br />
          {property.source}
          <br />
          <span style={{ color: 'var(--brand)', fontSize: 16, fontWeight: 600 }}>자세히 보기 →</span>
        </div>
        <SaveButton propertyId={property.id} />
      </div>
    </article>
  )
}
