'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  SCORE_LIMITS,
  buildComparison,
  type ReferenceStats,
  type ScoreComparison,
} from '@/lib/subscription-score'
import { useConsumer } from './ConsumerProvider'

/**
 * 청약 가점 계산 — 84점 만점의 세 항목을 직접 맞춰보는 자리.
 *
 * 당첨 확률은 내지 않는다. 검증되지 않은 계수로 만든 확률(%)은 공식 예측처럼
 * 읽히기 때문이다. 대신 공개 통계상의 평균·최저 당첨가점과 내 점수의 실제
 * 차이만 보여준다 — 확률이 아니라 위치다.
 *
 * 조건을 저장해 둔 사람은 그 값으로 시작한다. 같은 것을 두 번 묻지 않는다.
 */

const REGIONS: { code: string; name: string }[] = [
  { code: '', name: '전국' },
  { code: '100', name: '서울' },
  { code: '410', name: '경기' },
  { code: '400', name: '인천' },
  { code: '600', name: '부산' },
  { code: '700', name: '대구' },
  { code: '300', name: '대전' },
  { code: '500', name: '광주' },
  { code: '680', name: '울산' },
  { code: '338', name: '세종' },
  { code: '200', name: '강원' },
  { code: '360', name: '충북' },
  { code: '312', name: '충남' },
  { code: '560', name: '전북' },
  { code: '513', name: '전남' },
  { code: '712', name: '경북' },
  { code: '621', name: '경남' },
  { code: '690', name: '제주' },
]

/** 항목마다 만점과 셈법이 다르다. 화면에 그대로 적어둔다 */
const ITEMS = [
  {
    key: 'homeless' as const,
    label: '무주택 기간',
    unit: '년',
    max: SCORE_LIMITS.homelessYearsMax,
    points: 32,
    rule: '1년당 2점 · 만 30세 또는 혼인신고일부터',
  },
  {
    key: 'dependents' as const,
    label: '부양가족 수',
    unit: '명',
    max: SCORE_LIMITS.dependentsMax,
    points: 35,
    rule: '1명당 5점 · 본인 제외',
  },
  {
    key: 'account' as const,
    label: '청약통장 가입기간',
    unit: '년',
    max: SCORE_LIMITS.accountYearsMax,
    points: 17,
    rule: '1년당 1점',
  },
]

function Row({
  label,
  unit,
  max,
  points,
  rule,
  value,
  earned,
  onChange,
}: {
  label: string
  unit: string
  max: number
  points: number
  rule: string
  value: number
  earned: number
  onChange: (v: number) => void
}) {
  return (
    <div className="cs-score__row">
      <div className="cs-score__head">
        <span className="cs-score__label">{label}</span>
        <span className="cs-score__earned cs-num">
          {earned}
          <span className="cs-score__of"> / {points}점</span>
        </span>
      </div>

      <div className="cs-score__control">
        <input
          type="range"
          className="cs-range"
          min={0}
          max={max}
          step={1}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          aria-label={`${label} (${unit})`}
        />
        <span className="cs-score__value cs-num">
          {value}
          {unit}
        </span>
      </div>

      <p className="cs-score__rule">{rule}</p>
    </div>
  )
}

export default function ScoreCalculator() {
  const { profile } = useConsumer()

  const [homeless, setHomeless] = useState(0)
  const [dependents, setDependents] = useState(0)
  const [account, setAccount] = useState(0)
  const [region, setRegion] = useState('')

  /** 어떤 조건의 결과인지 함께 담아, 로딩 여부를 파생값으로 계산한다 */
  const [refResult, setRefResult] = useState<{ key: string; stats: ReferenceStats | null } | null>(null)
  const refLoading = refResult?.key !== region
  const ref = refResult?.key === region ? refResult.stats : null

  // 저장한 조건에 자격 정보가 있으면 그 값으로 연다. 조건이 늦게 도착하므로
  // 초기값으로는 받을 수 없고, 도착한 뒤 한 번만 씨를 뿌린다.
  const [seeded, setSeeded] = useState<string | null>(null)
  if (profile && seeded !== profile.updatedAt) {
    setSeeded(profile.updatedAt)
    if (typeof profile.homelessYears === 'number') setHomeless(profile.homelessYears)
    if (typeof profile.dependents === 'number') setDependents(profile.dependents)
    if (typeof profile.accountYears === 'number') setAccount(profile.accountYears)
  }

  useEffect(() => {
    let alive = true
    fetch(`/api/prediction/reference${region ? `?region=${region}` : ''}`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error())))
      .then((json: { stats: ReferenceStats | null }) => {
        if (alive) setRefResult({ key: region, stats: json.stats ?? null })
      })
      .catch(() => {
        if (alive) setRefResult({ key: region, stats: null })
      })
    return () => {
      alive = false
    }
  }, [region])

  const comparison: ScoreComparison = buildComparison(
    { homelessYears: homeless, dependents, accountYears: account },
    ref,
  )
  const { breakdown } = comparison
  const pct = Math.round((breakdown.total / 84) * 100)

  const earned = { homeless: breakdown.homeless, dependents: breakdown.dependents, account: breakdown.account }
  const setters = { homeless: setHomeless, dependents: setDependents, account: setAccount }
  const values = { homeless, dependents, account }

  return (
    <div className="cs-wrap" style={{ paddingTop: 44 }}>
      <header>
        <h1 className="cs-page-title">청약 가점 계산</h1>
        <p className="cs-sub" style={{ marginTop: 12 }}>
          민영주택 일반공급 기준 84점 만점입니다. 세 항목을 맞춰보면 공개된 당첨가점 통계에서 내 점수가
          어디쯤인지 함께 보여드려요.
        </p>
      </header>

      <div className="cs-score">
        {/* 왼쪽 — 입력 */}
        <section className="cs-card cs-score__panel" aria-label="가점 항목">
          {ITEMS.map(it => (
            <Row
              key={it.key}
              label={it.label}
              unit={it.unit}
              max={it.max}
              points={it.points}
              rule={it.rule}
              value={values[it.key]}
              earned={earned[it.key]}
              onChange={setters[it.key]}
            />
          ))}

          <p className="cs-note" style={{ marginTop: 4 }}>
            가점 산식의 공식 정확성은 별도 검증 전까지 확정하지 않습니다. 실제 점수는 청약홈에서 최종
            확인해 주세요.
          </p>
        </section>

        {/* 오른쪽 — 합계와 비교 */}
        <section className="cs-score__result" aria-label="결과">
          <div className="cs-score__total">
            <span className="cs-score__total-label">내 가점</span>
            <div className="cs-score__total-value cs-num">
              {breakdown.total}
              <span className="cs-score__total-of">/ 84</span>
            </div>
            <div className="cs-score__bar" aria-hidden="true">
              <span style={{ width: `${pct}%` }} />
            </div>
            <p className="cs-score__split cs-num">
              무주택 {breakdown.homeless} · 부양가족 {breakdown.dependents} · 통장 {breakdown.account}
            </p>
          </div>

          <div className="cs-card cs-score__compare">
            <div className="cs-field">
              <label className="cs-field__label" htmlFor="score-region">
                비교할 지역
              </label>
              <select
                id="score-region"
                className="cs-input"
                value={region}
                onChange={e => setRegion(e.target.value)}
              >
                {REGIONS.map(r => (
                  <option key={r.code || 'all'} value={r.code}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            {refLoading ? (
              <div className="cs-skel" style={{ height: 120, marginTop: 18 }} />
            ) : (
              <div style={{ marginTop: 18 }}>
                <div className="cs-score__headline" data-band={comparison.band}>
                  {comparison.headline}
                </div>
                <p className="cs-score__insight">{comparison.insight}</p>
                <p className="cs-score__detail">{comparison.detail}</p>

                {comparison.reference && comparison.dataSufficient && (
                  <dl className="cs-score__ref">
                    <div>
                      <dt>평균</dt>
                      <dd className="cs-num">{comparison.reference.avg.toFixed(1)}</dd>
                    </div>
                    <div>
                      <dt>최저</dt>
                      <dd className="cs-num">{comparison.reference.min.toFixed(1)}</dd>
                    </div>
                    <div>
                      <dt>최고</dt>
                      <dd className="cs-num">{comparison.reference.max.toFixed(1)}</dd>
                    </div>
                    <div>
                      <dt>기준월</dt>
                      <dd className="cs-num">{comparison.reference.statMonth || '—'}</dd>
                    </div>
                  </dl>
                )}
              </div>
            )}
          </div>

          <div className="cs-score__next">
            <Link href="/analyze" className="cs-btn cs-btn--primary cs-btn--block">
              이 조건으로 공고 찾기
            </Link>
            <Link href="/stats" className="cs-btn cs-btn--ghost cs-btn--block" style={{ marginTop: 8 }}>
              경쟁률·당첨통계 보기
            </Link>
          </div>
        </section>
      </div>

      <p className="cs-note" style={{ marginTop: 32 }}>
        당첨 확률은 산출하지 않습니다. 검증되지 않은 계수로 만든 확률은 공식 예측처럼 읽히기 때문입니다.
        공개 통계상의 평균·최저 당첨가점과 내 점수의 차이만 보여드립니다. 출처: 공공데이터포털 청약홈
        당첨자 가점 통계.
      </p>
    </div>
  )
}
