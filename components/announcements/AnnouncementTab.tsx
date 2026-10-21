'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { fetchAnnouncements } from '@/lib/api'
import type { Announcement, AnnouncementsResponse } from '@/lib/types'
import { formatDate, formatMonth } from '@/lib/format'
import {
  HOUSE_TYPE_OPTIONS,
  HOUSE_TYPE_PUBLIC,
  HOUSE_TYPE_PRIVATE,
  type HouseTypeFilter,
} from '@/lib/house-types'
import { InkLink, Pagination } from '@/components/ui/interactive'
import {
  DateField,
  FilterSearch,
  FilterSelect,
  SegmentControl,
} from '@/components/ui/form-fields'
import { format, subMonths } from 'date-fns'

const REGIONS = [
  { code: '', name: '전체' },
  { code: '100', name: '서울' },
  { code: '400', name: '인천' },
  { code: '410', name: '경기' },
  { code: '200', name: '강원' },
  { code: '300', name: '대전' },
  { code: '312', name: '충남' },
  { code: '338', name: '세종' },
  { code: '360', name: '충북' },
  { code: '500', name: '광주' },
  { code: '513', name: '전남' },
  { code: '560', name: '전북' },
  { code: '600', name: '부산' },
  { code: '621', name: '경남' },
  { code: '680', name: '울산' },
  { code: '690', name: '제주' },
  { code: '700', name: '대구' },
  { code: '712', name: '경북' },
]

function propertyPath(item: Announcement) {
  const id = item.PBLANC_NO || item.HOUSE_MANAGE_NO
  return `/property/${encodeURIComponent(id)}`
}

function houseTypeLabel(item: Announcement) {
  const dtl = item.HOUSE_DTL_SECD_NM || ''
  if (dtl.includes('민영')) return '민영'
  if (dtl.includes('국민')) return '국민'
  return item.HOUSE_DTL_SECD_NM || item.HOUSE_SECD_NM || '—'
}

function formatReceiptRange(start?: string, end?: string) {
  if (!start || !end) return '—'
  const s = formatDate(start.replace(/-/g, ''))
  const e = formatDate(end.replace(/-/g, ''))
  return { start: s, end: e }
}

export default function AnnouncementTab() {
  const router = useRouter()
  const today = new Date()
  const [region, setRegion] = useState('')
  const [houseType, setHouseType] = useState<HouseTypeFilter>(HOUSE_TYPE_OPTIONS[0].value)
  const [dateFrom, setDateFrom] = useState(format(subMonths(today, 3), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(format(today, 'yyyy-MM-dd'))
  const [houseName, setHouseName] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<AnnouncementsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async (p: number) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetchAnnouncements({
        page: p,
        perPage: 15,
        region,
        dateFrom,
        dateTo,
        houseName,
        houseType,
      })
      setData(res)
    } catch {
      setError('데이터를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [region, houseType, dateFrom, dateTo, houseName])

  useEffect(() => {
    load(1)
    setPage(1)
  }, [load])

  const totalPages = data ? Math.ceil(data.totalCount / 15) : 1

  const goDetail = (item: Announcement) => {
    router.push(propertyPath(item))
  }

  const houseTypeHint =
    houseType === HOUSE_TYPE_PRIVATE
      ? '민영주택 분양만 표시 중'
      : houseType === HOUSE_TYPE_PUBLIC
        ? '국민·공공분양 주택만 표시 중'
        : '민영·국민 유형을 선택해 비교할 수 있습니다'

  return (
    <div className="ann-tab">
      <div className="ann-filter-card rise">
        <div className="ann-filter-card__intro">
          <h2 className="ann-filter-card__title">분양 검색</h2>
          <p className="ann-filter-card__sub">{houseTypeHint}</p>
        </div>

        <div className="ann-filter-grid">
          <FilterSelect
            label="공급지역"
            value={region}
            onChange={setRegion}
            options={REGIONS.map(r => ({ value: r.code, label: r.name }))}
          />
          <SegmentControl
            label="주택 유형"
            value={houseType}
            onChange={setHouseType}
            options={HOUSE_TYPE_OPTIONS.map(o => ({
              value: o.value,
              label: o.label,
            }))}
          />
          <div className="ann-filter-dates">
            <DateField label="공고일 시작" value={dateFrom} onChange={setDateFrom} max={dateTo} />
            <span className="ann-filter-dates__sep" aria-hidden />
            <DateField label="공고일 종료" value={dateTo} onChange={setDateTo} min={dateFrom} />
          </div>
          <FilterSearch
            label="주택명"
            value={houseName}
            onChange={setHouseName}
            placeholder="단지명 검색"
          />
        </div>
      </div>

      {data && (
        <p className="ann-result-meta">
          총 <strong className="tnum">{data.totalCount.toLocaleString()}</strong>건
          <span>행을 선택하면 상세로 이동합니다</span>
        </p>
      )}

      <div className="ann-table-card">
        {loading ? (
          <div className="ann-table-skeleton">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="shimmer-bar" />
            ))}
          </div>
        ) : error ? (
          <div className="ann-table-empty ann-table-empty--error">{error}</div>
        ) : (
          <div className="ann-table-scroll">
            <table className="ann-table">
              <colgroup>
                <col className="ann-col-name" />
                <col className="ann-col-type" />
                <col className="ann-col-region" />
                <col className="ann-col-units" />
                <col className="ann-col-date" />
                <col className="ann-col-receipt" />
                <col className="ann-col-move" />
                <col className="ann-col-cap" />
                <col className="ann-col-link" />
              </colgroup>
              <thead>
                <tr>
                  <th>주택명</th>
                  <th>유형</th>
                  <th>지역</th>
                  <th>세대</th>
                  <th>공고일</th>
                  <th>청약접수</th>
                  <th>입주</th>
                  <th>상한</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {(data?.data ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={9} className="ann-table-empty">
                      조건에 맞는 분양이 없습니다
                    </td>
                  </tr>
                ) : (
                  (data?.data ?? []).map((item: Announcement, i) => {
                    const receipt = formatReceiptRange(item.RCEPT_BGNDE, item.RCEPT_ENDDE)
                    const type = houseTypeLabel(item)
                    const isPrivate = type === '민영'
                    const isPublic = type === '국민'

                    return (
                      <tr
                        key={`${item.PBLANC_NO}-${i}`}
                        className="click-row ann-row"
                        onClick={() => goDetail(item)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            goDetail(item)
                          }
                        }}
                        tabIndex={0}
                        role="link"
                        aria-label={`${item.HOUSE_NM} 상세 보기`}
                      >
                        <td className="ann-cell ann-cell--name">
                          <div className="ann-name-cell">
                            <span className="ann-name-cell__text" title={item.HOUSE_NM}>
                              {item.HOUSE_NM}
                            </span>
                            <svg className="row-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <path d="M9 18l6-6-6-6" />
                            </svg>
                          </div>
                          {item.BSNS_MBY_NM && (
                            <span className="ann-name-cell__sub">{item.BSNS_MBY_NM}</span>
                          )}
                        </td>
                        <td className="ann-cell">
                          <span
                            className={[
                              'ann-type-pill',
                              isPrivate && 'ann-type-pill--private',
                              isPublic && 'ann-type-pill--public',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                          >
                            {type}
                          </span>
                        </td>
                        <td className="ann-cell ann-cell--muted">{item.SUBSCRPT_AREA_CODE_NM}</td>
                        <td className="ann-cell ann-cell--num tnum">
                          {item.TOT_SUPLY_HSHLDCO
                            ? Number(item.TOT_SUPLY_HSHLDCO).toLocaleString()
                            : '—'}
                        </td>
                        <td className="ann-cell ann-cell--num tnum">
                          {item.RCRIT_PBLANC_DE
                            ? formatDate(item.RCRIT_PBLANC_DE.replace(/-/g, ''))
                            : '—'}
                        </td>
                        <td className="ann-cell ann-cell--receipt tnum">
                          {receipt === '—' ? (
                            '—'
                          ) : (
                            <span className="ann-date-range">
                              <span>{receipt.start}</span>
                              <span className="ann-date-range__sep">~</span>
                              <span>{receipt.end}</span>
                            </span>
                          )}
                        </td>
                        <td className="ann-cell ann-cell--num tnum">
                          {item.MVN_PREARNGE_YM ? formatMonth(item.MVN_PREARNGE_YM) : '—'}
                        </td>
                        <td className="ann-cell ann-cell--cap">
                          {item.NSPRC_NM === '해당' ? (
                            <span className="ann-cap-yes">해당</span>
                          ) : (
                            <span className="ann-cap-no">—</span>
                          )}
                        </td>
                        <td className="ann-cell ann-cell--link" onClick={e => e.stopPropagation()}>
                          {item.PBLANC_URL ? (
                            <InkLink href={item.PBLANC_URL} external onClick={e => e.stopPropagation()}>
                              청약홈
                            </InkLink>
                          ) : (
                            <InkLink href={propertyPath(item)}>상세</InkLink>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        onChange={p => {
          setPage(p)
          load(p)
        }}
      />
    </div>
  )
}
