import Link from 'next/link'
import CrmShell from '@/components/crm/CrmShell'

const FLOW = [
  { name: '조건 등록', desc: '희망지역·예산·면적·주택유형·자격요건을 1회 등록' },
  { name: '기회 탐지', desc: '신규 모집공고 및 공실 발생 시점 자동 감지' },
  { name: '대상 추출', desc: '등록 고객 전수와 조건 대조, 적격 고객만 선별' },
  { name: '우선순위 산출', desc: '지역·가격·면적·유형·경쟁강도·마감을 가중 반영' },
  { name: '통보', desc: '우선순위 상위 고객에게 맞춤 알림 발송' },
  { name: '지원·일정 관리', desc: '접수·서류·발표·계약 일정 자동 편성 및 추적' },
]

const VALUE = [
  {
    k: '탐지',
    t: '공고를 찾는 시간이 사라집니다',
    d: '모집공고와 공실 발생을 상시 감시합니다. 담당자가 사이트를 순회하며 확인할 필요가 없습니다.',
  },
  {
    k: '선별',
    t: '누구에게 알릴지 대조하지 않습니다',
    d: '건별로 고객 명부를 훑는 대신, 등록된 조건과 자동 대조해 적격 고객만 점수순으로 제시합니다.',
  },
  {
    k: '축적',
    t: '두 번째 상담부터 원가가 달라집니다',
    d: '조건·자격·관심물건·지원이력·결과가 고객 단위로 누적됩니다. 재상담 시 재확인 절차가 불필요합니다.',
  },
]

export default function LandingPage() {
  return (
    <CrmShell>
      <div style={{ margin: 'calc(var(--s7) * -1) calc(var(--s7) * -1) 0' }}>
        <section className="lp-hero">
          <div>
            <span className="lp-eyebrow">임대·청약 기회 탐지 및 지원관리 시스템</span>
            <h1 className="lp-title">
              공고는 매주 뜨는데,
              <br />
              <em>누구에게 알릴지</em>는
              <br />
              매번 처음부터 찾습니다.
            </h1>
            <p className="lp-sub">
              정보가 부족한 것이 아닙니다. 공고를 찾고, 조건을 대조하고, 일정을 챙기는 반복 업무가 비용입니다.
              집인사이트는 고객 조건을 1회 등록해두면 신규 공고·공실 발생 시점에 대상 고객을 자동 추출하고,
              지원 우선순위와 절차 일정까지 산출합니다.
            </p>
            <div className="lp-cta-row">
              <Link href="/analyze" className="lp-cta lp-cta--primary">
                조건진단 실행
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
              <Link href="/dashboard" className="lp-cta lp-cta--ghost">
                운영 화면 시연
              </Link>
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 22, lineHeight: 1.7 }}>
              가입 절차 없이 즉시 확인 가능 · 분석 결과는 참고용이며 공식 청약자격 판정이 아닙니다
            </p>
          </div>

          <div className="lp-flow">
            <div className="lp-flow__title">처리 절차</div>
            {FLOW.map((s, i) => (
              <div key={s.name} className="lp-flow__step" data-hot={i === 2 || i === 3 ? 'true' : 'false'}>
                <span className="lp-flow__num">{i + 1}</span>
                <div>
                  <div className="lp-flow__name">{s.name}</div>
                  <div className="lp-flow__desc">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="lp-section">
          <h2 className="lp-section-title">정보 제공이 아니라 판단 근거를 제시합니다</h2>
          <p className="lp-section-sub">
            경쟁률 수치만으로는 어느 건을 먼저 권할지 결정할 수 없습니다.
          </p>
          <div className="lp-compare">
            <div className="lp-compare__col lp-compare__col--bad">
              <div className="lp-compare__tag">일반 정보 서비스</div>
              <p className="lp-compare__text">&ldquo;A단지 경쟁률 20:1&rdquo;</p>
              <p className="lp-compare__note">
                해석과 우선순위 판단은 전적으로 담당자 몫으로 남습니다.
              </p>
            </div>
            <div className="lp-compare__col lp-compare__col--good">
              <div className="lp-compare__tag">집인사이트</div>
              <p className="lp-compare__text">
                &ldquo;A단지는 희망지역에 부합하나 경쟁강도가 높습니다. B단지는 지역 적합도가 다소 낮으나
                비용과 경쟁강도를 함께 고려하면 지원 우선순위가 상위입니다.&rdquo;
              </p>
              <p className="lp-compare__note">
                점수와 함께 산출 근거를 문장으로 제시해, 고객 응대에 그대로 사용할 수 있습니다.
              </p>
            </div>
          </div>
        </section>

        <section className="lp-section">
          <h2 className="lp-section-title">단건 중개가 아니라 고객 관리로 전환합니다</h2>
          <p className="lp-section-sub">
            조건·자격·관심물건·지원이력·일정·결과가 고객 단위로 누적됩니다.
          </p>
          <div className="lp-grid-3">
            {VALUE.map(v => (
              <div key={v.k} className="lp-card">
                <div className="lp-card__k">{v.k}</div>
                <div className="lp-card__t">{v.t}</div>
                <div className="lp-card__d">{v.d}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="lp-section">
          <h2 className="lp-section-title">도입 범위</h2>
          <p className="lp-section-sub">현재 전 기능을 무상 제공하고 있습니다.</p>
          <div className="lp-price-grid">
            <div className="lp-price">
              <div className="lp-price__name">기본</div>
              <div className="lp-price__price">현재 무상 제공</div>
              <ul className="lp-price__list">
                <li>
                  <span className="lp-price__check">·</span>고객 조건 기반 지원 가능 물건 산출
                </li>
                <li>
                  <span className="lp-price__check">·</span>지원 우선순위 점수 및 산출 근거
                </li>
                <li>
                  <span className="lp-price__check">·</span>관심물건 등록
                </li>
              </ul>
            </div>
            <div className="lp-price lp-price--pro">
              <div className="lp-price__name">
                업무용 <span className="crm-chip crm-chip--accent">도입 준비 중</span>
              </div>
              <div className="lp-price__price">중개·임대관리 사업자 대상</div>
              <ul className="lp-price__list">
                <li>
                  <span className="lp-price__check">·</span>신규 공고·공실 실시간 통보
                </li>
                <li>
                  <span className="lp-price__check">·</span>복수 공고 동시 비교 및 배정
                </li>
                <li>
                  <span className="lp-price__check">·</span>지원이력 관리 · 구비서류 체크리스트
                </li>
                <li>
                  <span className="lp-price__check">·</span>접수·발표·계약 마감 자동 관리
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="lp-section" style={{ textAlign: 'center' }}>
          <h2 className="lp-section-title" style={{ display: 'inline-block' }}>
            조건 입력은 3단계로 끝납니다
          </h2>
          <p className="lp-section-sub" style={{ marginBottom: 26 }}>
            희망지역 · 가구유형 · 예산 세 항목만 확인합니다.
          </p>
          <Link href="/analyze" className="lp-cta lp-cta--primary">
            조건진단 실행
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        </section>
      </div>
    </CrmShell>
  )
}
