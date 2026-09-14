'use client'

import { useMemo, useState } from 'react'
import { Card, CardHead } from '@/components/ui'
import {
  Chip,
  Drawer,
  Empty,
  ErrorBox,
  KeyValues,
  PageHead,
  Person,
  ScoreBadge,
  Section,
  TableSkeleton,
} from './primitives'
import { ddayLabel, shortDate, useSnapshot, won } from './useSnapshot'
import { updateStage } from '@/lib/crm/client'
import { APPLICATION_STAGES, STAGE_LABEL, type ApplicationStage } from '@/lib/crm/types'

const BOARD_STAGES: ApplicationStage[] = [
  'DISCOVERED',
  'REVIEWING',
  'APPLYING',
  'DOCUMENTS',
  'SUBMITTED',
  'RESULT_WAITING',
  'WON',
  'CONTRACT',
  'LOST',
]

export default function ApplicationsView() {
  const { data, loading, error, reload } = useSnapshot()
  const [focusId, setFocusId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const customerById = useMemo(() => new Map((data?.customers ?? []).map(c => [c.id, c])), [data])
  const propertyById = useMemo(() => new Map((data?.properties ?? []).map(p => [p.id, p])), [data])

  const board = useMemo(() => {
    const map = new Map<ApplicationStage, typeof data extends null ? never : NonNullable<typeof data>['applications']>()
    for (const stage of BOARD_STAGES) map.set(stage, [])
    for (const a of data?.applications ?? []) map.get(a.stage)?.push(a)
    for (const list of map.values()) list.sort((x, y) => y.updatedAt.localeCompare(x.updatedAt))
    return map
  }, [data])

  const focus = data?.applications.find(a => a.id === focusId) ?? null
  const focusTasks = (data?.tasks ?? []).filter(t => t.applicationId === focusId)
  const focusProperty = focus ? propertyById.get(focus.propertyId) : undefined
  const focusCustomer = focus ? customerById.get(focus.customerId) : undefined
  const siblingApps = focus ? (data?.applications ?? []).filter(a => a.customerId === focus.customerId) : []

  /** 체크포인트 타임라인에서 "지금 해야 할 것" 한 건만 강조한다 */
  const nextTaskIndex = focusTasks.findIndex(t => t.status !== 'DONE')

  const advance = async (stage: ApplicationStage) => {
    if (!focus) return
    setBusy(true)
    setActionError(null)
    try {
      await updateStage(focus.id, stage)
      await reload()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '단계 변경 실패')
    } finally {
      setBusy(false)
    }
  }

  if (error) {
    return (
      <>
        <PageHead title="지원 관리" />
        <ErrorBox message={error} onRetry={reload} />
      </>
    )
  }

  return (
    <>
      <PageHead
        title="지원 관리"
        sub="추천이 지원으로 이어지면 접수·서류·발표 일정이 자동으로 만들어집니다. 떨어진 건도 조건이 남아 다음 기회로 연결됩니다."
        right={
          data ? (
            <Chip tone="accent">
              진행중 {data.kpi.activeApplications}건 · 총 {data.applications.length}건
            </Chip>
          ) : undefined
        }
      />

      {actionError && (
        <div style={{ marginBottom: 16 }}>
          <ErrorBox message={actionError} />
        </div>
      )}

      <Card>
        <CardHead title="지원 진행 현황" sub="카드를 누르면 일정과 단계 변경을 볼 수 있습니다." />
        {loading ? (
          <TableSkeleton rows={5} />
        ) : (data?.applications.length ?? 0) === 0 ? (
          <Empty title="아직 지원 건이 없습니다" icon="calendar">
            추천 랭킹에서 <strong>지원 시작</strong>을 누르면 여기에 나타납니다.
          </Empty>
        ) : (
          <div className="kanban">
            {BOARD_STAGES.map(stage => {
              const list = board.get(stage) ?? []
              return (
                <div key={stage} className="kanban__col">
                  <div className="kanban__head">
                    <span className="kanban__title">{STAGE_LABEL[stage]}</span>
                    <span className="kanban__count">{list.length}</span>
                  </div>
                  <div className="kanban__cards">
                    {list.slice(0, 40).map(a => {
                      const c = customerById.get(a.customerId)
                      const p = propertyById.get(a.propertyId)
                      return (
                        <button key={a.id} type="button" className="kanban__card" onClick={() => setFocusId(a.id)}>
                          <div className="kanban__card-name">{c?.name ?? a.customerId}</div>
                          <div className="kanban__card-sub">{p?.name ?? a.propertyId}</div>
                          <div className="kanban__card-foot">
                            <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
                              ~{shortDate(p?.applicationEnd ?? null)}
                            </span>
                            {a.opportunityScore !== undefined && <ScoreBadge score={a.opportunityScore} />}
                          </div>
                        </button>
                      )
                    })}
                    {list.length === 0 && <div className="kanban__empty">비어 있음</div>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <Drawer
        open={!!focus}
        onClose={() => setFocusId(null)}
        title={focusProperty?.name ?? '지원 상세'}
        subtitle={focusCustomer ? `${focusCustomer.name} (${focusCustomer.id}) · ${siblingApps.length}회차 지원` : ''}
      >
        {focus && (
          <>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Chip tone="accent">{STAGE_LABEL[focus.stage]}</Chip>
              {focus.opportunityScore !== undefined && <Chip>우선순위 {focus.opportunityScore}점</Chip>}
              {focusProperty && <Chip>{focusProperty.housingType}</Chip>}
            </div>

            {focusProperty && (
              <KeyValues
                items={[
                  { k: '지역', v: focusProperty.region },
                  { k: '전용면적', v: `${focusProperty.area}㎡` },
                  { k: '보증금', v: `${won(focusProperty.deposit)}원` },
                  { k: '월 임대료', v: `${focusProperty.monthlyRent}만원` },
                  { k: '접수 마감', v: focusProperty.applicationEnd ?? '미정' },
                  { k: '결과 발표', v: focusProperty.resultDate ?? '미정' },
                ]}
              />
            )}

            <Section title="자동으로 만들어진 일정">
              {focusTasks.length === 0 ? (
                <Empty title="생성된 일정이 없습니다" icon="calendar" />
              ) : (
                <div className="gantt">
                  {focusTasks.map((t, i) => {
                    const done = t.status === 'DONE'
                    const next = !done && i === nextTaskIndex
                    return (
                      <div key={t.id} className="gantt__row">
                        <span
                          className="gantt__mark"
                          data-done={done ? 'true' : 'false'}
                          data-next={next ? 'true' : 'false'}
                        >
                          {done ? '✓' : i + 1}
                        </span>
                        <span>
                          <span className="gantt__label">{t.title}</span>
                          <span className="gantt__sub">
                            {next ? '다음 할 일' : done ? '완료' : t.dueDate ? '예정' : '공고에 날짜 미공개'}
                          </span>
                        </span>
                        <span className="gantt__date">{t.dueDate ?? '날짜 미정'}</span>
                      </div>
                    )
                  })}
                </div>
              )}
              {focusTasks.some(t => t.dueDate === null) && (
                <div className="crm-note" style={{ marginTop: 12 }}>
                  공고에 해당 날짜가 아직 공개되지 않아 일부 일정은 <strong>날짜 미정</strong>입니다.
                  임의로 날짜를 만들지 않고, 공고가 갱신되면 자동으로 채워집니다.
                </div>
              )}
            </Section>

            <Section title="단계 바꾸기">
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {APPLICATION_STAGES.map(s => (
                  <button
                    key={s}
                    type="button"
                    className="an-toggle"
                    data-on={focus.stage === s ? 'true' : 'false'}
                    onClick={() => advance(s)}
                    disabled={busy}
                  >
                    {STAGE_LABEL[s]}
                  </button>
                ))}
              </div>
              {focus.stage === 'LOST' && (
                <div className="crm-note" style={{ marginTop: 12 }}>
                  탈락해도 조건은 유지됩니다. 다음 공고·공실 이벤트에서 이 고객이 다시 매칭 대상에 포함됩니다.
                </div>
              )}
            </Section>

            {siblingApps.length >= 2 && (
              <Section title={`이 고객의 지원 이력 ${siblingApps.length}회`}>
                <div className="crm-table-wrap" style={{ margin: 0, padding: 0 }}>
                  <table className="crm-table">
                    <tbody>
                      {siblingApps.map(a => (
                        <tr key={a.id} data-click="true" onClick={() => setFocusId(a.id)}>
                          <td>{propertyById.get(a.propertyId)?.name ?? a.propertyId}</td>
                          <td className="num"><Chip>{STAGE_LABEL[a.stage]}</Chip></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            )}
          </>
        )}
      </Drawer>

      <div style={{ marginTop: 'var(--gap)' }}>
        <Card>
          <CardHead title="곧 마감되는 할 일" sub="진행 중인 지원 건에서 다가오는 일정" />
          {loading ? (
            <TableSkeleton rows={5} />
          ) : (data?.upcomingTasks.length ?? 0) === 0 ? (
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
                  {(data?.upcomingTasks ?? []).map(t => (
                    <tr key={t.id} data-click="true" onClick={() => setFocusId(t.applicationId)}>
                      <td><Person name={t.customerName} id={t.customerId} /></td>
                      <td className="muted">{t.propertyName}</td>
                      <td>{t.title}</td>
                      <td className="muted tnums">{t.dueDate ?? '날짜 미정'}</td>
                      <td className="num">
                        <Chip tone={t.dday !== null && t.dday <= 3 ? 'hot' : t.dday !== null && t.dday <= 7 ? 'warn' : 'default'}>
                          {ddayLabel(t.dday)}
                        </Chip>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  )
}
