'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { useConsumer } from './ConsumerProvider'
import type { SearchProfile } from '@/lib/crm/types'
import { HOUSING_TYPES, type Homeownership, type HousingType } from '@/lib/crm/types'

const REGIONS: { name: string; hint: string }[] = [
  { name: '관악구', hint: '신림·봉천 일대' },
  { name: '동작구', hint: '노량진·상도 일대' },
  { name: '마포구', hint: '공덕·상암 일대' },
  { name: '영등포구', hint: '여의도가 가까워요' },
  { name: '성동구', hint: '성수·왕십리 일대' },
  { name: '송파구', hint: '잠실 일대' },
  { name: '서초구', hint: '강남이 가까워요' },
  { name: '강남구', hint: '임대료가 높은 편' },
  { name: '금천구', hint: '가산디지털단지 일대' },
  { name: '서대문구', hint: '신촌·연희 일대' },
]

const HOUSEHOLDS: { name: string; hint: string; types: HousingType[] }[] = [
  { name: '1인가구', hint: '혼자 살아요', types: ['청년매입임대', '행복주택'] },
  { name: '신혼부부', hint: '혼인 7년 이내', types: ['행복주택', '신혼희망타운'] },
  { name: '2인가구', hint: '둘이 살아요', types: ['행복주택', '공공임대'] },
  { name: '다자녀', hint: '자녀 2명 이상', types: ['공공임대', '행복주택'] },
  { name: '한부모', hint: '한부모 가족', types: ['공공임대', '행복주택'] },
]

const TYPE_HINT: Record<HousingType, string> = {
  청년매입임대: '청년 대상 · 자격은 공고별 확인',
  행복주택: '청년·신혼 등 · 공고별 확인',
  공공임대: '오래 살 수 있어요',
  공공지원민간임대: '민간 공급 · 임대료 상한이 있어요',
  신혼희망타운: '신혼부부를 위한 공급',
}

const TOTAL = 4

function manToKorean(man: number) {
  if (man >= 10000) {
    const eok = Math.floor(man / 10000)
    const rest = man % 10000
    return rest ? `${eok}억 ${rest.toLocaleString()}만원` : `${eok}억원`
  }
  return `${man.toLocaleString()}만원`
}

export default function SearchWizard() {
  const { profile, loading } = useConsumer()
  if (loading) return <div className="cs-wrap" role="status" style={{ paddingTop: 48 }}>저장한 조건을 확인하고 있어요…</div>
  return <WizardForm initial={profile} />
}

function WizardForm({ initial }: { initial: SearchProfile | null }) {
  const { refresh } = useConsumer()
  const router = useRouter()
  const [step, setStep] = useState(0)

  const [regions, setRegions] = useState<string[]>(initial?.regions ?? [])
  const [deposit, setDeposit] = useState(initial?.maxDeposit ?? 8000)
  const [rent, setRent] = useState(initial?.maxMonthlyRent ?? 40)
  const [area, setArea] = useState(initial?.minArea ?? 28)
  /** 사용자가 "아직 정하지 않았어요"를 고른 항목 — 임의값으로 바꾸지 않는다 */
  const [unknown, setUnknown] = useState<Record<string, boolean>>({ deposit: initial?.unknownFields.includes('maxDeposit') ?? false, rent: initial?.unknownFields.includes('maxMonthlyRent') ?? false, area: initial?.unknownFields.includes('minArea') ?? false })
  const [household, setHousehold] = useState(initial?.householdType ?? '')
  const [types, setTypes] = useState<HousingType[]>(initial?.housingTypes ?? [])

  /* ── 4단계: 자격·가점 항목. 고르지 않으면 null 을 지킨다 ── */
  const [ownership, setOwnership] = useState<Homeownership | ''>(initial?.homeownership ?? '')
  const [homelessYears, setHomelessYears] = useState(initial?.homelessYears ?? 0)
  const [residencyYears, setResidencyYears] = useState(initial?.residencyYears ?? 0)
  const [accountYears, setAccountYears] = useState(initial?.accountYears ?? 0)
  const [dependents, setDependents] = useState(initial?.dependents ?? 0)
  /** 자격 항목을 건드렸는지. 손대지 않았으면 0 이 아니라 "모름"으로 보낸다 */
  const [touchedQual, setTouchedQual] = useState(false)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const raw = sessionStorage.getItem('ci-search-draft')
    if (!raw) return
    try {
      const d = JSON.parse(raw)
      queueMicrotask(() => { setRegions(d.regions); setDeposit(d.deposit); setRent(d.rent); setArea(d.area); setUnknown(d.unknown); setHousehold(d.household); setTypes(d.types); setStep(d.step) })
    } catch { sessionStorage.removeItem('ci-search-draft') }
  }, [])
  useEffect(() => {
    sessionStorage.setItem('ci-search-draft', JSON.stringify({ regions, deposit, rent, area, unknown, household, types, step }))
  }, [regions, deposit, rent, area, unknown, household, types, step])

  const toggleRegion = (name: string) =>
    setRegions(prev =>
      prev.includes(name) ? prev.filter(r => r !== name) : prev.length >= 3 ? prev : [...prev, name],
    )

  const toggleType = (t: HousingType) =>
    setTypes(prev => (prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]))

  const pickHousehold = (h: (typeof HOUSEHOLDS)[number]) => {
    setHousehold(h.name)
    setTypes(h.types)
  }

  const markUnknown = (field: string) => setUnknown(prev => ({ ...prev, [field]: !prev[field] }))

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          regions,
          householdType: household || null,
          housingTypes: types,
          // 정하지 않은 항목은 보내지 않는다. 서버가 UNKNOWN 으로 보존한다.
          maxDeposit: unknown.deposit ? null : deposit,
          maxMonthlyRent: unknown.rent ? null : rent,
          minArea: unknown.area ? null : area,
          // 손대지 않은 자격 항목은 0 이 아니라 "모름"이다. 0 으로 보내면
          // 화면이 "무주택 0년"을 사실처럼 보여주게 된다.
          homeownership: ownership || null,
          homelessYears: touchedQual ? homelessYears : null,
          residencyYears: touchedQual ? residencyYears : null,
          accountYears: touchedQual ? accountYears : null,
          dependents: touchedQual ? dependents : null,
        }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error ?? '후보를 찾지 못했어요.')
      sessionStorage.removeItem('ci-search-draft')
      await refresh()
      router.push('/results')
    } catch (err) {
      setError(err instanceof Error ? err.message : '후보를 찾지 못했어요.')
      setBusy(false)
    }
  }

  const recap = useMemo(() => {
    const out: string[] = []
    if (step > 0 && regions.length) out.push(regions.join(' · '))
    if (step > 1) {
      const parts: string[] = []
      if (!unknown.deposit) parts.push(`보증금 ${manToKorean(deposit)}`)
      if (!unknown.rent) parts.push(`월세 ${rent}만원`)
      if (parts.length) out.push(parts.join(' · '))
    }
    return out
  }, [step, regions, deposit, rent, unknown])

  return (
    <div className="cs-wrap" style={{ paddingTop: 48 }}>
      <div className="cs-form">
        <div
          className="cs-steps"
          role="progressbar"
          aria-valuenow={step + 1}
          aria-valuemin={1}
          aria-valuemax={TOTAL}
          aria-label={`${TOTAL}단계 중 ${step + 1}단계`}
        >
          {Array.from({ length: TOTAL }).map((_, i) => (
            <span
              key={i}
              className="cs-steps__seg"
              data-state={i < step ? 'done' : i === step ? 'current' : 'todo'}
            >
              <span className="cs-steps__fill" />
            </span>
          ))}
        </div>

        {error && (
          <div className="cs-error" style={{ marginBottom: 20 }}>
            <span>{error}</span>
          </div>
        )}

        <div className="cs-card" key={step}>
          {/* ── 1단계 지역 ─────────────────────────── */}
          {step === 0 && (
            <>
              <div className="cs-step-label">1 / 4</div>
              <h1 className="cs-q">어느 지역을 찾고 계세요?</h1>
              <p className="cs-sub" style={{ marginBottom: 28 }}>
                최대 3곳까지 고를 수 있어요. 먼저 고른 곳을 더 중요하게 봅니다.
              </p>

              <div className="cs-choices">
                {REGIONS.map(r => {
                  const idx = regions.indexOf(r.name)
                  const on = idx >= 0
                  return (
                    <button
                      key={r.name}
                      type="button"
                      className="cs-choice"
                      data-on={on ? 'true' : 'false'}
                      onClick={() => toggleRegion(r.name)}
                      disabled={!on && regions.length >= 3}
                      aria-pressed={on}
                    >
                      {on && <span className="cs-choice__rank">{idx + 1}</span>}
                      {r.name}
                      <span className="cs-choice__sub">{r.hint}</span>
                    </button>
                  )
                })}
              </div>

              <div className="cs-form-nav">
                <span />
                <button
                  className="cs-btn cs-btn--primary"
                  onClick={() => setStep(1)}
                  disabled={regions.length === 0}
                >
                  {regions.length === 0 ? '지역을 골라주세요' : '다음'}
                </button>
              </div>
            </>
          )}

          {/* ── 2단계 주거비 ───────────────────────── */}
          {step === 1 && (
            <>
              <div className="cs-step-label">2 / 4</div>
              <h1 className="cs-q">주거비는 어느 정도 생각하세요?</h1>
              <p className="cs-sub" style={{ marginBottom: 8 }}>
                입력하신 금액을 넘는 공고는 따로 구분해서 보여드려요.
              </p>

              <div className="cs-field">
                <div className="cs-field__row">
                  <label className="cs-field__label" htmlFor="deposit" style={{ marginBottom: 0 }}>
                    보증금 상한
                  </label>
                  {!unknown.deposit && <span className="cs-field__value">{manToKorean(deposit)}</span>}
                </div>
                {!unknown.deposit && (
                  <>
                    <div className="cs-amount">
                      <input
                        id="deposit"
                        className="cs-input"
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step={100}
                        value={deposit}
                        onChange={e => setDeposit(Math.max(0, Number(e.target.value)))}
                      />
                      <span className="cs-amount__unit">만원</span>
                    </div>
                    <input
                      className="cs-range"
                      type="range"
                      min={1000}
                      max={30000}
                      step={500}
                      value={Math.min(30000, deposit)}
                      onChange={e => setDeposit(Number(e.target.value))}
                      aria-label="보증금 상한 조절"
                    />
                    <div className="cs-range-scale">
                      <span>1,000만원</span>
                      <span>3억원</span>
                    </div>
                  </>
                )}
                <button
                  className="cs-btn cs-btn--text"
                  style={{ paddingLeft: 0 }}
                  onClick={() => markUnknown('deposit')}
                >
                  {unknown.deposit ? '금액 입력할게요' : '아직 정하지 않았어요'}
                </button>
              </div>

              <div className="cs-field">
                <div className="cs-field__row">
                  <label className="cs-field__label" htmlFor="rent" style={{ marginBottom: 0 }}>
                    월 임대료 상한
                  </label>
                  {!unknown.rent && <span className="cs-field__value">{rent.toLocaleString()}만원</span>}
                </div>
                {!unknown.rent && (
                  <>
                    <div className="cs-amount">
                      <input
                        id="rent"
                        className="cs-input"
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step={1}
                        value={rent}
                        onChange={e => setRent(Math.max(0, Number(e.target.value)))}
                      />
                      <span className="cs-amount__unit">만원</span>
                    </div>
                    <input
                      className="cs-range"
                      type="range"
                      min={0}
                      max={150}
                      step={1}
                      value={Math.min(150, rent)}
                      onChange={e => setRent(Number(e.target.value))}
                      aria-label="월 임대료 상한 조절"
                    />
                    <div className="cs-range-scale">
                      <span>0만원</span>
                      <span>150만원</span>
                    </div>
                  </>
                )}
                <button
                  className="cs-btn cs-btn--text"
                  style={{ paddingLeft: 0 }}
                  onClick={() => markUnknown('rent')}
                >
                  {unknown.rent ? '금액 입력할게요' : '아직 정하지 않았어요'}
                </button>
              </div>

              <div className="cs-form-nav">
                <button className="cs-btn cs-btn--text" onClick={() => setStep(0)}>
                  이전
                </button>
                <button className="cs-btn cs-btn--primary" onClick={() => setStep(2)}>
                  다음
                </button>
              </div>
            </>
          )}

          {/* ── 3단계 가구·선호 ────────────────────── */}
          {step === 2 && (
            <>
              <div className="cs-step-label">3 / 4</div>
              <h1 className="cs-q">어떤 가구이신가요?</h1>
              <p className="cs-sub" style={{ marginBottom: 28 }}>
                선택은 건너뛰어도 괜찮아요. 가구 선택만으로 지원 자격이 확정되지는 않아요.
              </p>

              <div className="cs-choices">
                {HOUSEHOLDS.map(h => (
                  <button
                    key={h.name}
                    type="button"
                    className="cs-choice"
                    data-on={household === h.name ? 'true' : 'false'}
                    onClick={() => pickHousehold(h)}
                    aria-pressed={household === h.name}
                  >
                    {h.name}
                    <span className="cs-choice__sub">{h.hint}</span>
                  </button>
                ))}
              </div>

              <div className="cs-field">
                <span className="cs-field__label">관심 있는 주택 유형</span>
                <div className="cs-choices">
                  {HOUSING_TYPES.map(t => (
                    <button
                      key={t}
                      type="button"
                      className="cs-choice"
                      data-on={types.includes(t) ? 'true' : 'false'}
                      onClick={() => toggleType(t)}
                      aria-pressed={types.includes(t)}
                    >
                      {t}
                      <span className="cs-choice__sub">{TYPE_HINT[t]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="cs-field">
                <div className="cs-field__row">
                  <label className="cs-field__label" htmlFor="area" style={{ marginBottom: 0 }}>
                    희망 최소 면적
                  </label>
                  {!unknown.area && (
                    <span className="cs-field__value">
                      {area}㎡ <span style={{ fontSize: 16, color: 'var(--muted)' }}>약 {Math.round(area / 3.3)}평</span>
                    </span>
                  )}
                </div>
                {!unknown.area && (
                  <>
                    <input
                      className="cs-range"
                      type="range"
                      min={15}
                      max={85}
                      step={1}
                      value={area}
                      onChange={e => setArea(Number(e.target.value))}
                      aria-label="희망 최소 면적 조절"
                    />
                    <div className="cs-range-scale">
                      <span>15㎡ · 약 5평</span>
                      <span>85㎡ · 약 26평</span>
                    </div>
                  </>
                )}
                <button
                  className="cs-btn cs-btn--text"
                  style={{ paddingLeft: 0 }}
                  onClick={() => markUnknown('area')}
                >
                  {unknown.area ? '면적 입력할게요' : '아직 정하지 않았어요'}
                </button>
              </div>

              <div className="cs-form-nav">
                <button className="cs-btn cs-btn--text" onClick={() => setStep(1)}>
                  이전
                </button>
                <button className="cs-btn cs-btn--primary" onClick={() => setStep(3)}>
                  다음
                </button>
              </div>
            </>
          )}

          {/* ── 4단계 자격·가점 ─────────────────────── */}
          {step === 3 && (
            <>
              <div className="cs-step-label">4 / 4</div>
              <h1 className="cs-q">자격을 가르는 항목도 알려주시겠어요?</h1>
              <p className="cs-sub" style={{ marginBottom: 28 }}>
                무주택 여부와 거주기간은 공고마다 요건이 다릅니다. 적어두시면 공고를 볼 때 무엇을 더
                확인해야 하는지 함께 짚어 드리고, 가점 계산도 이 값으로 열려요.
                <br />
                전부 건너뛰셔도 후보는 그대로 보실 수 있어요.
              </p>

              <div className="cs-field">
                <span className="cs-field__label">주택 소유</span>
                <div className="cs-choices">
                  {(
                    [
                      { v: 'NONE', name: '무주택', hint: '세대구성원 전원 무주택' },
                      { v: 'ONE', name: '1주택', hint: '처분 조건 공급이 있어요' },
                      { v: 'MANY', name: '2주택 이상', hint: '지원 가능한 유형이 좁아져요' },
                    ] as const
                  ).map(o => (
                    <button
                      key={o.v}
                      type="button"
                      className="cs-choice"
                      data-on={ownership === o.v}
                      onClick={() => {
                        setOwnership(ownership === o.v ? '' : (o.v as Homeownership))
                        setTouchedQual(true)
                      }}
                    >
                      <span className="cs-choice__name">{o.name}</span>
                      <span className="cs-choice__sub">{o.hint}</span>
                    </button>
                  ))}
                </div>
              </div>

              {(
                [
                  { key: 'homeless', label: '무주택 기간', unit: '년', max: 16, v: homelessYears, set: setHomelessYears, hint: '가점 32점 항목 · 1년당 2점' },
                  { key: 'residency', label: '해당지역 거주기간', unit: '년', max: 30, v: residencyYears, set: setResidencyYears, hint: '순위·우선공급을 가르는 기준이에요' },
                  { key: 'account', label: '청약통장 가입기간', unit: '년', max: 17, v: accountYears, set: setAccountYears, hint: '가점 17점 항목 · 1년당 1점' },
                  { key: 'dependents', label: '부양가족 수', unit: '명', max: 6, v: dependents, set: setDependents, hint: '가점 35점 항목 · 본인 제외' },
                ] as const
              ).map(f => (
                <div className="cs-field" key={f.key}>
                  <div className="cs-field__row">
                    <label className="cs-field__label" htmlFor={`q-${f.key}`} style={{ marginBottom: 0 }}>
                      {f.label}
                    </label>
                    <span className="cs-num" style={{ fontWeight: 700, color: 'var(--title)' }}>
                      {f.v}
                      {f.unit}
                    </span>
                  </div>
                  <input
                    id={`q-${f.key}`}
                    type="range"
                    className="cs-range"
                    min={0}
                    max={f.max}
                    step={1}
                    value={f.v}
                    onChange={e => {
                      f.set(Number(e.target.value))
                      setTouchedQual(true)
                    }}
                  />
                  <p className="cs-note">{f.hint}</p>
                </div>
              ))}

              <div className="cs-form-nav">
                <button className="cs-btn cs-btn--text" onClick={() => setStep(2)}>
                  이전
                </button>
                <button className="cs-btn cs-btn--primary" onClick={submit} disabled={busy}>
                  {busy ? '찾는 중…' : '내 후보 확인하기'}
                </button>
              </div>
            </>
          )}
        </div>

        {recap.length > 0 && (
          <div className="cs-recap">
            {recap.map(r => (
              <span key={r} className="cs-summary__chip">
                {r}
              </span>
            ))}
          </div>
        )}

        <p className="cs-note" style={{ textAlign: 'center', marginTop: 22 }}>
          소득·자산 같은 공식 자격요건은 이 단계에서 묻지 않습니다. 결과를 보신 뒤 필요할 때 확인해요.
        </p>
      </div>
    </div>
  )
}
