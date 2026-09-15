'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { Property } from '@/lib/crm/types'
import type { UrgencyInfo } from '@/lib/crm/services/scoring'
import NoticeCard from './NoticeCard'

interface NoticeRow {
  property: Property
  urgency: UrgencyInfo
}

const REGIONS = ['전체', '관악구', '동작구', '마포구', '영등포구', '성동구']
const TYPES = ['전체', '청년매입임대', '행복주택', '공공임대']

export default function HomeNoticeStrip() {
  const [region, setRegion] = useState('전체')
  const [type, setType] = useState('전체')
  const [attempt, setAttempt] = useState(0)
  /** 어떤 조건의 결과인지 함께 담아, 로딩 여부를 파생값으로 계산한다 */
  const [result, setResult] = useState<{ key: string; rows: NoticeRow[]; error: string | null } | null>(null)

  const key = `${region}|${type}|${attempt}`
  const loading = result?.key !== key
  const rows = result?.rows ?? []
  const error = result?.key === key ? result.error : null

  useEffect(() => {
    let alive = true
    const params = new URLSearchParams({ limit: '3' })
    if (region !== '전체') params.set('region', region)
    if (type !== '전체') params.set('housingType', type)

    fetch(`/api/notices?${params}`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('불러오지 못했어요'))))
      .then((data: { notices: NoticeRow[] }) => {
        if (alive) setResult({ key, rows: data.notices, error: null })
      })
      .catch((err: unknown) => {
        if (alive) {
          setResult({ key, rows: [], error: err instanceof Error ? err.message : '불러오지 못했어요' })
        }
      })
    return () => {
      alive = false
    }
  }, [region, type, key])

  return (
    <section className="cs-wrap cs-section">
      {/* 홈 섹션은 01부터 번호가 이어진다 */}
      <div className="cs-sec-head">
        <span className="cs-sec-index">01</span>
        <div className="cs-sec-head__body">
          <h2 className="cs-section-title">지금 살펴볼 모집공고</h2>
          <p className="cs-sub" style={{ marginTop: 12 }}>
            접수 마감이 가까운 순으로 보여드려요.
          </p>
        </div>
        <Link href="/notices" className="cs-btn cs-btn--text" style={{ flexShrink: 0 }}>
          모두 보기
        </Link>
      </div>

      <div className="cs-badge-row" style={{ margin: '24px 0 12px' }}>
        {REGIONS.map(r => (
          <button
            key={r}
            type="button"
            className="cs-badge"
            style={
              region === r
                ? { background: 'var(--brand)', color: '#fff', border: 0, cursor: 'pointer', minHeight: 44, padding: '0 16px' }
                : { border: '1px solid var(--line)', background: '#fff', cursor: 'pointer', minHeight: 44, padding: '0 16px' }
            }
            onClick={() => setRegion(r)}
            aria-pressed={region === r}
          >
            {r}
          </button>
        ))}
      </div>
      <div className="cs-badge-row" style={{ marginBottom: 28 }}>
        {TYPES.map(t => (
          <button
            key={t}
            type="button"
            className="cs-badge"
            style={
              type === t
                ? { background: 'var(--title)', color: '#fff', border: 0, cursor: 'pointer', minHeight: 44, padding: '0 16px' }
                : { border: '1px solid var(--line)', background: '#fff', cursor: 'pointer', minHeight: 44, padding: '0 16px' }
            }
            onClick={() => setType(t)}
            aria-pressed={type === t}
          >
            {t}
          </button>
        ))}
      </div>

      {/* 로딩과 0건은 다른 상태다 */}
      {loading ? (
        <div className="cs-notice-grid">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="cs-skel" style={{ height: 300 }} />
          ))}
        </div>
      ) : error ? (
        <div className="cs-error">
          <span>{error}</span>
          <button className="cs-btn cs-btn--sm cs-btn--ghost" onClick={() => setAttempt(a => a + 1)}>
            다시 시도
          </button>
        </div>
      ) : rows.length === 0 ? (
        <div className="cs-empty">
          <div className="cs-empty__title">선택하신 조건의 모집공고가 없어요</div>
          <p className="cs-empty__desc">지역이나 유형을 바꿔서 다시 살펴보세요.</p>
        </div>
      ) : (
        <div className="cs-notice-grid">
          {rows.map((row, i) => (
            <NoticeCard
              key={row.property.id}
              index={i}
              property={row.property}
              candidate={{
                propertyId: row.property.id,
                fit: { regionScore: 0, areaScore: null, housingTypeScore: 0, preferenceScore: 0 },
                // 조건 없이 둘러보는 화면이라 예산을 비교하지 않았다는 뜻이다
                budget: {
                  depositOver: 0,
                  rentOver: 0,
                  depositRoom: 0,
                  rentRoom: 0,
                  withinBudget: true,
                  unverified: [],
                },
                urgency: row.urgency,
                eligibility: 'UNKNOWN',
                confidence: 'PARTIAL' as const,
                reasons: [],
                cautions: ['소득·자산·거주기간 등 자격요건은 아직 확인하지 않았습니다'],
                tier: 'PRIMARY',
                excludedBy: [],
              }}
              showReasons={false}
            />
          ))}
        </div>
      )}

      <p className="cs-note" style={{ marginTop: 18 }}>
        표시된 임대 공고는 서비스 구성을 보여드리기 위한 예시 데이터입니다.
      </p>
    </section>
  )
}
