'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { UrgencyInfo } from '@/lib/crm/services/scoring'
import type { Property } from '@/lib/crm/types'
import NoticeCard from './NoticeCard'
import { useConsumer } from './ConsumerProvider'

interface Row {
  property: Property
  urgency: UrgencyInfo
}

/** 목록 카드에 쓸 중립 후보 — 개인 판정 없이 상태만 보여준다 */
function neutral(propertyId: string, urgency: UrgencyInfo) {
  return {
    propertyId,
    fit: { regionScore: 0, areaScore: 0, housingTypeScore: 0, preferenceScore: 0 },
    budget: { depositOver: 0, rentOver: 0, depositRoom: 0, rentRoom: 0, withinBudget: true },
    urgency,
    eligibility: 'UNKNOWN' as const,
    reasons: [],
    cautions: ['소득·자산·거주기간 등 자격요건은 아직 확인하지 않았습니다'],
    tier: 'PRIMARY' as const,
    excludedBy: [] as never[],
  }
}

export default function SavedView() {
  const { savedIds, alerts, user, profile, loading: meLoading, refresh } = useConsumer()
  const [result, setResult] = useState<{ key: string; rows: Row[] } | null>(null)

  const key = savedIds.join(',')
  const loading = result?.key !== key
  const rows = result?.rows ?? []

  useEffect(() => {
    if (meLoading) return
    let alive = true

    Promise.all(
      savedIds.map(id =>
        fetch(`/api/notices/${id}`, { cache: 'no-store' })
          .then(r => (r.ok ? r.json() : null))
          .catch(() => null),
      ),
    )
      .then(results => {
        if (!alive) return
        const sorted = (results.filter(r => r && r.property) as Row[]).sort(
          (a, b) => (a.urgency.daysLeft ?? 9999) - (b.urgency.daysLeft ?? 9999),
        )
        setResult({ key, rows: sorted })
      })

    return () => {
      alive = false
    }
  }, [key, meLoading, savedIds])

  const removeAlert = async (alertId: string) => {
    await fetch('/api/alerts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alertId }),
    })
    await refresh()
  }

  return (
    <div className="cs-wrap" style={{ paddingTop: 44 }}>
      <h1 className="cs-page-title">관심공고</h1>
      <p className="cs-sub" style={{ marginTop: 12 }}>
        {user
          ? `${user.nickname}님이 저장하신 공고예요.`
          : '저장하신 공고예요. 이메일을 남기면 다른 기기에서도 볼 수 있어요.'}
      </p>

      {alerts.length > 0 && (
        <section style={{ marginTop: 32 }}>
          <h2 className="cs-section-title" style={{ fontSize: 22 }}>
            받고 있는 알림
          </h2>
          <div className="cs-stack" style={{ marginTop: 16 }}>
            {alerts.map(a => (
              <div
                key={a.id}
                className="cs-card cs-card--flat"
                style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}
              >
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--title)' }}>
                    {a.scope === 'NEW_NOTICE' ? '조건에 맞는 새 공고' : '관심공고 마감 알림'}
                  </div>
                  <div className="cs-note" style={{ marginTop: 4 }}>
                    {a.scope === 'NEW_NOTICE' && a.profile ? `${a.profile.regions.join(' · ')} · ` : ''}
                    이메일 · {new Date(a.consentedAt).toLocaleDateString('ko-KR')} 동의
                  </div>
                </div>
                <button className="cs-btn cs-btn--sm cs-btn--ghost" onClick={() => removeAlert(a.id)}>
                  해제
                </button>
              </div>
            ))}
          </div>
          <p className="cs-note" style={{ marginTop: 14 }}>
            알림 발송 기능은 아직 연결 전입니다. 지금은 동의하신 내용만 저장하고 실제로 보내지 않습니다.
          </p>
        </section>
      )}

      <section style={{ marginTop: 40 }}>
        <h2 className="cs-section-title" style={{ fontSize: 22 }}>
          저장한 공고 {savedIds.length}건
        </h2>

        {meLoading || loading ? (
          <div className="cs-notice-grid" style={{ marginTop: 20 }}>
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="cs-skel" style={{ height: 300 }} />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="cs-empty">
            <div className="cs-empty__title">아직 저장한 공고가 없어요</div>
            <p className="cs-empty__desc">마음에 드는 공고의 하트를 누르면 여기에 모아둘 수 있어요.</p>
            <div
              style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 24, flexWrap: 'wrap' }}
            >
              <Link href={profile ? '/results' : '/analyze'} className="cs-btn cs-btn--primary">
                {profile ? '내 후보 보기' : '내 조건으로 공고 찾기'}
              </Link>
              <Link href="/notices" className="cs-btn cs-btn--ghost">
                공고 둘러보기
              </Link>
            </div>
          </div>
        ) : (
          <div className="cs-notice-grid" style={{ marginTop: 20 }}>
            {rows.map((row, i) => (
              <NoticeCard
                key={row.property.id}
                index={i}
                property={row.property}
                candidate={neutral(row.property.id, row.urgency)}
                showReasons={false}
              />
            ))}
          </div>
        )}
      </section>

      {!user && savedIds.length > 0 && (
        <div className="cs-card" style={{ marginTop: 32 }}>
          <p style={{ margin: 0, fontSize: 16, color: 'var(--body)' }}>
            지금은 이 브라우저에만 저장돼 있어요. 이메일을 남기면 다른 기기에서도 이어서 볼 수 있습니다.
          </p>
        </div>
      )}
    </div>
  )
}
