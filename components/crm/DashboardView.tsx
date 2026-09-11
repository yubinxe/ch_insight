'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { Card, CardHead } from '@/components/ui'
import {
  Chip,
  DemoFlag,
  Drawer,
  Empty,
  ErrorBox,
  KeyValues,
  PageHead,
  ScoreBadge,
  ScoreBars,
  Section,
  Stat,
  TableSkeleton,
} from './primitives'
import { clockTime, ddayLabel, shortDate, useSnapshot, won } from './useSnapshot'
import { resetDemo, triggerVacancy, type TriggerResponse } from '@/lib/crm/client'
import { STAGE_LABEL } from '@/lib/crm/types'

const KIND_LABEL: Record<string, string> = {
  EVENT: 'EVENT',
  MATCH: 'MATCH',
  SCORE: 'SCORE',
  NOTIFICATION: 'ALERT',
  APPLICATION: 'PIPELINE',
  TASK: 'SCHEDULE',
  SYSTEM: 'SYSTEM',
}

export default function DashboardView() {
  const { data, loading, error, reload } = useSnapshot()
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [result, setResult] = useState<TriggerResponse | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const onTrigger = useCallback(async () => {
    setBusy(true)
    setActionError(null)
    try {
      const res = await triggerVacancy()
      setResult(res)
      setDrawerOpen(true)
      setFlash(true)
      setTimeout(() => setFlash(false), 1200)
      await reload()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '이벤트 처리에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }, [reload])

  const onReset = useCallback(async () => {
    setBusy(true)
    setActionError(null)
    try {
      await resetDemo()
      setResult(null)
      await reload()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '초기화에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }, [reload])

  if (error) {
    return (
      <>
        <PageHead title="운영 대시보드" />
        <ErrorBox message={error} onRetry={reload} />
      </>
    )
  }

  if (loading || !data) {
    return (
      <>
        <PageHead title="운영 대시보드" sub="데이터를 불러오는 중입니다." />
        <div className="crm-stat-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="crm-skel" style={{ height: 104 }} />
          ))}
        </div>
        <Card>
          <TableSkeleton />
        </Card>
      </>
    )
  }

  const { kpi, funnel, activity, upcomingTasks, notifications, notificationAdapter } = data
  const propertyById = new Map(data.properties.map(p => [p.id, p]))
  const customerById = new Map(data.customers.map(c => [c.id, c]))
  const latestNotification = notifications[0]
  const funnelMax = Math.max(...funnel.map(f => f.value), 1)

  return (
    <>
      <PageHead
        title="운영 대시보드"
        sub="공실 탐지 → 고객 매칭 → 우선순위 판단 → 알림 → 지원 Pipeline → 일정까지 한 화면에서 확인합니다."
        right={
          <>
            <button className="crm-btn" onClick={onReset} disabled={busy}>
              데모 초기화
            </button>
            <button className="crm-btn crm-btn--accent" onClick={onTrigger} disabled={busy}>
              {busy ? '처리 중…' : '공실 이벤트 발생'}
            </button>
          </>
        }
      />

      {actionError && (
        <div style={{ marginBottom: 16 }}>
          <ErrorBox message={actionError} onRetry={onTrigger} />
        </div>
      )}

      <div className="crm-stat-grid">
        <Stat label="등록 고객" value={kpi.customers} unit="명" hint="조건이 저장된 CRM 고객" />
        <Stat label="관리 주택" value={kpi.properties} unit="건" hint="공고·공실 감시 대상" />
        <Stat label="현재 공실" value={kpi.currentVacancy} unit="건" hot={kpi.currentVacancy > 0} live={flash} />
        <Stat label="오늘 신규 이벤트" value={kpi.newVacancyToday} unit="건" live={flash} hint="합성 공실 이벤트" />
        <Stat label="추천대상 고객" value={kpi.matchedCustomers} unit="명" live={flash} hint="Score 70점 이상" />
        <Stat label="지원 진행중" value={kpi.activeApplications} unit="건" hint={`재지원 ${kpi.repeatApplicants}명 · ${kpi.repeatRate}%`} />
      </div>

      <div className="crm-2col">
        <Card>
          <CardHead
            title="Event Stream"
            sub="Detection → Matching → CRM → Action"
            right={<DemoFlag />}
          />
          {activity.length === 0 ? (
            <Empty>
              아직 이벤트가 없습니다.
              <br />
              상단의 <strong>공실 이벤트 발생</strong> 버튼으로 전체 Workflow를 확인하세요.
            </Empty>
          ) : (
            <div className="crm-stream">
              {activity.map(a => (
                <div key={a.id} className="crm-stream__row">
                  <span className="crm-stream__time">{clockTime(a.at)}</span>
                  <span className="crm-stream__dot" data-kind={a.kind} />
                  <span className="crm-stream__msg">
                    <span className="crm-stream__kind">{KIND_LABEL[a.kind] ?? a.kind}</span>
                    {a.message}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div style={{ display: 'grid', gap: 'var(--gap)' }}>
          <Card>
            <CardHead title="North Star 퍼널" sub="가장 중요한 지표는 2회 이상 반복지원률" />
            <div className="crm-funnel">
              {funnel.map(step => (
                <div key={step.key} className="crm-funnel__row" title={step.hint}>
                  <span className="crm-funnel__label">{step.label}</span>
                  <span className="crm-funnel__track">
                    <span
                      className="crm-funnel__fill"
                      data-star={step.key === 'repeat' ? 'true' : 'false'}
                      style={{ width: `${Math.max(3, (step.value / funnelMax) * 100)}%` }}
                    />
                  </span>
                  <span className="crm-funnel__val">{step.value}</span>
                </div>
              ))}
            </div>
            <div className="crm-note" style={{ marginTop: 16 }}>
              반복지원률 <strong>{kpi.repeatRate}%</strong> — 지원 이력이 남아 있어 두 번째 지원부터는
              조건 입력과 공고 탐색 단계를 건너뜁니다.
            </div>
          </Card>

          <Card>
            <CardHead
              title="최근 생성된 알림"
              sub={notificationAdapter.label}
              right={
                latestNotification ? (
                  <Chip tone={latestNotification.status === 'SENT' ? 'pos' : 'warn'}>
                    {latestNotification.status === 'SENT' ? '발송 완료' : '발송 대기(미리보기)'}
                  </Chip>
                ) : undefined
              }
            />
            {!latestNotification ? (
              <Empty>공실 이벤트가 발생하면 최적 고객에게 보낼 알림이 여기에 생성됩니다.</Empty>
            ) : (
              <>
                <div className="kakao-head">
                  <Chip tone="accent">
                    {customerById.get(latestNotification.customerId)?.name ?? latestNotification.customerId} 대상
                  </Chip>
                  <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{clockTime(latestNotification.createdAt)}</span>
                </div>
                <div className="kakao-preview">{latestNotification.body}</div>
                {latestNotification.detail && (
                  <div className="crm-note" style={{ marginTop: 12 }}>{latestNotification.detail}</div>
                )}
              </>
            )}
          </Card>
        </div>
      </div>

      <div style={{ marginTop: 'var(--gap)' }}>
        <Card>
          <CardHead
            title="마감 임박 일정"
            sub="지원 Pipeline에서 자동 생성된 Task"
            right={<Link href="/applications" className="crm-btn crm-btn--sm">전체 보기</Link>}
          />
          {upcomingTasks.length === 0 ? (
            <Empty>진행 중인 지원 일정이 없습니다.</Empty>
          ) : (
            <div className="crm-table-wrap">
              <table className="crm-table">
                <thead>
                  <tr>
                    <th>고객</th>
                    <th>주택</th>
                    <th>할 일</th>
                    <th>마감일</th>
                    <th className="num">D-Day</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingTasks.map(t => (
                    <tr key={t.id}>
                      <td>{t.customerName}</td>
                      <td className="muted">{t.propertyName}</td>
                      <td>{t.title}</td>
                      <td className="muted">{t.dueDate ?? '날짜 미정'}</td>
                      <td className="num">
                        {t.dueDate === null ? (
                          <Chip>일정 미정</Chip>
                        ) : (
                          <Chip tone={t.dday !== null && t.dday <= 3 ? 'hot' : t.dday !== null && t.dday <= 7 ? 'warn' : 'default'}>
                            {ddayLabel(t.dday)}
                          </Chip>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <Drawer
        open={drawerOpen && !!result}
        onClose={() => setDrawerOpen(false)}
        title={result ? `신규 공실 감지 — ${result.property.id}` : ''}
        subtitle={result ? `${result.property.name} · 공실 ${result.event.previousVacancy} → ${result.event.currentVacancy}` : ''}
      >
        {result && (
          <>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Chip tone="hot">{result.event.eventType}</Chip>
              <Chip>{result.property.housingType}</Chip>
              <Chip>{result.property.region}</Chip>
              <DemoFlag label="Synthetic Event" />
            </div>

            <KeyValues
              items={[
                { k: '전용면적', v: `${result.property.area}㎡` },
                { k: '공급세대', v: `${result.property.supplyCount}세대` },
                { k: '보증금', v: `${won(result.property.deposit)}원` },
                { k: '월 임대료', v: `${result.property.monthlyRent}만원` },
                { k: '접수 기간', v: `${shortDate(result.property.applicationStart)} ~ ${shortDate(result.property.applicationEnd)}` },
                { k: '결과 발표', v: result.property.resultDate ?? '미정' },
              ]}
            />

            <Section title={`조건 일치 고객 ${result.matches.length}명`}>
              {result.matches.length === 0 ? (
                <Empty>조건이 일치하는 고객이 없습니다.</Empty>
              ) : (
                <div className="crm-table-wrap" style={{ margin: 0, padding: 0 }}>
                  <table className="crm-table">
                    <thead>
                      <tr>
                        <th>고객</th>
                        <th>희망지역</th>
                        <th className="num">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.matches.slice(0, 8).map(m => {
                        const c = customerById.get(m.customerId)
                        return (
                          <tr key={m.id}>
                            <td>
                              {c?.name ?? m.customerId}
                              <span className="muted"> · {m.customerId}</span>
                            </td>
                            <td className="muted">{c?.preferredRegions.join(', ') ?? '-'}</td>
                            <td className="num"><ScoreBadge score={m.opportunityScore} /></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>

            {result.topCustomer && result.matches[0] && (
              <Section title={`최우선 대상 · ${result.topCustomer.name} (${result.topCustomer.id})`}>
                <ScoreBars breakdown={result.matches[0]} />
                <div className="crm-note" style={{ marginTop: 12 }}>{result.matches[0].reason}</div>
              </Section>
            )}

            {result.notification && (
              <Section
                title="생성된 카카오 알림"
                right={
                  <Chip tone={result.notification.status === 'SENT' ? 'pos' : 'warn'}>
                    {result.notification.status === 'SENT' ? '발송 완료' : '미리보기'}
                  </Chip>
                }
              >
                <div className="kakao-preview">{result.notification.body}</div>
                {result.notification.detail && (
                  <div className="crm-note" style={{ marginTop: 10 }}>{result.notification.detail}</div>
                )}
              </Section>
            )}

            {result.application && (
              <Section title="자동 생성된 지원 Pipeline">
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                  <Chip tone="accent">{STAGE_LABEL[result.application.stage]}</Chip>
                  <Chip>Task {result.tasks.length}건</Chip>
                  {result.tasks.some(t => t.status === 'PENDING_DATE') && (
                    <Chip tone="warn">
                      날짜 미정 {result.tasks.filter(t => t.status === 'PENDING_DATE').length}건
                    </Chip>
                  )}
                </div>
                <div className="crm-table-wrap" style={{ margin: 0, padding: 0 }}>
                  <table className="crm-table">
                    <tbody>
                      {result.tasks.map(t => (
                        <tr key={t.id}>
                          <td>{t.title}</td>
                          <td className="num muted">{t.dueDate ?? 'date pending'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <Link href="/matches" className="crm-btn crm-btn--sm">추천 랭킹</Link>
              <Link href="/applications" className="crm-btn crm-btn--sm">지원 관리</Link>
              {result.topCustomer && (
                <Link href={`/customers?focus=${result.topCustomer.id}`} className="crm-btn crm-btn--sm">
                  고객 상세
                </Link>
              )}
            </div>
          </>
        )}
      </Drawer>

      {propertyById.size === 0 && <Empty>주택 데이터가 없습니다.</Empty>}
    </>
  )
}
