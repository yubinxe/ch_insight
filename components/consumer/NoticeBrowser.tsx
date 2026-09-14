'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { UrgencyInfo } from '@/lib/crm/services/scoring'
import type { Property } from '@/lib/crm/types'
import { HOUSING_TYPES } from '@/lib/crm/types'
import NoticeCard from './NoticeCard'

interface Row {
  property: Property
  urgency: UrgencyInfo
}

const REGIONS = ['전체', '관악구', '동작구', '마포구', '영등포구', '성동구', '송파구', '서초구', '강남구']

export default function NoticeBrowser() {
  const [region, setRegion] = useState('전체')
  const [type, setType] = useState('전체')
  const [nonce, setNonce] = useState(0)
  const [result, setResult] = useState<{ key: string; rows: Row[]; error: string | null } | null>(null)

  const key = `${region}|${type}|${nonce}`
  const loading = result?.key !== key
  const rows = result?.rows ?? []
  const error = result?.key === key ? result.error : null

  useEffect(() => {
    let alive = true
    const params = new URLSearchParams({ limit: '30' })
    if (region !== '전체') params.set('region', region)
    if (type !== '전체') params.set('housingType', type)

    fetch(`/api/notices?${params}`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('공고를 불러오지 못했어요.'))))
      .then((json: { notices: Row[] }) => {
        if (alive) setResult({ key, rows: json.notices, error: null })
      })
      .catch((err: unknown) => {
        if (alive) {
          setResult({
            key,
            rows: [],
            error: err instanceof Error ? err.message : '공고를 불러오지 못했어요.',
          })
        }
      })

    return () => {
      alive = false
    }
  }, [region, type, key])

  const chip = (active: boolean) => ({
    minHeight: 44,
    padding: '0 16px',
    cursor: 'pointer',
    border: active ? '0' : '1px solid var(--line)',
    background: active ? 'var(--brand)' : '#fff',
    color: active ? '#fff' : 'var(--body)',
  })

  return (
    <div className="cs-wrap" style={{ paddingTop: 44 }}>
      <h1 className="cs-page-title">모집 중인 공고</h1>
      <p className="cs-sub" style={{ marginTop: 12 }}>
        접수 마감이 가까운 순으로 보여드려요.{' '}
        <Link href="/analyze" className="cs-btn cs-btn--text" style={{ padding: 0 }}>
          내 조건으로 좁혀보기
        </Link>
      </p>

      <div className="cs-badge-row" style={{ margin: '26px 0 10px' }}>
        {REGIONS.map(r => (
          <button
            key={r}
            type="button"
            className="cs-badge"
            style={chip(region === r)}
            onClick={() => setRegion(r)}
            aria-pressed={region === r}
          >
            {r}
          </button>
        ))}
      </div>
      <div className="cs-badge-row" style={{ marginBottom: 30 }}>
        {['전체', ...HOUSING_TYPES].map(t => (
          <button
            key={t}
            type="button"
            className="cs-badge"
            style={{ ...chip(type === t), background: type === t ? 'var(--title)' : '#fff' }}
            onClick={() => setType(t)}
            aria-pressed={type === t}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="cs-notice-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="cs-skel" style={{ height: 300 }} />
          ))}
        </div>
      ) : error ? (
        <div className="cs-error">
          <span>{error}</span>
          <button className="cs-btn cs-btn--sm cs-btn--ghost" onClick={() => setNonce(n => n + 1)}>
            다시 시도
          </button>
        </div>
      ) : rows.length === 0 ? (
        <div className="cs-empty">
          <div className="cs-empty__title">선택하신 조건의 공고가 없어요</div>
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
                fit: { regionScore: 0, areaScore: 0, housingTypeScore: 0, preferenceScore: 0 },
                budget: { depositOver: 0, rentOver: 0, depositRoom: 0, rentRoom: 0, withinBudget: true },
                urgency: row.urgency,
                eligibility: 'UNKNOWN',
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

      <p className="cs-note" style={{ marginTop: 24 }}>
        표시된 임대 공고는 서비스 구성을 보여드리기 위한 예시 데이터입니다.
      </p>
    </div>
  )
}
