import Link from 'next/link'
import CrmShell from '@/components/crm/CrmShell'

const FLOW = [
  { name: '조건 저장', desc: '지역·예산·면적·유형을 한 번만 입력합니다.' },
  { name: '기회 탐지', desc: '신규 공고와 공실 발생을 시스템이 계속 감시합니다.' },
  { name: '판단', desc: 'Opportunity Score와 추천 사유로 지원 우선순위를 정리합니다.' },
  { name: '알림', desc: '가장 적합한 기회만 카카오톡으로 알려드립니다.' },
  { name: '지원 관리', desc: '접수·서류·발표 일정이 자동으로 생성됩니다.' },
  { name: '재지원', desc: '탈락해도 조건은 남습니다. 다음 기회로 바로 이어집니다.' },
]

const VALUE = [
  {
    k: 'HOOK',
    t: '무료 주거기회 분석',
    d: '내 조건으로 지금 지원 가능한 주택, 공고 적합도, 경쟁강도, 지원 우선순위를 한 화면에서 확인합니다.',
  },
  {
    k: 'CONVERSION',
    t: '조건 저장 → 자동 감시',
    d: '프로필을 저장하면 신규 공고와 공실이 생길 때마다 조건과 대조해 적합한 기회만 골라냅니다.',
  },
  {
    k: 'RETENTION',
    t: '쓸수록 줄어드는 노가다',
    d: '과거 입력정보·관심주택·지원이력·일정이 그대로 재사용됩니다. 두 번째 지원부터 준비 비용이 급감합니다.',
  },
]

export default function LandingPage() {
  return (
    <CrmShell>
      <div style={{ margin: '-32px -32px 0' }}>
        <section className="lp-hero">
          <div>
            <span className="lp-eyebrow">Housing Opportunity CRM</span>
            <h1 className="lp-title">
              내 조건을 한 번 알려주면
              <br />
              <em>맞는 집을 계속 찾고</em>
              <br />
              지원할 때까지 관리합니다.
            </h1>
            <p className="lp-sub">
              청약·임대 정보가 부족한 게 아닙니다. 매번 검색하고, 비교하고, 일정을 챙기는 비용이 큽니다.
              집플리즈는 조건을 저장해두면 기회를 대신 탐지하고 지원 우선순위까지 정리해 드립니다.
            </p>
            <div className="lp-cta-row">
              <Link href="/analyze" className="lp-cta lp-cta--primary">
                내 주거기회 분석하기
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
              <Link href="/dashboard" className="lp-cta lp-cta--ghost">
                운영 대시보드 보기
              </Link>
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 20, lineHeight: 1.6 }}>
              AI 참고 분석이며 공식 청약자격 판정이 아닙니다 · 지원 전 공고문 확인이 필요합니다
            </p>
          </div>

          <div className="lp-flow">
            <div className="lp-flow__title">반복되는 주거 지원 Workflow</div>
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
          <h2 className="lp-section-title">숫자가 아니라 판단을 드립니다</h2>
          <p className="lp-section-sub">
            같은 데이터도 해석되지 않으면 의사결정에 쓸 수 없습니다.
          </p>
          <div className="lp-compare">
            <div className="lp-compare__col lp-compare__col--bad">
              <div className="lp-compare__tag">일반 정보 서비스</div>
              <p className="lp-compare__text">&ldquo;A단지 경쟁률 20:1&rdquo;</p>
              <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 10, lineHeight: 1.6 }}>
                그래서 지원해야 하는지, 어디부터 봐야 하는지는 사용자가 알아서 판단해야 합니다.
              </p>
            </div>
            <div className="lp-compare__col lp-compare__col--good">
              <div className="lp-compare__tag">집플리즈</div>
              <p className="lp-compare__text">
                &ldquo;A단지는 선호지역이지만 경쟁강도가 높습니다. B단지는 선호지역에서 조금 벗어나지만
                비용·경쟁강도를 고려하면 지원 우선순위가 더 높습니다.&rdquo;
              </p>
              <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 10, lineHeight: 1.6 }}>
                Data → Interpretation → Action. 다음 행동까지 이어지는 형태로 변환합니다.
              </p>
            </div>
          </div>
        </section>

        <section className="lp-section">
          <h2 className="lp-section-title">검색 서비스가 아니라 CRM입니다</h2>
          <p className="lp-section-sub">
            고객 조건·자격·관심주택·지원이력·일정·결과가 누적될수록 다음 지원이 쉬워집니다.
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
          <h2 className="lp-section-title">Free로 시작하고, 필요할 때 자동화합니다</h2>
          <p className="lp-section-sub">현재는 전 기능 무료 체험 중입니다.</p>
          <div className="lp-price-grid">
            <div className="lp-price">
              <div className="lp-price__name">Free</div>
              <div className="lp-price__price">지금 사용 가능</div>
              <ul className="lp-price__list">
                <li><span className="lp-price__check">✓</span>내 조건 기반 주거기회 분석</li>
                <li><span className="lp-price__check">✓</span>Opportunity Score · 추천 사유</li>
                <li><span className="lp-price__check">✓</span>관심 주택 저장</li>
              </ul>
            </div>
            <div className="lp-price lp-price--pro">
              <div className="lp-price__name">
                Premium <span className="crm-chip crm-chip--accent" style={{ marginLeft: 6 }}>준비 중</span>
              </div>
              <div className="lp-price__price">지원 자동화 구독</div>
              <ul className="lp-price__list">
                <li><span className="lp-price__check">✦</span>실시간 공실·신규공고 알림</li>
                <li><span className="lp-price__check">✦</span>고급 맞춤추천 · 복수 공고 비교</li>
                <li><span className="lp-price__check">✦</span>지원이력 관리 · 서류 체크리스트</li>
                <li><span className="lp-price__check">✦</span>일정·마감 자동관리</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </CrmShell>
  )
}
