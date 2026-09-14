import Link from 'next/link'
import CrmShell from '@/components/crm/CrmShell'

const FLOW = [
  { name: '조건 저장', desc: '지역·예산·면적·유형을 한 번만 입력합니다.' },
  { name: '기회 탐지', desc: '새 공고와 빈 집이 생기는지 시스템이 계속 지켜봅니다.' },
  { name: '판단', desc: '어디부터 지원해야 하는지 우선순위와 이유를 정리합니다.' },
  { name: '알림', desc: '가장 잘 맞는 기회만 골라 카카오톡으로 알려드립니다.' },
  { name: '지원 관리', desc: '접수·서류·발표 일정이 자동으로 만들어집니다.' },
  { name: '재지원', desc: '떨어져도 조건은 남습니다. 다음 기회로 바로 이어집니다.' },
]

const VALUE = [
  {
    k: '무료로 시작',
    t: '내 조건으로 지금 뭘 넣을 수 있는지',
    d: '지원 가능한 주택, 조건이 얼마나 맞는지, 경쟁은 센지, 어디부터 넣어야 하는지를 한 화면에서 봅니다.',
  },
  {
    k: '조건 저장',
    t: '한 번 저장하면 계속 찾아드립니다',
    d: '새 공고나 빈 집이 생길 때마다 저장해 둔 조건과 대조해서, 맞는 것만 골라 알려드립니다.',
  },
  {
    k: '쓸수록 편해짐',
    t: '두 번째부터는 훨씬 빨라집니다',
    d: '전에 입력한 정보·관심주택·지원이력·일정이 그대로 남습니다. 매번 처음부터 할 필요가 없습니다.',
  },
]

export default function LandingPage() {
  return (
    <CrmShell>
      <div style={{ margin: 'calc(var(--s7) * -1) calc(var(--s7) * -1) 0' }}>
        <section className="lp-hero">
          <div>
            <span className="lp-eyebrow">청약·임대 기회 자동 탐지</span>
            <h1 className="lp-title">
              내 조건을 한 번 알려주면
              <br />
              <em>맞는 집을 계속 찾고</em>
              <br />
              지원할 때까지 관리합니다.
            </h1>
            <p className="lp-sub">
              청약·임대 정보가 없어서 못 넣는 게 아닙니다. 매번 찾아보고, 비교하고, 일정 챙기는 게 일입니다.
              집인사이트는 조건을 저장해두면 기회를 대신 찾고 어디부터 넣을지까지 정리해 드립니다.
            </p>
            <div className="lp-cta-row">
              <Link href="/analyze" className="lp-cta lp-cta--primary">
                1분 만에 내 기회 확인하기
                <svg
                  width="17"
                  height="17"
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
                작동 방식 보기
              </Link>
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 22, lineHeight: 1.6 }}>
              가입 없이 무료 · AI 참고 분석이며 공식 청약자격 판정이 아닙니다
            </p>
          </div>

          <div className="lp-flow">
            <div className="lp-flow__title">집 구할 때 매번 반복되는 일</div>
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
          <h2 className="lp-section-title">숫자만 보여드리지 않습니다</h2>
          <p className="lp-section-sub">경쟁률을 알아도, 그래서 뭘 해야 할지 모르면 소용이 없으니까요.</p>
          <div className="lp-compare">
            <div className="lp-compare__col lp-compare__col--bad">
              <div className="lp-compare__tag">보통의 정보 서비스</div>
              <p className="lp-compare__text">&ldquo;A단지 경쟁률 20:1&rdquo;</p>
              <p className="lp-compare__note">
                그래서 넣어야 하는지, 어디부터 봐야 하는지는 결국 내가 판단해야 합니다.
              </p>
            </div>
            <div className="lp-compare__col lp-compare__col--good">
              <div className="lp-compare__tag">집인사이트</div>
              <p className="lp-compare__text">
                &ldquo;A단지는 원하시는 지역이지만 경쟁이 셉니다. B단지는 지역이 조금 벗어나도 비용과 경쟁을
                같이 보면 여기부터 넣는 게 낫습니다.&rdquo;
              </p>
              <p className="lp-compare__note">
                바로 다음 행동으로 이어지는 형태로 바꿔서 알려드립니다.
              </p>
            </div>
          </div>
        </section>

        <section className="lp-section">
          <h2 className="lp-section-title">찾아주는 걸로 끝나지 않습니다</h2>
          <p className="lp-section-sub">
            조건·자격·관심주택·지원이력·일정·결과가 함께 쌓여서, 다음 지원이 계속 쉬워집니다.
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
          <h2 className="lp-section-title">지금은 전부 무료입니다</h2>
          <p className="lp-section-sub">자동화가 필요해지면 그때 선택하시면 됩니다.</p>
          <div className="lp-price-grid">
            <div className="lp-price">
              <div className="lp-price__name">무료</div>
              <div className="lp-price__price">지금 바로 사용 가능</div>
              <ul className="lp-price__list">
                <li>
                  <span className="lp-price__check">✓</span>내 조건으로 지원 가능한 주택 찾기
                </li>
                <li>
                  <span className="lp-price__check">✓</span>지원 우선순위와 그 이유
                </li>
                <li>
                  <span className="lp-price__check">✓</span>관심 주택 저장
                </li>
              </ul>
            </div>
            <div className="lp-price lp-price--pro">
              <div className="lp-price__name">
                프리미엄 <span className="crm-chip crm-chip--accent">준비 중</span>
              </div>
              <div className="lp-price__price">지원 준비를 대신해 주는 구독</div>
              <ul className="lp-price__list">
                <li>
                  <span className="lp-price__check">✦</span>새 공고·빈 집 실시간 알림
                </li>
                <li>
                  <span className="lp-price__check">✦</span>여러 공고 한눈에 비교
                </li>
                <li>
                  <span className="lp-price__check">✦</span>지원이력 관리 · 서류 체크리스트
                </li>
                <li>
                  <span className="lp-price__check">✦</span>마감 일정 자동 관리
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="lp-section" style={{ textAlign: 'center' }}>
          <h2 className="lp-section-title">조건 입력은 1분이면 끝납니다</h2>
          <p className="lp-section-sub" style={{ marginBottom: 26 }}>
            지역, 가구 유형, 예산 — 세 가지만 물어봅니다.
          </p>
          <Link href="/analyze" className="lp-cta lp-cta--primary">
            내 주거기회 분석하기
            <svg
              width="17"
              height="17"
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
