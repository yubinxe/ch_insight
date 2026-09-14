import Link from 'next/link'

export const metadata = { title: '청약 가이드 — 청약인사이트' }

const SECTIONS = [
  {
    title: '청년매입임대',
    who: '만 19~39세 무주택 청년',
    what: 'LH·지방공사가 사들인 주택을 시세의 40~50% 수준으로 빌려주는 제도예요. 보증금이 낮고 임대료 부담이 적은 편입니다.',
  },
  {
    title: '행복주택',
    who: '청년·신혼부부·대학생 등',
    what: '직장과 학교가 가까운 곳에 짓는 공공임대예요. 시세의 60~80% 수준이며 거주 기간이 정해져 있습니다.',
  },
  {
    title: '공공임대',
    who: '무주택 세대구성원',
    what: '장기간 살 수 있는 공공임대주택이에요. 소득·자산 기준이 있으며 재계약이 가능합니다.',
  },
  {
    title: '신혼희망타운',
    who: '혼인 7년 이내 신혼부부 등',
    what: '신혼부부에게 특화된 공급 유형이에요. 분양형과 임대형이 나뉘어 있습니다.',
  },
]

export default function GuidePage() {
  return (
    <div className="cs-wrap" style={{ paddingTop: 44, maxWidth: 820 }}>
      <h1 className="cs-page-title">청약 가이드</h1>
      <p className="cs-lead" style={{ marginTop: 16 }}>
        처음이면 용어부터 낯설어요. 자주 나오는 공급 유형만 먼저 정리했습니다.
      </p>

      <div className="cs-stack" style={{ marginTop: 36 }}>
        {SECTIONS.map(s => (
          <div key={s.title} className="cs-card">
            <div className="cs-step-card__title">{s.title}</div>
            <span className="cs-badge cs-badge--brand" style={{ marginBottom: 12 }}>
              {s.who}
            </span>
            <p className="cs-step-card__desc">{s.what}</p>
          </div>
        ))}
      </div>

      <div className="cs-card" style={{ marginTop: 32 }}>
        <div className="cs-step-card__title">꼭 기억해 주세요</div>
        <p className="cs-step-card__desc">
          같은 유형이라도 공고마다 자격요건과 소득·자산 기준이 다릅니다. 이 가이드는 이해를 돕기 위한
          설명이며, 실제 지원 가능 여부는 반드시 해당 공고의 공식 모집공고문에서 확인해 주세요.
        </p>
      </div>

      <div className="cs-cta-band" style={{ marginTop: 44 }}>
        <h2 className="cs-section-title" style={{ fontSize: 24 }}>
          내 조건으로 먼저 살펴볼까요?
        </h2>
        <Link href="/analyze" className="cs-btn cs-btn--primary" style={{ marginTop: 22 }}>
          내 조건으로 공고 찾기
        </Link>
      </div>
    </div>
  )
}
