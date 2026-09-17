'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { Candidate, UrgencyInfo } from '@/lib/crm/services/scoring'
import { formatMan } from '@/lib/crm/services/scoring'
import type { Property, Task } from '@/lib/crm/types'
import { statusBadge } from './NoticeCard'
import SaveButton from './SaveButton'
import { useConsumer } from './ConsumerProvider'
import { useSignupGate } from './SignupGate'

interface DetailResponse {
  property: Property
  urgency: UrgencyInfo
  candidate: Candidate | null
  schedule: Task[]
}

export default function NoticeDetail({ id }: { id: string }) {
  const { alerts } = useConsumer()
  const gate = useSignupGate()
  const [data, setData] = useState<DetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    fetch(`/api/notices/${id}`, { cache: 'no-store' })
      .then(async r => {
        if (r.status === 404) throw new Error('공고를 찾을 수 없어요.')
        if (!r.ok) throw new Error('공고를 불러오지 못했어요.')
        return r.json()
      })
      .then((json: DetailResponse) => {
        if (alive) setData(json)
      })
      .catch((err: unknown) => {
        if (alive) setError(err instanceof Error ? err.message : '공고를 불러오지 못했어요.')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [id])

  if (loading) {
    return (
      <div className="cs-wrap" style={{ paddingTop: 44, maxWidth: 860 }}>
        <div className="cs-skel" style={{ height: 40, width: '60%', marginBottom: 20 }} />
        <div className="cs-skel" style={{ height: 260 }} />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="cs-wrap" style={{ paddingTop: 64, maxWidth: 620 }}>
        <div className="cs-empty">
          <div className="cs-empty__title">{error ?? '공고를 불러오지 못했어요'}</div>
          <Link href="/notices" className="cs-btn cs-btn--primary" style={{ marginTop: 24 }}>
            공고 목록으로
          </Link>
        </div>
      </div>
    )
  }

  const { property, urgency, candidate, schedule } = data
  /**
   * 예시 공고인가.
   *
   * 화면이 이 값을 읽지 않고 늘 '예시 데이터' 를 찍고 있었다. 청약홈에서
   * 받아온 진짜 공고에도 붙어, 가장 믿어야 할 자리에서 서비스가 스스로를
   * 의심하게 만들었다.
   */
  const isSample = property.dataOrigin !== 'OFFICIAL'
  const badge = statusBadge(urgency)
  const closed = urgency.level === 'CLOSED'
  const hasDeadlineAlert = alerts.some(a => a.scope === 'DEADLINE' && a.propertyId === property.id)

  const official = schedule.filter(t => t.source === 'OFFICIAL')
  const recommended = schedule.filter(t => t.source === 'RECOMMENDED')

  return (
    <div className="cs-wrap" style={{ paddingTop: 32, maxWidth: 860 }}>
      <Link href="/results" className="cs-btn cs-btn--text" style={{ paddingLeft: 0, marginBottom: 12 }}>
        ← 후보 목록으로
      </Link>

      <div className="cs-badge-row" style={{ marginBottom: 14 }}>
        <span className="cs-badge cs-badge--brand">{property.housingType}</span>
        <span className={`cs-badge ${badge.cls}`}>{badge.text}</span>
        {/* 예시일 때만 예시라고 적는다. 예전에는 조건 없이 늘 찍혀서, 청약홈에서
            받아온 진짜 공고에도 '예시 데이터' 가 붙어 있었다. 데이터를 의심하게
            만드는 표시는 틀렸을 때 가장 비싸다. */}
        {isSample ? (
          <span className="cs-sample">예시 데이터</span>
        ) : (
          <span className="cs-badge">{property.source}</span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="cs-page-title">{property.name}</h1>
          <p className="cs-sub" style={{ marginTop: 10 }}>
            {property.address}
          </p>
        </div>
        <SaveButton propertyId={property.id} />
      </div>

      {/* 비용 */}
      <div className="cs-card" style={{ marginTop: 28 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 24 }}>
          <div>
            <div className="cs-note">보증금</div>
            <div className="cs-num" style={{ fontSize: 26, fontWeight: 700, color: 'var(--title)', marginTop: 6 }}>
              {property.deposit === null ? (
                <span style={{ fontSize: 17, fontWeight: 600, color: 'var(--muted)' }}>공고문 확인</span>
              ) : (
                formatMan(property.deposit)
              )}
            </div>
          </div>
          <div>
            <div className="cs-note">월 임대료</div>
            <div className="cs-num" style={{ fontSize: 26, fontWeight: 700, color: 'var(--title)', marginTop: 6 }}>
              {property.monthlyRent === null ? (
                <span style={{ fontSize: 17, fontWeight: 600, color: 'var(--muted)' }}>공고문 확인</span>
              ) : (
                `${property.monthlyRent.toLocaleString()}만원`
              )}
            </div>
          </div>
          <div>
            <div className="cs-note">전용면적</div>
            <div className="cs-num" style={{ fontSize: 26, fontWeight: 700, color: 'var(--title)', marginTop: 6 }}>
              {property.area === null ? (
                <span style={{ fontSize: 17, fontWeight: 600, color: 'var(--muted)' }}>공고문 확인</span>
              ) : (
                `${property.area}㎡`
              )}
            </div>
          </div>
          <div>
            <div className="cs-note">공급 세대</div>
            <div className="cs-num" style={{ fontSize: 26, fontWeight: 700, color: 'var(--title)', marginTop: 6 }}>
              {property.supplyCount}세대
            </div>
          </div>
        </div>

        {candidate && (candidate.budget.depositOver > 0 || candidate.budget.rentOver > 0) && (
          <div className="cs-notice__caution" style={{ marginTop: 20 }}>
            입력하신 예산보다
            {candidate.budget.depositOver > 0 && ` 보증금 ${formatMan(candidate.budget.depositOver)}`}
            {candidate.budget.rentOver > 0 && ` 월세 ${candidate.budget.rentOver}만원`} 높습니다.
          </div>
        )}
      </div>

      {/* 내 조건과의 비교 */}
      {candidate && (
        <section style={{ marginTop: 32 }}>
          <h2 className="cs-section-title" style={{ fontSize: 24 }}>
            내 조건과 비교하면
          </h2>
          <div className="cs-card" style={{ marginTop: 18 }}>
            {candidate.reasons.length > 0 && (
              <ul className="cs-notice__reasons" style={{ marginTop: 0 }}>
                {candidate.reasons.map(r => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            )}
            <div style={{ marginTop: candidate.reasons.length ? 20 : 0 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--check)', marginBottom: 10 }}>
                지원 전 확인이 필요한 사항
              </div>
              <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 8 }}>
                {candidate.cautions.map(c => (
                  <li key={c} style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--body)' }}>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* 공식 일정 */}
      <section style={{ marginTop: 32 }}>
        <h2 className="cs-section-title" style={{ fontSize: 24 }}>
          공고 일정{isSample && ' · 예시 데이터'}
        </h2>
        <div className="cs-card" style={{ marginTop: 18 }}>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 2 }}>
            {official.map(t => (
              <li
                key={t.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 16,
                  padding: '14px 0',
                  borderBottom: '1px solid var(--line)',
                }}
              >
                <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--title)' }}>{t.title}</span>
                <span className="cs-num" style={{ fontSize: 16, color: t.dueDate ? 'var(--body)' : 'var(--muted)' }}>
                  {t.dueDate ?? '미정'}{t.status === 'BLOCKED' && ' · 당첨 후 확인'}
                </span>
              </li>
            ))}
          </ul>
          <p className="cs-note" style={{ marginTop: 16 }}>
            시간대: 한국 표준시(Asia/Seoul).{isSample ? ' 예시 일정이며,' : ' 공고문에 적힌 날짜만 싣고,'}{' '}
            공개되지 않은 날짜는 &lsquo;공고 미공개&rsquo;로 표시합니다.
          </p>
        </div>
      </section>

      {/* 준비 권장일 */}
      <section style={{ marginTop: 32 }}>
        <h2 className="cs-section-title" style={{ fontSize: 24 }}>
          이렇게 준비하시면 좋아요
        </h2>
        <p className="cs-sub" style={{ marginTop: 10 }}>
          공식 기한이 아니라 저희가 제안하는 준비 일정입니다.
        </p>
        <div className="cs-card" style={{ marginTop: 18 }}>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 2 }}>
            {recommended.map(t => (
              <li
                key={t.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 16,
                  padding: '14px 0',
                  borderBottom: '1px solid var(--line)',
                }}
              >
                <span>
                  <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--title)' }}>{t.title}</span>
                  {t.hint && (
                    <span style={{ display: 'block', fontSize: 14, color: 'var(--muted)', marginTop: 2 }}>
                      {t.hint}
                    </span>
                  )}
                </span>
                <span className="cs-num" style={{ fontSize: 16, color: t.dueDate ? 'var(--body)' : 'var(--muted)' }}>
                  {t.dueDate ?? '기준일 미정'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 원문 */}
      <section style={{ marginTop: 32 }}>
        <div className="cs-card">
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--title)', marginBottom: 8 }}>공고 원문</div>
          {property.sourceUrl ? (
            <a
              href={property.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="cs-btn cs-btn--ghost cs-btn--sm"
            >
              원문 보기
            </a>
          ) : (
            <p className="cs-sub" style={{ fontSize: 16 }}>
              {isSample
                ? '이 공고는 예시 데이터라 연결할 원문이 없습니다. 실제 공고 연동 시 원문 링크를 함께 제공합니다.'
                : '이 공고는 원문 링크가 공개되지 않았습니다. 공급기관 누리집에서 공고번호로 찾아 주세요.'}
            </p>
          )}
          <p className="cs-note" style={{ marginTop: 12 }}>
            공급기관 {property.source} · 공고번호 {property.announcementId}
          </p>
        </div>
      </section>

      {/* 다음 행동 */}
      <section style={{ marginTop: 32, marginBottom: 24 }}>
        <div className="cs-cta-band">
          {closed ? (
            <>
              <h2 className="cs-section-title" style={{ fontSize: 22 }}>
                이 공고는 접수가 마감됐어요
              </h2>
              <p className="cs-sub" style={{ marginTop: 12 }}>
                같은 조건의 다른 후보를 다시 살펴보세요. 이메일 발송은 아직 연결 전입니다.
              </p>
              <button
                className="cs-btn cs-btn--primary"
                style={{ marginTop: 22 }}
                onClick={() => gate.open({ kind: 'ALERT_NEW', propertyId: null })}
              >
                새 공고 알림 받기
              </button>
            </>
          ) : hasDeadlineAlert ? (
            <>
              <h2 className="cs-section-title" style={{ fontSize: 22 }}>
                마감 알림을 설정했어요
              </h2>
              <p className="cs-sub" style={{ marginTop: 12 }}>
                수신 설정을 저장했어요. 이메일 발송은 아직 연결 전입니다.
              </p>
              <Link href="/saved" className="cs-btn cs-btn--ghost" style={{ marginTop: 22 }}>
                관심공고 보기
              </Link>
            </>
          ) : (
            <>
              <h2 className="cs-section-title" style={{ fontSize: 22 }}>
                이 공고 마감 알림 받기
              </h2>
              <p className="cs-sub" style={{ marginTop: 12 }}>
                {property.applicationEnd
                  ? `접수 마감 ${property.applicationEnd} · 수신 설정만 저장하며 이메일 발송은 연결 전입니다.`
                  : '마감일이 미정입니다. 수신 설정만 저장하며 이메일 발송은 연결 전입니다.'}
              </p>
              <button
                className="cs-btn cs-btn--primary"
                style={{ marginTop: 22 }}
                onClick={() =>
                  gate.open({ kind: 'ALERT_DEADLINE', propertyId: property.id, propertyName: property.name })
                }
              >
                마감 알림 받기
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  )
}
