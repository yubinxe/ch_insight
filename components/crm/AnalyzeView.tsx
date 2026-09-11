'use client'

import { useState } from 'react'
import { Card, CardHead } from '@/components/ui'
import { Chip, DemoFlag, Empty, ErrorBox, PageHead, ScoreBadge, ScoreBars } from './primitives'
import { shortDate, won } from './useSnapshot'
import { analyzeProfile, type AnalyzeResult } from '@/lib/crm/client'
import { HOUSING_TYPES, type HousingType } from '@/lib/crm/types'

const REGIONS = [
  '관악구', '동작구', '마포구', '영등포구', '성동구',
  '송파구', '서초구', '강남구', '금천구', '서대문구',
]

const HOUSEHOLDS = ['1인가구', '신혼부부', '2인가구', '다자녀', '한부모'] as const
const INCOMES = ['~50%', '50~70%', '70~100%', '100~120%', '120%~'] as const

export default function AnalyzeView() {
  const [regions, setRegions] = useState<string[]>(['동작구'])
  const [types, setTypes] = useState<HousingType[]>(['청년매입임대'])
  const [age, setAge] = useState('29')
  const [household, setHousehold] = useState<string>('1인가구')
  const [income, setIncome] = useState<string>('70~100%')
  const [maxDeposit, setMaxDeposit] = useState('8000')
  const [maxMonthlyRent, setMaxMonthlyRent] = useState('40')
  const [minArea, setMinArea] = useState('28')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AnalyzeResult | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)

  const toggleRegion = (r: string) =>
    setRegions(prev => (prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r].slice(-3)))

  const toggleType = (t: HousingType) =>
    setTypes(prev => (prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t].slice(-3)))

  const submit = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await analyzeProfile({
        age: Number(age),
        householdType: household,
        incomeBand: income,
        preferredRegions: regions,
        preferredHousingTypes: types,
        maxDeposit: Number(maxDeposit),
        maxMonthlyRent: Number(maxMonthlyRent),
        minArea: Number(minArea),
      })
      setResult(res)
      setOpenId(res.results[0]?.match.id ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '분석에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <PageHead
        title="내 주거기회 분석"
        sub="조건을 입력하면 지금 지원 가능한 주택과 지원 우선순위를 정리해 드립니다."
        right={<DemoFlag label="주택 데이터는 Demo 합성 데이터" />}
      />

      <Card>
        <CardHead title="내 조건" sub="한 번만 입력하면 이후 기회 탐지에 계속 재사용됩니다." />

        <div className="an-form-grid">
          <div className="an-field" style={{ gridColumn: '1 / -1' }}>
            <span className="an-field__label">희망지역 (최대 3곳 · 앞쪽이 1지망)</span>
            <div className="chip-wrap" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {REGIONS.map(r => (
                <button
                  key={r}
                  type="button"
                  className="an-toggle"
                  data-on={regions.includes(r) ? 'true' : 'false'}
                  onClick={() => toggleRegion(r)}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="an-field" style={{ gridColumn: '1 / -1' }}>
            <span className="an-field__label">관심 주택유형</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {HOUSING_TYPES.map(t => (
                <button
                  key={t}
                  type="button"
                  className="an-toggle"
                  data-on={types.includes(t) ? 'true' : 'false'}
                  onClick={() => toggleType(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <label className="an-field">
            <span className="an-field__label">나이</span>
            <input className="an-input" type="number" min={19} max={80} value={age} onChange={e => setAge(e.target.value)} />
          </label>

          <label className="an-field">
            <span className="an-field__label">가구 유형</span>
            <select className="an-select" value={household} onChange={e => setHousehold(e.target.value)}>
              {HOUSEHOLDS.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </label>

          <label className="an-field">
            <span className="an-field__label">소득 구간 (도시근로자 월평균 대비)</span>
            <select className="an-select" value={income} onChange={e => setIncome(e.target.value)}>
              {INCOMES.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </label>

          <label className="an-field">
            <span className="an-field__label">최대 보증금 (만원)</span>
            <input className="an-input" type="number" step={100} value={maxDeposit} onChange={e => setMaxDeposit(e.target.value)} />
          </label>

          <label className="an-field">
            <span className="an-field__label">최대 월 임대료 (만원)</span>
            <input className="an-input" type="number" step={1} value={maxMonthlyRent} onChange={e => setMaxMonthlyRent(e.target.value)} />
          </label>

          <label className="an-field">
            <span className="an-field__label">희망 최소 전용면적 (㎡)</span>
            <input className="an-input" type="number" step={1} value={minArea} onChange={e => setMinArea(e.target.value)} />
          </label>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 22, flexWrap: 'wrap' }}>
          <button className="crm-btn crm-btn--accent" onClick={submit} disabled={loading || regions.length === 0}>
            {loading ? '분석 중…' : '내 주거기회 분석하기'}
          </button>
          <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>
            AI 참고 분석입니다. 공식 청약자격 판정이 아니며 지원 전 공고문 확인이 필요합니다.
          </span>
        </div>
      </Card>

      {error && (
        <div style={{ marginTop: 'var(--gap)' }}>
          <ErrorBox message={error} onRetry={submit} />
        </div>
      )}

      {result && (
        <div style={{ marginTop: 'var(--gap)', display: 'grid', gap: 'var(--gap)' }}>
          {result.insight && (
            <Card>
              <CardHead title="지원 우선순위 판단" sub="점수 나열이 아니라 무엇부터 지원할지에 대한 해석입니다." />
              <p style={{ fontSize: 15.5, lineHeight: 1.7, color: 'var(--ink)', margin: 0 }}>
                {result.insight}
              </p>
            </Card>
          )}

          <Card>
            <CardHead
              title={`지원 가능 주택 ${result.results.length}건`}
              sub="Opportunity Score 순 · 클릭하면 점수 구성이 열립니다."
            />
            {result.results.length === 0 ? (
              <Empty>
                조건에 맞는 주택을 찾지 못했습니다.
                <br />
                예산이나 지역 범위를 조금 넓혀 보세요.
              </Empty>
            ) : (
              <div className="an-result">
                {result.results.map(({ match, property }, i) => {
                  const open = openId === match.id
                  return (
                    <div key={match.id} className="an-result__item" data-rank={i}>
                      <div style={{ minWidth: 0 }}>
                        <div className="an-result__name">{property.name}</div>
                        <div className="an-result__meta">
                          <span>{property.region} · {property.housingType}</span>
                          <span>전용 {property.area}㎡</span>
                          <span>보증금 {won(property.deposit)}원</span>
                          <span>월 {property.monthlyRent}만원</span>
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
                          <Chip tone={property.status === 'OPEN' ? 'accent' : 'default'}>
                            {property.status === 'OPEN' ? '접수중' : property.status === 'UPCOMING' ? '접수 예정' : '마감'}
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
                        <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>Opportunity Score</span>
                        <button
                          type="button"
                          className="crm-btn crm-btn--sm"
                          onClick={() => setOpenId(open ? null : match.id)}
                        >
                          {open ? '점수 접기' : '점수 구성'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <div className="crm-note" style={{ marginTop: 18 }}>
              Opportunity Score는 당첨확률이 아니라 <strong>내 조건 대비 지원 우선순위</strong> 점수입니다.
              지역 30% · 가격 20% · 면적 15% · 유형 15% · 경쟁강도 10% · 마감 긴급도 10%로 계산됩니다.
            </div>
          </Card>

          <Card>
            <CardHead title="조건을 저장하면" sub="Premium에서 제공될 자동화" />
            <div style={{ display: 'grid', gap: 10, fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.7 }}>
              <div>· 새 공고·공실이 생기면 조건과 자동 대조해 적합한 기회만 알려드립니다.</div>
              <div>· 관심 주택을 저장하면 접수·서류·발표 일정이 자동으로 생성됩니다.</div>
              <div>· 탈락해도 조건이 남아 다음 공고로 바로 이어집니다.</div>
            </div>
          </Card>
        </div>
      )}
    </>
  )
}
