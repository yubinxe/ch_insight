'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Card, CardHead } from '@/components/ui'
import {
  Chip,
  Empty,
  ErrorBox,
  PageHead,
  ScoreBadge,
  ScoreBars,
  TableSkeleton,
} from './primitives'
import { shortDate, useSnapshot, won } from './useSnapshot'
import { createApplicationReq } from '@/lib/crm/client'

export default function MatchesView() {
  const { data, loading, error, reload } = useSnapshot()
  const [openId, setOpenId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [minScore, setMinScore] = useState(70)

  const customerById = useMemo(() => new Map((data?.customers ?? []).map(c => [c.id, c])), [data])
  const propertyById = useMemo(() => new Map((data?.properties ?? []).map(p => [p.id, p])), [data])
  const appliedKeys = useMemo(
    () => new Set((data?.applications ?? []).map(a => `${a.customerId}|${a.propertyId}`)),
    [data],
  )

  const rows = useMemo(
    () => (data?.matches ?? []).filter(m => m.opportunityScore >= minScore),
    [data, minScore],
  )

  const apply = async (customerId: string, propertyId: string, key: string) => {
    setBusyId(key)
    setActionError(null)
    try {
      await createApplicationReq(customerId, propertyId)
      await reload()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '지원 Pipeline 생성 실패')
    } finally {
      setBusyId(null)
    }
  }

  if (error) {
    return (
      <>
        <PageHead title="추천 랭킹" />
        <ErrorBox message={error} onRetry={reload} />
      </>
    )
  }

  return (
    <>
      <PageHead
        title="추천 랭킹"
        sub="공실·신규공고 이벤트가 발생할 때 실행된 매칭 결과입니다. 점수는 당첨확률이 아니라 지원 우선순위입니다."
        right={
          <div style={{ display: 'flex', gap: 6 }}>
            {[70, 80, 90].map(s => (
              <button
                key={s}
                type="button"
                className="an-toggle"
                data-on={minScore === s ? 'true' : 'false'}
                onClick={() => setMinScore(s)}
              >
                {s}점 이상
              </button>
            ))}
          </div>
        }
      />

      {actionError && (
        <div style={{ marginBottom: 16 }}>
          <ErrorBox message={actionError} />
        </div>
      )}

      <Card>
        <CardHead title={`매칭 ${rows.length}건`} sub="Opportunity Score 순" />

        {loading ? (
          <TableSkeleton rows={8} />
        ) : rows.length === 0 ? (
          <Empty>
            아직 매칭 결과가 없습니다.
            <br />
            <Link href="/dashboard" className="link-ink">운영 대시보드</Link>에서 공실 이벤트를 발생시키면
            매칭 엔진이 실행됩니다.
          </Empty>
        ) : (
          <div className="crm-table-wrap">
            <table className="crm-table">
              <thead>
                <tr>
                  <th className="num">순위</th>
                  <th>고객</th>
                  <th>주택</th>
                  <th>추천 사유</th>
                  <th className="num">Score</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((m, i) => {
                  const c = customerById.get(m.customerId)
                  const p = propertyById.get(m.propertyId)
                  const key = `${m.customerId}|${m.propertyId}`
                  const already = appliedKeys.has(key)
                  return (
                    <tr key={m.id}>
                      <td className="num muted">{i + 1}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600 }}>{c?.name ?? m.customerId}</div>
                        <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>{m.customerId}</div>
                      </td>
                      <td style={{ minWidth: 170 }}>
                        <div style={{ fontWeight: 550 }}>{p?.name ?? m.propertyId}</div>
                        <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>
                          {p ? `${p.region} · ${p.area}㎡ · ${won(p.deposit)}/${p.monthlyRent}만 · ~${shortDate(p.applicationEnd)}` : ''}
                        </div>
                      </td>
                      <td style={{ maxWidth: 420, fontSize: 13, lineHeight: 1.55 }}>
                        {m.reason}
                        {openId === m.id && (
                          <div style={{ marginTop: 12 }}>
                            <ScoreBars breakdown={m} />
                          </div>
                        )}
                      </td>
                      <td className="num"><ScoreBadge score={m.opportunityScore} /></td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="crm-btn crm-btn--sm"
                            onClick={() => setOpenId(openId === m.id ? null : m.id)}
                          >
                            {openId === m.id ? '접기' : '점수'}
                          </button>
                          {already ? (
                            <Chip tone="pos">지원 생성됨</Chip>
                          ) : (
                            <button
                              type="button"
                              className="crm-btn crm-btn--sm crm-btn--primary"
                              onClick={() => apply(m.customerId, m.propertyId, key)}
                              disabled={busyId === key}
                            >
                              {busyId === key ? '생성 중' : '지원 시작'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  )
}
