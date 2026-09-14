'use client'

import { useMemo, useState } from 'react'
import { Card, CardHead } from '@/components/ui'
import { Chip, DemoFlag, Empty, ErrorBox, PageHead, Spinner, TableSkeleton } from './primitives'
import { shortDate, useSnapshot, won } from './useSnapshot'
import { triggerVacancy } from '@/lib/crm/client'
import type { PropertyStatus } from '@/lib/crm/types'

const STATUS_LABEL: Record<PropertyStatus, string> = {
  OPEN: '접수중',
  UPCOMING: '접수 예정',
  CLOSED: '마감',
}

const FILTERS: { id: 'ALL' | PropertyStatus | 'VACANT'; label: string }[] = [
  { id: 'ALL', label: '전체' },
  { id: 'OPEN', label: '접수중' },
  { id: 'UPCOMING', label: '접수 예정' },
  { id: 'CLOSED', label: '마감' },
  { id: 'VACANT', label: '공실 보유' },
]

export default function PropertiesView() {
  const { data, loading, error, reload } = useSnapshot()
  const [filter, setFilter] = useState<'ALL' | PropertyStatus | 'VACANT'>('ALL')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const rows = useMemo(() => {
    if (!data) return []
    return data.properties.filter(p => {
      if (filter === 'ALL') return true
      if (filter === 'VACANT') return p.vacancyCount > 0
      return p.status === filter
    })
  }, [data, filter])

  const onTrigger = async (id: string) => {
    setBusyId(id)
    setActionError(null)
    try {
      await triggerVacancy(id)
      await reload()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '이벤트 발생 실패')
    } finally {
      setBusyId(null)
    }
  }

  if (error) {
    return (
      <>
        <PageHead title="주택" />
        <ErrorBox message={error} onRetry={reload} />
      </>
    )
  }

  return (
    <>
      <PageHead
        title="관리 주택"
        sub="공고 일정과 빈 집 상태를 계속 감시합니다. 원하는 주택에서 직접 공실 이벤트를 일으켜 볼 수도 있습니다."
        right={<DemoFlag label="공실 데이터는 데모 합성" />}
      />

      {actionError && (
        <div style={{ marginBottom: 16 }}>
          <ErrorBox message={actionError} />
        </div>
      )}

      <Card>
        <CardHead
          title={`주택 ${rows.length}건`}
          sub="실제 공개 API는 개별 호실의 실시간 공실 정보를 주지 않습니다. 아래 공실 수치는 데모용 합성 데이터입니다."
          right={
            <div className="crm-filter-row" style={{ margin: 0 }}>
              {FILTERS.map(f => (
                <button
                  key={f.id}
                  type="button"
                  className="an-toggle"
                  data-on={filter === f.id ? 'true' : 'false'}
                  onClick={() => setFilter(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          }
          wrapRight
        />

        {loading ? (
          <TableSkeleton rows={8} />
        ) : rows.length === 0 ? (
          <Empty title="조건에 해당하는 주택이 없습니다">위 필터를 바꿔보세요.</Empty>
        ) : (
          <div className="crm-table-wrap">
            <table className="crm-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>주택명</th>
                  <th>유형</th>
                  <th>지역</th>
                  <th className="num">전용</th>
                  <th className="num">보증금</th>
                  <th className="num">월세</th>
                  <th className="num">공급</th>
                  <th className="num">공실</th>
                  <th>접수기간</th>
                  <th className="num">경쟁강도</th>
                  <th>상태</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map(p => (
                  <tr key={p.id}>
                    <td className="muted">{p.id}</td>
                    <td style={{ fontWeight: 600, minWidth: 180 }}>
                      {p.name}
                      <div className="muted" style={{ fontSize: 12, marginTop: 3, fontWeight: 400 }}>{p.source}</div>
                    </td>
                    <td className="muted">{p.housingType}</td>
                    <td>{p.region}</td>
                    <td className="num tnums">{p.area}㎡</td>
                    <td className="num tnums">{won(p.deposit)}</td>
                    <td className="num tnums">{p.monthlyRent}만</td>
                    <td className="num tnums">{p.supplyCount}</td>
                    <td className="num">
                      {p.vacancyCount > 0 ? <Chip tone="hot" dot>{p.vacancyCount}</Chip> : <span className="muted">0</span>}
                    </td>
                    <td className="muted" style={{ whiteSpace: 'nowrap' }}>
                      {shortDate(p.applicationStart)} ~ {shortDate(p.applicationEnd)}
                    </td>
                    <td className="num tnums">{p.competitionRate}:1</td>
                    <td>
                      <Chip tone={p.status === 'OPEN' ? 'accent' : 'default'} dot>
                        {STATUS_LABEL[p.status]}
                      </Chip>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="crm-btn crm-btn--sm"
                        onClick={() => onTrigger(p.id)}
                        disabled={busyId === p.id}
                      >
                        {busyId === p.id ? <Spinner /> : '공실 발생'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  )
}
