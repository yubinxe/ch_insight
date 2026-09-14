import Link from 'next/link'
import HomeNoticeStrip from '@/components/consumer/HomeNoticeStrip'

const STEPS = [
  {
    title: '내 조건 확인하기',
    desc: '살고 싶은 동네와 감당할 수 있는 주거비. 딱 그 정도면 됩니다.',
  },
  {
    title: '관심공고 저장하기',
    desc: '마음에 드는 공고를 한곳에. 다음 방문에도 이어서 비교하세요.',
  },
  {
    title: '일정 챙기기',
    desc: '접수 마감과 서류 준비일을 공고 기준으로 정리해 드립니다.',
  },
]

const FAQ = [
  {
    q: '가입해야 볼 수 있나요?',
    a: '아니요. 가입 없이 조건을 넣고 후보와 추천 이유까지 다 보실 수 있어요. 관심 공고를 저장하거나 알림을 받고 싶어졌을 때, 그때 이메일과 비밀번호로 계정을 만들면 됩니다.',
  },
  {
    q: '알림은 어떤 내용이 오나요?',
    a: '새 공고와 관심공고 마감 알림을 선택할 수 있어요. 지금은 선택한 범위와 동의 시각만 저장하며 이메일은 발송하지 않습니다. 관심공고에서 설정을 해제할 수 있어요.',
  },
  {
    q: '여기서 추천받으면 자격이 확인된 건가요?',
    a: '아닙니다. 지금은 지역·주거비·면적처럼 희망 조건이 맞는지만 비교해 드립니다. 소득·자산·거주기간 같은 공식 자격요건은 확인하지 않으니, 지원 전 반드시 모집공고문을 읽어주세요.',
  },
  {
    q: '지금 보이는 공고는 진짜인가요?',
    a: '아닙니다. 현재 화면의 임대 공고는 서비스 구성을 보여드리기 위한 예시입니다. 공식 공고 연동은 준비 중이고, 연동 전까지 실제 공고인 척하지 않겠습니다.',
  },
]

/** 섹션 머리 — 잡지 목차처럼 번호와 괘선을 앞세운다 */
function SectionHead({
  index,
  title,
  sub,
  right,
}: {
  index: string
  title: string
  sub?: string
  right?: React.ReactNode
}) {
  return (
    <div className="cs-sec-head">
      <span className="cs-sec-index">{index}</span>
      <div className="cs-sec-head__body">
        <h2 className="cs-section-title">{title}</h2>
        {sub && (
          <p className="cs-sub" style={{ marginTop: 12 }}>
            {sub}
          </p>
        )}
      </div>
      {right}
    </div>
  )
}

export default function ConsumerHome() {
  return (
    <>
      {/* ── 첫 화면 ─────────────────────────────────────── */}
      <section className="cs-wrap cs-hero">
        <div>
          <span className="cs-eyebrow">청약부터 공공임대까지</span>

          <h1 className="cs-hero-title">
            내 조건에 맞는 집,
            <br />
            <em>기회부터</em> 찾아보세요.
          </h1>

          <p className="cs-lead" style={{ marginTop: 24, maxWidth: 520 }}>복잡한 공고를 하나씩 비교하지 않아도 괜찮아요.<br />내 조건에 맞는 후보를 찾고,<br className="cs-mobile-break" /> 관심공고의 일정까지 챙겨보세요.</p>

          <div className="cs-hero__cta">
            <Link href="/analyze" className="cs-btn cs-btn--primary">
              내 조건으로 공고 찾기
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
            <Link href="/notices" className="cs-btn cs-btn--text">
              모집공고 둘러보기
            </Link>
          </div>

          <p className="cs-note" style={{ marginTop: 20 }}>
            가입 없이 먼저 확인하세요 · 현재 예시 공고로 체험할 수 있어요
          </p>
        </div>

        {/* 결과 미리보기 — 실제 성과가 아니라 화면 예시임을 카드 안에 밝힌다 */}
        <div className="cs-preview">
          <div className="cs-card cs-card--lift">
            <span className="cs-notice__index">나에게 맞는 집은 이런 모습</span>

            <div className="cs-badge-row" style={{ marginBottom: 16 }}>
              <span className="cs-badge cs-badge--brand">청년매입임대</span>
              <span className="cs-badge cs-badge--ok">
                <span className="cs-badge__dot" />
                예산 범위 내
              </span>
              <span className="cs-sample">화면 예시</span>
            </div>

            <div className="cs-notice__name" style={{ minHeight: 'auto' }}>
              동작구 청년 매입임대
            </div>
            <p className="cs-notice__where">서울 동작구 · 전용 29㎡</p>

            <div className="cs-notice__price">
              <div className="cs-notice__deposit cs-num">6,500만원</div>
              <div className="cs-notice__rent cs-num">월 임대료 32만원</div>
            </div>

            <ul className="cs-notice__reasons">
              <li>희망 1순위 지역 동작구</li>
              <li>전용 29㎡ — 희망 최소 28㎡보다 1㎡ 넓음</li>
            </ul>

            <div className="cs-notice__caution">
              확인 필요 · 소득·자산 등 자격요건은 아직 확인하지 않았습니다
            </div>
          </div>

          <div className="cs-mini">
            <span className="cs-mini__icon" aria-hidden="true">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="4" y="5" width="16" height="15" rx="1" />
                <path d="M8 3v4M16 3v4M4 10h16" />
              </svg>
            </span>
            <div>
              <div className="cs-mini__title">관심공고의 일정을 한눈에</div>
              <div className="cs-mini__sub">공식 일정과 준비 권장일을 구분해요</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 지금 살펴볼 공고 ────────────────────────────── */}
      <HomeNoticeStrip />

      {/* ── 준비 순서 ───────────────────────────────────── */}
      <section className="cs-wrap cs-section">
        <SectionHead
          index="02"
          title="복잡한 청약, 이 순서로 준비하세요"
          sub="한 번에 다 알아보지 않으셔도 괜찮아요."
        />
        <div className="cs-steps3">
          {STEPS.map((s, i) => (
            <div key={s.title} className="cs-card">
              <span className="cs-step-card__num">STEP {String(i + 1).padStart(2, '0')}</span>
              <div className="cs-step-card__title">{s.title}</div>
              <p className="cs-step-card__desc">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 알림 ────────────────────────────────────────── */}
      <section className="cs-wrap cs-section">
        <SectionHead index="03" title="다음에도, 처음부터 찾지 않도록" />
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 28 }}>
          <p className="cs-lead" style={{ maxWidth: '44ch' }}>
            살고 싶은 동네와 주거비를 저장해두세요. 다음 방문에도 같은 조건으로 후보를 확인할 수 있어요. 새 공고·마감 알림은 수신 설정만 저장하며, 이메일 발송은 아직 준비 중입니다.
          </p>
          <div>
            <Link href="/analyze" className="cs-btn cs-btn--ghost">
              내 조건 저장하기
            </Link>
          </div>
        </div>
      </section>

      {/* ── 신뢰 ────────────────────────────────────────── */}
      <section className="cs-wrap cs-section">
        <SectionHead
          index="04"
          title="확인하고, 구분해서 보여드려요"
          sub="어디서 온 정보인지, 무엇을 아직 확인하지 않았는지 함께 적어둡니다."
        />
        <div className="cs-steps3">
          <div className="cs-card">
            <div className="cs-step-card__title">정보의 출처를 함께</div>
            <p className="cs-step-card__desc">
              공식 공고 원문이 있으면 링크를 함께 드립니다. 없으면 없다고 적고, 저희 상세 화면을 원문인
              것처럼 안내하지 않습니다.
            </p>
          </div>
          <div className="cs-card">
            <div className="cs-step-card__title">자격은 한 번 더 확인</div>
            <p className="cs-step-card__desc">
              소득·자산·거주기간 같은 공식 자격요건은 아직 확인하지 않습니다. 결과마다 그대로 적어
              둡니다.
            </p>
          </div>
          <div className="cs-card">
            <div className="cs-step-card__title">공식 일정과 준비일 구분</div>
            <p className="cs-step-card__desc">
              공고에 적힌 기한과 저희가 제안하는 준비일을 구분합니다. 공고에 없는 날짜는 미정으로
              둡니다.
            </p>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────── */}
      <section className="cs-wrap cs-section">
        <SectionHead index="05" title="처음이라 궁금하신 것들" />
        <div className="cs-faq">
          {FAQ.map(f => (
            <details key={f.q} className="cs-faq__item">
              <summary className="cs-faq__q">{f.q}</summary>
              <p className="cs-faq__a">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── 마지막 CTA ──────────────────────────────────── */}
      <section className="cs-wrap cs-section">
        <div className="cs-cta-band">
          <h2 className="cs-section-title">
            내 조건에 맞는 공고,
            <br />
            첫 후보부터 확인해보세요.
          </h2>
          <Link href="/analyze" className="cs-btn cs-btn--primary" style={{ marginTop: 30 }}>
            내 조건으로 공고 찾기
          </Link>
        </div>
      </section>
    </>
  )
}
