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

function daysBetween(a: string, b: string) {
  return Math.round((new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime()) / 86400000)
}

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

  // 간단한 Gantt — 공고 접수 시작 ~ 결과 발표일 구간에 Task 를 배치
  const ganttRange = useMemo(() => {
    const dated = focusTasks.map(t => t.dueDate).filter((d): d is string => !!d)
    if (!dated.length) return null
    const sorted = [...dated].sort()
    const start = sorted[0]
    const end = sorted[sorted.length - 1]
    const span = Math.max(1, daysBetween(start, end))
    return { start, end, span }
  }, [focusTasks])

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
        sub="추천이 지원으로 이어지면 접수·서류·발표 일정이 자동 생성됩니다. 탈락한 건도 조건이 남아 재지원으로 연결됩니다."
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
        <CardHead title="지원 Pipeline" sub="카드를 클릭하면 일정과 단계 변경이 열립니다." />
        {loading ? (
          <TableSkeleton rows={5} />
        ) : (data?.applications.length ?? 0) === 0 ? (
          <Empty>아직 지원 건이 없습니다. 추천 랭킹에서 지원을 시작해 보세요.</Empty>
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
                    {list.length === 0 && (
                      <div style={{ fontSize: 12, color: 'var(--ink-3)', padding: '8px 2px' }}>비어 있음</div>
                    )}
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
              {focus.opportunityScore !== undefined && <Chip>Score {focus.opportunityScore}</Chip>}
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

            <Section title="자동 생성된 일정">
              {focusTasks.length === 0 ? (
                <Empty>생성된 일정이 없습니다.</Empty>
              ) : (
                <div className="gantt">
                  {focusTasks.map(t => {
                    const offset =
                      ganttRange && t.dueDate ? (daysBetween(ganttRange.start, t.dueDate) / ganttRange.span) * 100 : 0
                    return (
                      <div key={t.id} className="gantt__row">
                        <span className="gantt__label">{t.title}</span>
                        <span className="gantt__track">
                          <span
                            className="gantt__bar"
                            data-done={t.status === 'DONE' ? 'true' : 'false'}
                            data-pending={t.dueDate === null ? 'true' : 'false'}
                            style={
                              t.dueDate
                                ? { left: `${Math.min(96, Math.max(0, offset))}%`, width: 14 }
                                : undefined
                            }
                          />
                        </span>
                        <span className="gantt__date">
                          {t.dueDate ?? 'date pending'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
              {focusTasks.some(t => t.dueDate === null) && (
                <div className="crm-note" style={{ marginTop: 12 }}>
                  공고에 해당 날짜가 공개되지 않아 일부 일정은 <strong>date pending</strong> 상태입니다.
                  임의 날짜를 만들지 않고 공고 갱신 시 자동 채워집니다.
                </div>
              )}
            </Section>

            <Section title="단계 이동">
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
          <CardHead title="마감 임박 Task" sub="진행 중인 지원 건의 다가오는 일정" />
          {loading ? (
            <TableSkeleton rows={5} />
          ) : (data?.upcomingTasks.length ?? 0) === 0 ? (
            <Empty>다가오는 일정이 없습니다.</Empty>
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
                  {(data?.upcomingTasks ?? []).map(t => (
                    <tr key={t.id} data-click="true" onClick={() => setFocusId(t.applicationId)}>
                      <td>{t.customerName}</td>
                      <td className="muted">{t.propertyName}</td>
                      <td>{t.title}</td>
                      <td className="muted">{t.dueDate ?? '날짜 미정'}</td>
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
