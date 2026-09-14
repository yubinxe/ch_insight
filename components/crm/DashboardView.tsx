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
  Person,
  ScoreBadge,
  ScoreBars,
  Section,
  Spinner,
  Stat,
  TableSkeleton,
} from './primitives'
import { clockTime, ddayLabel, shortDate, useSnapshot, won } from './useSnapshot'
import { resetDemo, triggerVacancy, type TriggerResponse } from '@/lib/crm/client'
import { STAGE_LABEL } from '@/lib/crm/types'

/** Event Stream 라벨은 한국어 우선 */
const KIND_LABEL: Record<string, string> = {
  EVENT: '공실감지',
  MATCH: '매칭',
  SCORE: '우선순위',
  NOTIFICATION: '알림',
  APPLICATION: '지원생성',
  TASK: '일정생성',
  SYSTEM: '시스템',
}

const GUIDE_STEPS = [
  {
    name: '공실이 생깁니다',
    desc: '버튼을 누르면 관리 중인 주택 한 곳에 빈 집이 생긴 상황을 만듭니다.',
  },
  {
    name: '조건 맞는 고객을 찾습니다',
    desc: '등록된 100명의 저장된 조건과 자동으로 대조해 적합한 사람만 추립니다.',
  },
  {
    name: '알림과 일정까지 만듭니다',
    desc: '가장 적합한 고객에게 보낼 카카오 알림과 지원 일정이 자동 생성됩니다.',
  },
]

export default function DashboardView() {
  const { data, loading, error, reload } = useSnapshot()
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [result, setResult] = useState<TriggerResponse | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [guideOpen, setGuideOpen] = useState(true)

  const onTrigger = useCallback(async () => {
    setBusy(true)
    setActionError(null)
    try {
      const res = await triggerVacancy()
      setResult(res)
      setDrawerOpen(true)
      setFlash(true)
      setTimeout(() => setFlash(false), 1300)
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
            <div key={i} className="crm-skel" style={{ height: 108 }} />
          ))}
        </div>
        <Card>
          <TableSkeleton />
        </Card>
      </>
    )
  }

  const { kpi, funnel, activity, upcomingTasks, notifications, notificationAdapter } = data
  const customerById = new Map(data.customers.map(c => [c.id, c]))
  const latestNotification = notifications[0]
  const funnelMax = Math.max(...funnel.map(f => f.value), 1)
  const hasRun = activity.length > 1

  return (
    <>
      <PageHead
        title="운영 대시보드"
        sub="빈 집이 생긴 순간부터 고객에게 알림이 가고 지원 일정이 잡히기까지, 전 과정을 한 화면에서 봅니다."
        right={
          <>
            <button className="crm-btn" onClick={onReset} disabled={busy}>
              처음 상태로
            </button>
            <button className="crm-btn crm-btn--accent crm-btn--lg" onClick={onTrigger} disabled={busy}>
              {busy ? (
                <>
                  <Spinner />
                  처리 중
                </>
              ) : (
                <>
                  공실 이벤트 발생
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </>
              )}
            </button>
          </>
        }
      />

      {/* 처음 보는 사람에게 버튼이 무슨 일을 하는지 먼저 알려준다 */}
      {guideOpen && !hasRun && (
        <div className="crm-guide">
          <div className="crm-guide__head">
            <div className="crm-guide__title">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 16v-4M12 8h.01" />
              </svg>
              처음이신가요? 오른쪽 위 <strong>공실 이벤트 발생</strong> 버튼을 눌러보세요
            </div>
            <button className="crm-guide__close" onClick={() => setGuideOpen(false)}>
              닫기
            </button>
          </div>
          <div className="crm-guide__steps">
            {GUIDE_STEPS.map((s, i) => (
              <div key={s.name} className="crm-guide__step">
                <span className="crm-guide__num">{i + 1}</span>
                <div>
                  <div className="crm-guide__name">{s.name}</div>
                  <div className="crm-guide__desc">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {actionError && (
        <div style={{ marginBottom: 16 }}>
          <ErrorBox message={actionError} onRetry={onTrigger} />
        </div>
      )}

      <div className="crm-stat-grid">
        <Stat label="등록 고객" value={kpi.customers} unit="명" hint="조건을 저장해 둔 사람" />
        <Stat label="관리 주택" value={kpi.properties} unit="건" hint="공고·공실 감시 중" />
        <Stat
          label="현재 빈 집"
          value={kpi.currentVacancy}
          unit="건"
          hot={kpi.currentVacancy > 0}
          flash={flash}
          hint="지금 지원 가능한 공실"
        />
        <Stat
          label="오늘 새 이벤트"
          value={kpi.newVacancyToday}
          unit="건"
          live
          flash={flash}
          hint="오늘 감지된 공실"
        />
        <Stat
          label="추천 대상 고객"
          value={kpi.matchedCustomers}
          unit="명"
          live
          flash={flash}
          hint="우선순위 70점 이상"
        />
        <Stat
          label="지원 진행중"
          value={kpi.activeApplications}
          unit="건"
          hint={`재지원 ${kpi.repeatApplicants}명 · ${kpi.repeatRate}%`}
        />
      </div>

      <div className="crm-2col">
        <Card>
          <CardHead
            title="지금 일어나는 일"
            sub="공실 감지 → 매칭 → 우선순위 → 알림 → 지원 → 일정"
            right={<DemoFlag />}
            wrapRight
          />
          {activity.length === 0 ? (
            <Empty title="아직 기록이 없습니다" icon="spark">
              위의 <strong>공실 이벤트 발생</strong> 버튼을 누르면
              <br />
              전 과정이 순서대로 여기에 쌓입니다.
            </Empty>
          ) : (
            <div className="crm-stream">
              {activity.map(a => (
                <div key={a.id} className="crm-stream__row">
                  <span className="crm-stream__time">{clockTime(a.at)}</span>
                  <span className="crm-stream__rail">
                    <span className="crm-stream__dot" data-kind={a.kind} />
                  </span>
                  <span className="crm-stream__msg">
                    <span className="crm-stream__kind">{KIND_LABEL[a.kind] ?? a.kind}</span>
                    {a.message}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="crm-stack">
          <Card>
            <CardHead title="고객이 남는 흐름" sub="가장 중요한 건 두 번 이상 지원하는 비율입니다" />
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
              반복지원률 <strong>{kpi.repeatRate}%</strong> — 한 번 저장한 조건과 서류 이력이 남아 있어,
              두 번째 지원부터는 조건 입력과 공고 탐색을 건너뜁니다.
            </div>
          </Card>

          <Card>
            <CardHead
              title="고객에게 갈 알림"
              sub={notificationAdapter.label}
              right={
                latestNotification ? (
                  <Chip tone={latestNotification.status === 'SENT' ? 'pos' : 'warn'} dot>
                    {latestNotification.status === 'SENT' ? '발송 완료' : '발송 대기'}
                  </Chip>
                ) : undefined
              }
              wrapRight
            />
            {!latestNotification ? (
              <Empty title="아직 보낼 알림이 없습니다" icon="bell">
                빈 집이 생기면 가장 적합한 고객에게 보낼
                <br />
                카카오 메시지가 자동으로 만들어집니다.
              </Empty>
            ) : (
              <>
                <div className="kakao-head">
                  <Chip tone="accent">
                    {customerById.get(latestNotification.customerId)?.name ?? latestNotification.customerId} 님에게
                  </Chip>
                  <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                    {clockTime(latestNotification.createdAt)}
                  </span>
                </div>
                <div className="kakao-phone">
                  <div className="kakao-sender">
                    <span className="kakao-avatar">🏠</span>
                    집인사이트
                  </div>
                  <div className="kakao-bubble">{latestNotification.body}</div>
                </div>
                {latestNotification.detail && (
                  <div className="crm-note" style={{ marginTop: 12 }}>
                    {latestNotification.detail}
                  </div>
                )}
              </>
            )}
          </Card>
        </div>
      </div>

      <div style={{ marginTop: 'var(--s5)' }}>
        <Card>
          <CardHead
            title="곧 마감되는 일정"
            sub="지원 건마다 자동으로 만들어진 할 일"
            right={
              <Link href="/applications" className="crm-btn crm-btn--sm">
                전체 보기
              </Link>
            }
            wrapRight
          />
          {upcomingTasks.length === 0 ? (
            <Empty title="다가오는 일정이 없습니다" icon="calendar" />
          ) : (
            <div className="crm-table-wrap">
              <table className="crm-table">
                <thead>
                  <tr>
                    <th>고객</th>
                    <th>주택</th>
                    <th>할 일</th>
                    <th>마감일</th>
                    <th className="num">남은 기간</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingTasks.map(t => (
                    <tr key={t.id}>
                      <td>
                        <Person name={t.customerName} id={t.customerId} />
                      </td>
                      <td className="muted">{t.propertyName}</td>
                      <td>{t.title}</td>
                      <td className="muted tnums">{t.dueDate ?? '날짜 미정'}</td>
                      <td className="num">
                        {t.dueDate === null ? (
                          <Chip>일정 미정</Chip>
                        ) : (
                          <Chip
                            tone={
                              t.dday !== null && t.dday < 0
                                ? 'default'
                                : t.dday !== null && t.dday <= 3
                                  ? 'hot'
                                  : t.dday !== null && t.dday <= 7
                                    ? 'warn'
                                    : 'default'
                            }
                          >
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
        title={result ? `빈 집 발생 — ${result.property.name}` : ''}
        subtitle={
          result
            ? `${result.property.id} · 공실 ${result.event.previousVacancy}건 → ${result.event.currentVacancy}건`
            : ''
        }
      >
        {result && (
          <>
            <div className="crm-chip-row">
              <Chip tone="hot" dot>
                신규 공실 감지
              </Chip>
              <Chip>{result.property.housingType}</Chip>
              <Chip>{result.property.region}</Chip>
              <DemoFlag label="합성 이벤트" />
            </div>

            <KeyValues
              items={[
                { k: '전용면적', v: `${result.property.area}㎡` },
                { k: '공급세대', v: `${result.property.supplyCount}세대` },
                { k: '보증금', v: `${won(result.property.deposit)}원` },
                { k: '월 임대료', v: `${result.property.monthlyRent}만원` },
                {
                  k: '접수 기간',
                  v: `${shortDate(result.property.applicationStart)} ~ ${shortDate(result.property.applicationEnd)}`,
                },
                { k: '결과 발표', v: result.property.resultDate ?? '미정' },
              ]}
            />

            <Section title={`조건이 맞는 고객 ${result.matches.length}명을 찾았습니다`}>
              {result.matches.length === 0 ? (
                <Empty title="조건이 맞는 고객이 없습니다" />
              ) : (
                <div className="crm-table-wrap" style={{ margin: 0, padding: 0 }}>
                  <table className="crm-table">
                    <thead>
                      <tr>
                        <th>고객</th>
                        <th>희망지역</th>
                        <th className="num">우선순위</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.matches.slice(0, 8).map(m => {
                        const c = customerById.get(m.customerId)
                        return (
                          <tr key={m.id}>
                            <td>
                              <Person name={c?.name ?? m.customerId} id={m.customerId} />
                            </td>
                            <td className="muted">{c?.preferredRegions.join(', ') ?? '-'}</td>
                            <td className="num">
                              <ScoreBadge score={m.opportunityScore} />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {result.matches.length > 8 && (
                    <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '12px 0 0' }}>
                      외 {result.matches.length - 8}명 —{' '}
                      <Link href="/matches" className="link-ink">
                        추천 랭킹에서 전체 보기
                      </Link>
                    </p>
                  )}
                </div>
              )}
            </Section>

            {result.topCustomer && result.matches[0] && (
              <Section title={`1순위 · ${result.topCustomer.name} 님 (${result.topCustomer.id})`}>
                <ScoreBars breakdown={result.matches[0]} />
                <div className="crm-note crm-note--accent" style={{ marginTop: 12 }}>
                  {result.matches[0].reason}
                </div>
              </Section>
            )}

            {result.notification && (
              <Section
                title="자동 생성된 카카오 알림"
                right={
                  <Chip tone={result.notification.status === 'SENT' ? 'pos' : 'warn'} dot>
                    {result.notification.status === 'SENT' ? '발송 완료' : '발송 대기'}
                  </Chip>
                }
              >
                <div className="kakao-phone">
                  <div className="kakao-sender">
                    <span className="kakao-avatar">🏠</span>
                    집인사이트
                  </div>
                  <div className="kakao-bubble">{result.notification.body}</div>
                </div>
                {result.notification.detail && (
                  <div className="crm-note" style={{ marginTop: 10 }}>
                    {result.notification.detail}
                  </div>
                )}
              </Section>
            )}

            {result.application && (
              <Section title="지원 절차와 일정이 만들어졌습니다">
                <div className="crm-chip-row" style={{ marginBottom: 12 }}>
                  <Chip tone="accent">{STAGE_LABEL[result.application.stage]}</Chip>
                  <Chip>할 일 {result.tasks.length}건</Chip>
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
                          <td className="num muted tnums">{t.dueDate ?? '날짜 미정'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            )}

            <div className="crm-filter-row">
              <Link href="/matches" className="crm-btn crm-btn--sm">
                추천 랭킹
              </Link>
              <Link href="/applications" className="crm-btn crm-btn--sm">
                지원 관리
              </Link>
              {result.topCustomer && (
                <Link href={`/customers?focus=${result.topCustomer.id}`} className="crm-btn crm-btn--sm">
                  고객 상세
                </Link>
              )}
            </div>
          </>
        )}
      </Drawer>
    </>
  )
}
