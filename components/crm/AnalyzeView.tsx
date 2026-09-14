'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Card, CardHead } from '@/components/ui'
import {
  Chip,
  DemoFlag,
  Empty,
  ErrorBox,
  PageHead,
  ScoreBadge,
  ScoreBars,
  Spinner,
} from './primitives'
import { shortDate, won } from './useSnapshot'
import { analyzeProfile, type AnalyzeResult } from '@/lib/crm/client'
import { HOUSING_TYPES, type HousingType } from '@/lib/crm/types'

/** 지역 선택지 — 설명을 붙여 처음 쓰는 사람도 감을 잡게 한다 */
const REGIONS: { name: string; hint: string }[] = [
  { name: '관악구', hint: '1인가구 매물 최다' },
  { name: '동작구', hint: '노량진·상도 중심' },
  { name: '마포구', hint: '공덕·상암 생활권' },
  { name: '영등포구', hint: '여의도 접근성' },
  { name: '성동구', hint: '성수·왕십리' },
  { name: '송파구', hint: '잠실 생활권' },
  { name: '서초구', hint: '강남 접근성' },
  { name: '강남구', hint: '고가·경쟁 높음' },
  { name: '금천구', hint: '가산디지털단지' },
  { name: '서대문구', hint: '신촌·연희' },
]

const HOUSEHOLDS: { name: string; hint: string; types: HousingType[] }[] = [
  { name: '1인가구', hint: '혼자 거주', types: ['청년매입임대', '행복주택'] },
  { name: '신혼부부', hint: '혼인 7년 이내', types: ['행복주택', '신혼희망타운'] },
  { name: '2인가구', hint: '동거·형제 등', types: ['행복주택', '공공임대'] },
  { name: '다자녀', hint: '자녀 2명 이상', types: ['공공임대', '행복주택'] },
  { name: '한부모', hint: '한부모 가족', types: ['공공임대', '행복주택'] },
]

const HOUSING_HINT: Record<HousingType, string> = {
  청년매입임대: '만 19~39세 · 시세 40~50%',
  행복주택: '청년·신혼 · 시세 60~80%',
  공공임대: '장기 거주 가능',
  공공지원민간임대: '민간 공급 · 임대료 상한',
  신혼희망타운: '신혼부부 특화',
}

const INCOMES = ['~50%', '50~70%', '70~100%', '100~120%', '120%~'] as const

const TOTAL_STEPS = 3

export default function AnalyzeView() {
  const [step, setStep] = useState(0)

  const [regions, setRegions] = useState<string[]>([])
  const [household, setHousehold] = useState<string>('1인가구')
  const [types, setTypes] = useState<HousingType[]>(['청년매입임대', '행복주택'])
  const [income, setIncome] = useState<string>('70~100%')
  const [age, setAge] = useState(29)
  const [maxDeposit, setMaxDeposit] = useState(8000)
  const [maxMonthlyRent, setMaxMonthlyRent] = useState(40)
  const [minArea, setMinArea] = useState(28)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AnalyzeResult | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)

  const toggleRegion = (r: string) =>
    setRegions(prev => (prev.includes(r) ? prev.filter(x => x !== r) : prev.length >= 3 ? prev : [...prev, r]))

  const toggleType = (t: HousingType) =>
    setTypes(prev => (prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t].slice(-3)))

  /** 가구 유형을 고르면 그에 맞는 주택유형을 미리 채워준다 (수정 가능) */
  const pickHousehold = (h: (typeof HOUSEHOLDS)[number]) => {
    setHousehold(h.name)
    setTypes(h.types)
    if (h.name === '1인가구') setAge(29)
    else if (h.name === '신혼부부') setAge(33)
    else setAge(38)
  }

  const run = async (payload?: { regions?: string[] }) => {
    const useRegions = payload?.regions ?? regions
    setLoading(true)
    setError(null)
    try {
      const res = await analyzeProfile({
        age,
        householdType: household,
        incomeBand: income,
        preferredRegions: useRegions,
        preferredHousingTypes: types,
        maxDeposit,
        maxMonthlyRent,
        minArea,
      })
      setResult(res)
      setOpenId(res.results[0]?.match.id ?? null)
      setStep(TOTAL_STEPS)
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setError(err instanceof Error ? err.message : '분석에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const restart = () => {
    setResult(null)
    setStep(0)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const recap = useMemo(() => {
    const out: string[] = []
    if (step > 0 && regions.length) out.push(regions.join(' · '))
    if (step > 1) out.push(`${household} · ${types.join(', ')}`)
    return out
  }, [step, regions, household, types])

  // ── 결과 화면 ────────────────────────────────────────────
  if (result) {
    const top = result.results[0]
    return (
      <>
        <PageHead
          title="분석 결과"
          sub={`${regions.join(' · ')} · ${household} 조건으로 지금 지원 가능한 주택을 우선순위대로 정리했습니다.`}
          right={
            <>
              <DemoFlag label="주택 데이터는 데모 합성 데이터" />
              <button className="crm-btn crm-btn--sm" onClick={restart}>
                조건 다시 입력
              </button>
            </>
          }
        />

        <div className="crm-stack">
          {top && (
            <div className="an-verdict">
              <div className="an-verdict__score">
                <ScoreBadge score={top.match.opportunityScore} large />
                <div className="an-verdict__label">지원 우선순위 점수</div>
              </div>
              <div>
                <h2 className="an-verdict__title">
                  지금 가장 먼저 볼 곳은 <strong>{top.property.name}</strong> 입니다
                </h2>
                <p className="an-verdict__text">{result.insight || top.match.reason}</p>
              </div>
            </div>
          )}

          <Card>
            <CardHead
              title={`지원 가능 주택 ${result.results.length}건`}
              sub="점수가 높을수록 내 조건에 맞고, 지금 지원할 가치가 큽니다."
            />
            {result.results.length === 0 ? (
              <Empty title="조건에 맞는 주택을 찾지 못했습니다">
                예산이나 지역 범위를 조금 넓히면 후보가 늘어납니다.
                <br />
                <button className="crm-btn crm-btn--sm" style={{ marginTop: 14 }} onClick={restart}>
                  조건 다시 입력
                </button>
              </Empty>
            ) : (
              <div className="an-result">
                {result.results.map(({ match, property }, i) => {
                  const open = openId === match.id
                  return (
                    <div key={match.id} className="an-result__item" data-rank={i}>
                      <div style={{ minWidth: 0 }}>
                        <div className="an-result__name">
                          <span className="an-result__rank">{i + 1}</span>
                          {property.name}
                        </div>
                        <div className="an-result__meta">
                          <span>
                            {property.region} · {property.housingType}
                          </span>
                          <span>전용 {property.area}㎡</span>
                          <span>
                            보증금 {won(property.deposit)}원 / 월 {property.monthlyRent}만원
                          </span>
                        </div>
                        <div className="crm-chip-row" style={{ marginTop: 9 }}>
                          <Chip tone={property.status === 'OPEN' ? 'accent' : 'default'} dot>
                            {property.status === 'OPEN'
                              ? '접수중'
                              : property.status === 'UPCOMING'
                                ? '접수 예정'
                                : '마감'}
                          </Chip>
                          <Chip>경쟁강도 {property.competitionRate}:1</Chip>
                          <Chip>
                            접수 {shortDate(property.applicationStart)}~{shortDate(property.applicationEnd)}
                          </Chip>
                          {!property.resultDate && <Chip tone="warn">결과 발표일 미정</Chip>}
                        </div>
                        <p className="an-result__reason">{match.reason}</p>
                        {open && (
                          <div style={{ marginTop: 14 }}>
                            <ScoreBars breakdown={match} />
                          </div>
                        )}
                      </div>
                      <div className="an-result__right">
                        <ScoreBadge score={match.opportunityScore} />
                        <button
                          type="button"
                          className="crm-btn crm-btn--sm"
                          onClick={() => setOpenId(open ? null : match.id)}
                        >
                          {open ? '접기' : '왜 이 점수?'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="crm-note" style={{ marginTop: 18 }}>
              이 점수는 <strong>당첨확률이 아닙니다.</strong> 내 조건 대비 어디부터 지원할지 정하는 우선순위
              점수이며, 지역 30% · 가격 20% · 면적 15% · 주택유형 15% · 경쟁강도 10% · 마감 긴급도 10%로
              계산됩니다. 지원 전 공식 공고문을 반드시 확인하세요.
            </div>
          </Card>

          <Card>
            <CardHead title="조건을 저장하면 여기서부터 자동입니다" sub="Premium 준비 중" />
            <div style={{ display: 'grid', gap: 11, fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.65 }}>
              <div>· 새 공고·공실이 생기면 방금 입력한 조건과 자동 대조해 맞는 것만 알려드립니다.</div>
              <div>· 관심 주택을 저장하면 접수·서류·발표 일정이 자동으로 만들어집니다.</div>
              <div>· 떨어져도 조건은 남습니다. 다음 공고로 바로 이어집니다.</div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
              <Link href="/dashboard" className="crm-btn crm-btn--accent">
                실제 동작 보기
              </Link>
              <button className="crm-btn" onClick={restart}>
                다른 조건으로 다시
              </button>
            </div>
          </Card>
        </div>
      </>
    )
  }

  // ── 위저드 ──────────────────────────────────────────────
  return (
    <>
      <PageHead
        title="내 주거기회 분석"
        sub="3가지만 답하면 지금 지원 가능한 집을 우선순위대로 정리해 드립니다. 1분이면 충분합니다."
      />

      <div className="wz">
        <div className="wz-progress" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={TOTAL_STEPS}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <span
              key={i}
              className="wz-progress__seg"
              data-state={i < step ? 'done' : i === step ? 'current' : 'todo'}
            >
              <span className="wz-progress__fill" />
            </span>
          ))}
        </div>

        {error && (
          <div style={{ marginBottom: 18 }}>
            <ErrorBox message={error} onRetry={() => void run()} />
          </div>
        )}

        <div className="wz-card" key={step}>
          {step === 0 && (
            <>
              <div className="wz-step-label">1단계 / 3</div>
              <h2 className="wz-q">어느 동네에 살고 싶으세요?</h2>
              <p className="wz-help">
                최대 3곳까지 고를 수 있어요. 먼저 고른 곳이 1순위로 반영됩니다.
              </p>
              <div className="wz-tiles">
                {REGIONS.map(r => {
                  const idx = regions.indexOf(r.name)
                  const on = idx >= 0
                  return (
                    <button
                      key={r.name}
                      type="button"
                      className="wz-tile"
                      data-on={on ? 'true' : 'false'}
                      onClick={() => toggleRegion(r.name)}
                      disabled={!on && regions.length >= 3}
                    >
                      {on && <span className="wz-tile__rank">{idx + 1}</span>}
                      {r.name}
                      <span className="wz-tile__sub">{r.hint}</span>
                    </button>
                  )
                })}
              </div>
              <div className="wz-nav">
                <button className="wz-skip" onClick={() => { setRegions(['관악구', '동작구']); setStep(1) }}>
                  잘 모르겠어요
                </button>
                <button
                  className="crm-btn crm-btn--accent crm-btn--lg"
                  onClick={() => setStep(1)}
                  disabled={regions.length === 0}
                >
                  {regions.length === 0 ? '지역을 골라주세요' : '다음'}
                </button>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="wz-step-label">2단계 / 3</div>
              <h2 className="wz-q">어떤 가구인가요?</h2>
              <p className="wz-help">
                고르면 해당 가구가 지원할 수 있는 주택유형을 미리 골라드려요. 아래에서 바꿀 수 있습니다.
              </p>
              <div className="wz-tiles">
                {HOUSEHOLDS.map(h => (
                  <button
                    key={h.name}
                    type="button"
                    className="wz-tile"
                    data-on={household === h.name ? 'true' : 'false'}
                    onClick={() => pickHousehold(h)}
                  >
                    {h.name}
                    <span className="wz-tile__sub">{h.hint}</span>
                  </button>
                ))}
              </div>

              <div className="wz-field">
                <div className="wz-slider-row">
                  <span className="wz-slider-name">관심 주택유형</span>
                  <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>중복 선택 가능</span>
                </div>
                <div className="crm-filter-row">
                  {HOUSING_TYPES.map(t => (
                    <button
                      key={t}
                      type="button"
                      className="an-toggle"
                      data-on={types.includes(t) ? 'true' : 'false'}
                      onClick={() => toggleType(t)}
                      title={HOUSING_HINT[t]}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '10px 0 0', lineHeight: 1.55 }}>
                  {types.map(t => `${t} — ${HOUSING_HINT[t]}`).join(' · ')}
                </p>
              </div>

              <div className="wz-field">
                <div className="wz-slider-row">
                  <span className="wz-slider-name">소득 구간</span>
                  <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>도시근로자 월평균 소득 대비</span>
                </div>
                <div className="crm-filter-row">
                  {INCOMES.map(i => (
                    <button
                      key={i}
                      type="button"
                      className="an-toggle"
                      data-on={income === i ? 'true' : 'false'}
                      onClick={() => setIncome(i)}
                    >
                      {i}
                    </button>
                  ))}
                </div>
              </div>

              <div className="wz-nav">
                <button className="wz-skip" onClick={() => setStep(0)}>
                  이전
                </button>
                <button
                  className="crm-btn crm-btn--accent crm-btn--lg"
                  onClick={() => setStep(2)}
                  disabled={types.length === 0}
                >
                  다음
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="wz-step-label">3단계 / 3</div>
              <h2 className="wz-q">예산은 어느 정도인가요?</h2>
              <p className="wz-help">정확하지 않아도 괜찮아요. 대략만 맞으면 우선순위는 잘 나옵니다.</p>

              <div className="wz-field">
                <div className="wz-slider-row">
                  <span className="wz-slider-name">보증금 상한</span>
                  <span className="wz-slider-val">{won(maxDeposit)}원</span>
                </div>
                <input
                  className="wz-range"
                  type="range"
                  min={3000}
                  max={20000}
                  step={500}
                  value={maxDeposit}
                  onChange={e => setMaxDeposit(Number(e.target.value))}
                  aria-label="보증금 상한"
                />
                <div className="wz-range-scale">
                  <span>3,000만</span>
                  <span>2억</span>
                </div>
              </div>

              <div className="wz-field">
                <div className="wz-slider-row">
                  <span className="wz-slider-name">월 임대료 상한</span>
                  <span className="wz-slider-val">{maxMonthlyRent}만원</span>
                </div>
                <input
                  className="wz-range"
                  type="range"
                  min={10}
                  max={100}
                  step={1}
                  value={maxMonthlyRent}
                  onChange={e => setMaxMonthlyRent(Number(e.target.value))}
                  aria-label="월 임대료 상한"
                />
                <div className="wz-range-scale">
                  <span>10만</span>
                  <span>100만</span>
                </div>
              </div>

              <div className="wz-field">
                <div className="wz-slider-row">
                  <span className="wz-slider-name">희망 최소 면적</span>
                  <span className="wz-slider-val">{minArea}㎡</span>
                </div>
                <input
                  className="wz-range"
                  type="range"
                  min={15}
                  max={60}
                  step={1}
                  value={minArea}
                  onChange={e => setMinArea(Number(e.target.value))}
                  aria-label="희망 최소 전용면적"
                />
                <div className="wz-range-scale">
                  <span>15㎡ (약 4.5평)</span>
                  <span>60㎡ (약 18평)</span>
                </div>
              </div>

              <div className="wz-nav">
                <button className="wz-skip" onClick={() => setStep(1)}>
                  이전
                </button>
                <button
                  className="crm-btn crm-btn--accent crm-btn--lg"
                  onClick={() => void run()}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Spinner />
                      분석 중
                    </>
                  ) : (
                    '내 주거기회 보기'
                  )}
                </button>
              </div>
            </>
          )}
        </div>

        {recap.length > 0 && (
          <div className="wz-recap">
            {recap.map(r => (
              <Chip key={r}>{r}</Chip>
            ))}
          </div>
        )}

        <p style={{ fontSize: 12, color: 'var(--ink-3)', textAlign: 'center', marginTop: 22, lineHeight: 1.6 }}>
          AI 참고 분석입니다 · 공식 청약자격 판정이 아니며 지원 전 공고문 확인이 필요합니다
        </p>
      </div>
    </>
  )
}
