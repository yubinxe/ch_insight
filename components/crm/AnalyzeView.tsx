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
  { name: '관악구', hint: '1인가구 공급 최다' },
  { name: '동작구', hint: '노량진·상도권' },
  { name: '마포구', hint: '공덕·상암권' },
  { name: '영등포구', hint: '여의도 인접' },
  { name: '성동구', hint: '성수·왕십리권' },
  { name: '송파구', hint: '잠실권' },
  { name: '서초구', hint: '강남 인접' },
  { name: '강남구', hint: '고가·경쟁강도 상위' },
  { name: '금천구', hint: '가산디지털단지권' },
  { name: '서대문구', hint: '신촌·연희권' },
]

const HOUSEHOLDS: { name: string; hint: string; types: HousingType[] }[] = [
  { name: '1인가구', hint: '단독 세대', types: ['청년매입임대', '행복주택'] },
  { name: '신혼부부', hint: '혼인 7년 이내', types: ['행복주택', '신혼희망타운'] },
  { name: '2인가구', hint: '2인 세대', types: ['행복주택', '공공임대'] },
  { name: '다자녀', hint: '자녀 2인 이상', types: ['공공임대', '행복주택'] },
  { name: '한부모', hint: '한부모 세대', types: ['공공임대', '행복주택'] },
]

const HOUSING_HINT: Record<HousingType, string> = {
  청년매입임대: '만 19~39세 · 시세 대비 40~50%',
  행복주택: '청년·신혼 · 시세 대비 60~80%',
  공공임대: '장기 거주 · 재계약 가능',
  공공지원민간임대: '민간 공급 · 임대료 상한 적용',
  신혼희망타운: '신혼부부 특화 공급',
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
          title="진단 결과"
          sub={`${regions.join(' · ')} / ${household} 조건 기준 지원 가능 물건을 우선순위순으로 산출했습니다.`}
          right={
            <>
              <DemoFlag label="물건 데이터 : 시연용 합성" />
              <button className="crm-btn crm-btn--sm" onClick={restart}>
                조건 재입력
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
                  1순위 검토 대상 : <strong>{top.property.name}</strong>
                </h2>
                <p className="an-verdict__text">{result.insight || top.match.reason}</p>
              </div>
            </div>
          )}

          <Card>
            <CardHead
              title={`지원 가능 물건 ${result.results.length}건`}
              sub="지원 우선순위 점수 내림차순"
            />
            {result.results.length === 0 ? (
              <Empty title="조건에 부합하는 물건이 없습니다">
                예산 또는 지역 범위를 확대하면 후보군이 확보됩니다.
                <br />
                <button className="crm-btn crm-btn--sm" style={{ marginTop: 14 }} onClick={restart}>
                  조건 재입력
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
                          {open ? '접기' : '산출 근거'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="crm-note" style={{ marginTop: 18 }}>
              본 점수는 <strong>당첨확률이 아닙니다.</strong> 입력 조건 대비 지원 우선순위를 나타내는 지표이며,
              지역 30% · 가격 20% · 면적 15% · 주택유형 15% · 경쟁강도 10% · 마감 긴급도 10% 가중으로 산출합니다.
              지원 전 공식 모집공고문을 반드시 확인하시기 바랍니다.
            </div>
          </Card>

          <Card>
            <CardHead title="조건 등록 시 이후 절차 자동화" sub="업무용 도입 준비 중" />
            <div style={{ display: 'grid', gap: 11, fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.65 }}>
              <div>· 신규 공고·공실 발생 시 등록 조건과 자동 대조하여 적격 건만 통보합니다.</div>
              <div>· 관심물건 등록 시 접수·서류·발표 일정이 자동 편성됩니다.</div>
              <div>· 미당첨 시에도 조건이 유지되어 차기 공고로 즉시 연결됩니다.</div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
              <Link href="/dashboard" className="crm-btn crm-btn--accent">
                운영 화면 시연
              </Link>
              <button className="crm-btn" onClick={restart}>
                다른 조건으로 재산출
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
        title="조건진단"
        sub="희망지역·가구유형·예산 3개 항목을 입력하면 현재 지원 가능한 물건을 우선순위순으로 산출합니다."
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
              <div className="wz-step-label">STEP 1 / 3</div>
              <h2 className="wz-q">희망지역</h2>
              <p className="wz-help">최대 3개 지역까지 선택 가능합니다. 선택 순서가 지망 순위로 반영됩니다.</p>
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
                  미정 · 기본값 적용
                </button>
                <button
                  className="crm-btn crm-btn--accent crm-btn--lg"
                  onClick={() => setStep(1)}
                  disabled={regions.length === 0}
                >
                  {regions.length === 0 ? '지역 선택 필요' : '다음'}
                </button>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="wz-step-label">STEP 2 / 3</div>
              <h2 className="wz-q">가구유형 및 소득</h2>
              <p className="wz-help">가구유형 선택 시 지원 가능한 주택유형이 자동 설정됩니다. 하단에서 조정 가능합니다.</p>
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
                  <span className="wz-slider-name">지원 대상 주택유형</span>
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
                  <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>도시근로자 가구원수별 월평균소득 대비</span>
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
              <div className="wz-step-label">STEP 3 / 3</div>
              <h2 className="wz-q">예산 및 면적 요건</h2>
              <p className="wz-help">개략치로 입력해도 우선순위 산출에는 영향이 크지 않습니다.</p>

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
                  <span className="wz-slider-name">최소 전용면적</span>
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
                  <span>15㎡ · 4.5평</span>
                  <span>60㎡ · 18평</span>
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
                      산출 중
                    </>
                  ) : (
                    '지원 가능 물건 산출'
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
          산출 결과는 참고용이며 공식 청약자격 판정이 아닙니다 · 지원 전 모집공고문 확인 필요
        </p>
      </div>
    </>
  )
}
