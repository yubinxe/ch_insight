const pptxgen = require('pptxgenjs')

const FONT = process.env.DECK_FONT || 'Pretendard'
const p = new pptxgen()
p.layout = 'LAYOUT_WIDE'            // 13.3 x 7.5
p.author = 'JibCatch'
p.title = '집캐치 발표자료'

/* ── 디자인 토큰 ───────────────────────────── */
const NAVY = '0B1F3A'   // 주조색 (60~70%)
const NAVY2 = '17375E'  // 보조 네이비
const ORANGE = 'FF6B2C' // 강조 · CTA
const SAND = 'FFF1E9'   // 오렌지 톤 배경
const ICE = 'EEF3F9'    // 카드 배경
const LINE = 'D8E2EE'
const GRAY = '5B6B7F'
const GRAY2 = '8A99AB'
const WHITE = 'FFFFFF'

const W = 13.3, H = 7.5, M = 0.75
const CW = W - M * 2                 // 콘텐츠 폭 11.8

let pageNo = 0

function shadow() {
  return { type: 'outer', color: 'A8B6C8', blur: 10, offset: 2, angle: 90, opacity: 0.28 }
}

function slide(dark) {
  const s = p.addSlide()
  s.background = { color: dark ? NAVY : WHITE }
  return s
}

/** kicker + 헤드라인 + 서브카피 (한국형 기업 PT 헤더) */
function head(s, kicker, title, sub) {
  s.addText(kicker, {
    x: M, y: 0.52, w: CW, h: 0.3, fontSize: 12.5, bold: true, color: ORANGE,
    charSpacing: 2, fontFace: FONT, isTextBox: true, margin: 0,
  })
  s.addText(title, {
    x: M, y: 0.88, w: CW, h: 0.72, fontSize: 36, bold: true, color: NAVY,
    fontFace: FONT, isTextBox: true, margin: 0, charSpacing: -0.5,
  })
  if (sub) {
    s.addText(sub, {
      x: M, y: 1.66, w: CW, h: 0.36, fontSize: 14.5, color: GRAY,
      fontFace: FONT, isTextBox: true, margin: 0,
    })
  }
}

/** 하단 브랜드 워드마크 + 페이지 번호 */
function foot(s) {
  pageNo += 1
  s.addText('집캐치  JibCatch', {
    x: M, y: 6.92, w: 4, h: 0.3, fontSize: 10, color: GRAY2,
    fontFace: FONT, isTextBox: true, margin: 0,
  })
  s.addText(String(pageNo).padStart(2, '0'), {
    x: W - M - 1, y: 6.92, w: 1, h: 0.3, fontSize: 10, bold: true, color: GRAY2,
    align: 'right', fontFace: FONT, isTextBox: true, margin: 0,
  })
}

function card(s, x, y, w, h, fill, noShadow) {
  const o = {
    x, y, w, h, rectRadius: 0.14,
    fill: { color: fill || ICE },
    line: { color: fill && fill !== ICE ? fill : LINE, width: 1 },
  }
  if (!noShadow) o.shadow = shadow()
  s.addShape(p.ShapeType.roundRect, o)
}

function badge(s, x, y, text, bg, fg, w) {
  const bw = w || 1.05
  s.addShape(p.ShapeType.roundRect, { x, y, w: bw, h: 0.4, rectRadius: 0.2, fill: { color: bg } })
  s.addText(text, {
    x, y, w: bw, h: 0.4, fontSize: 12, bold: true, color: fg || WHITE,
    align: 'center', valign: 'middle', fontFace: FONT, isTextBox: true, margin: 0,
  })
}

function numDot(s, x, y, n, bg, fg, d) {
  const dd = d || 0.48
  s.addShape(p.ShapeType.ellipse, { x, y, w: dd, h: dd, fill: { color: bg || ORANGE } })
  s.addText(String(n), {
    x, y, w: dd, h: dd, fontSize: 15, bold: true, color: fg || WHITE,
    align: 'center', valign: 'middle', fontFace: FONT, isTextBox: true, margin: 0,
  })
}

/** 하단 한 줄 메시지 배너 (강조 카피) */
function banner(s, y, text, tone) {
  const warm = tone === 'warm'
  s.addShape(p.ShapeType.roundRect, {
    x: M, y, w: CW, h: 0.88, rectRadius: 0.14,
    fill: { color: warm ? SAND : NAVY },
    line: { color: warm ? ORANGE : NAVY, width: 1 },
  })
  s.addText(text, {
    x: M + 0.45, y, w: CW - 0.9, h: 0.88, fontSize: 16.5, bold: true,
    color: warm ? 'B3431A' : WHITE, valign: 'middle', fontFace: FONT, isTextBox: true, margin: 0,
  })
}

/** 섹션 구분 페이지 */
function section(no, title, sub, items, active) {
  const s = slide(true)
  s.addShape(p.ShapeType.ellipse, { x: 10.2, y: -1.4, w: 5.2, h: 5.2, fill: { color: NAVY2 } })
  s.addText(no, {
    x: M, y: 1.95, w: 3, h: 1.5, fontSize: 96, bold: true, color: ORANGE,
    fontFace: FONT, isTextBox: true, margin: 0,
  })
  s.addText(title, {
    x: M, y: 3.5, w: 8.6, h: 0.8, fontSize: 40, bold: true, color: WHITE,
    fontFace: FONT, isTextBox: true, margin: 0, charSpacing: -0.5,
  })
  s.addText(sub, {
    x: M, y: 4.4, w: 8.6, h: 0.4, fontSize: 16, color: '9FB6D1',
    fontFace: FONT, isTextBox: true, margin: 0,
  })
  items.forEach((t, i) => {
    s.addText(t, {
      x: M + i * 3.2, y: 5.5, w: 3.0, h: 0.4, fontSize: 13, bold: true,
      color: i === active ? WHITE : '55708F', fontFace: FONT, isTextBox: true, margin: 0,
    })
  })
  return s
}

/* ══ S1 · 표지 ═══════════════════════════════ */
{
  const s = slide(true)
  s.addShape(p.ShapeType.ellipse, { x: 9.4, y: -1.8, w: 6.0, h: 6.0, fill: { color: NAVY2 } })
  s.addShape(p.ShapeType.ellipse, { x: 11.2, y: 4.5, w: 2.9, h: 2.9, fill: { color: ORANGE } })
  s.addText('2030 무주택 실수요자를 위한 청약 인텔리전스', {
    x: M, y: 1.35, w: 8.4, h: 0.35, fontSize: 13.5, bold: true, color: ORANGE,
    charSpacing: 1.5, fontFace: FONT, isTextBox: true, margin: 0,
  })
  s.addText('집캐치', {
    x: M, y: 1.85, w: 8, h: 1.45, fontSize: 78, bold: true, color: WHITE,
    fontFace: FONT, isTextBox: true, margin: 0, charSpacing: -2,
  })
  s.addText('JibCatch', {
    x: M, y: 3.32, w: 8, h: 0.45, fontSize: 19, bold: true, color: '9FB6D1',
    charSpacing: 3, fontFace: FONT, isTextBox: true, margin: 0,
  })
  s.addText('청약, 감이 아니라 데이터로', {
    x: M, y: 4.1, w: 9, h: 0.65, fontSize: 30, bold: true, color: WHITE,
    fontFace: FONT, isTextBox: true, margin: 0,
  })
  s.addText('청약홈 공공데이터로 분양정보 · 경쟁률 · 당첨 가능성을 한 화면에서', {
    x: M, y: 4.85, w: 9, h: 0.4, fontSize: 15, color: '9FB6D1',
    fontFace: FONT, isTextBox: true, margin: 0,
  })
  badge(s, M, 5.6, '실시간 공공데이터', NAVY2, WHITE, 2.2)
  badge(s, M + 2.35, 5.6, 'AI 당첨 예측', NAVY2, WHITE, 1.9)
  badge(s, M + 4.4, 5.6, '전국 과열 지도', NAVY2, WHITE, 2.0)
  s.addNotes('오프닝: 질문 → 2초 침묵 → "저도 몰랐습니다. 청약홈에 다 있는데 아무도 못 봅니다."')
}

/* ══ S2 · 문제 ═══════════════════════════════ */
{
  const s = slide()
  head(s, 'PROBLEM', '공개돼 있지만, 아무도 읽지 못한다', '청약 데이터는 이미 100% 공개 — 병목은 접근성이 아니라 해석 가능성이다')
  const items = [
    ['흩어져 있다', '분양정보 · 경쟁률 · 당첨가점이\n서로 다른 API와 화면에 흩어져 있다'],
    ['읽히지 않는다', '원본은 SUBSCRPT_AREA_CODE,\nLWET_SCORE 같은 코드값 테이블'],
    ['판단이 없다', '"내 가점으로 될까?"에 답하는 곳이 없다\n그 자리를 커뮤니티 카더라가 채운다'],
  ]
  items.forEach(([h, b], i) => {
    const x = M + i * 4.03
    card(s, x, 2.35, 3.74, 2.55)
    numDot(s, x + 0.35, 2.68, i + 1)
    s.addText(h, {
      x: x + 0.98, y: 2.68, w: 2.5, h: 0.48, fontSize: 20, bold: true, color: NAVY,
      valign: 'middle', fontFace: FONT, isTextBox: true, margin: 0,
    })
    s.addText(b, {
      x: x + 0.35, y: 3.42, w: 3.04, h: 1.3, fontSize: 13, color: GRAY,
      fontFace: FONT, isTextBox: true, margin: 0, lineSpacingMultiple: 1.3,
    })
  })
  banner(s, 5.25, '정보 비대칭이 아니라 해석 비대칭 — 집캐치가 공격하는 지점입니다', 'warm')
  foot(s)
}

/* ══ S3 · 타깃 ═══════════════════════════════ */
{
  const s = slide()
  head(s, 'TARGET', '공고는 매달 본다, 지원 여부를 못 정할 뿐', '첫 집을 노리는 2030 무주택 실수요자')
  card(s, M, 2.35, 6.05, 3.55, NAVY)
  badge(s, M + 0.45, 2.7, '페르소나', ORANGE, WHITE, 1.15)
  s.addText('28세 · 수도권 거주\n청약통장 7년차 · 가점 60점 초반', {
    x: M + 0.45, y: 3.3, w: 5.15, h: 1.05, fontSize: 21, bold: true, color: WHITE,
    fontFace: FONT, isTextBox: true, margin: 0, lineSpacingMultiple: 1.3,
  })
  s.addText('"공고는 매번 본다, 그런데 넣어야 할지를 모르겠다"', {
    x: M + 0.45, y: 4.65, w: 5.15, h: 0.95, fontSize: 15, italic: true, color: 'C3D4E8',
    fontFace: FONT, isTextBox: true, margin: 0, lineSpacingMultiple: 1.3,
  })
  const stats = [
    ['원하는 것', '매물 리스트가 아니라 내 위치'],
    ['판단 기준', '커트라인 대비 여유 점수'],
    ['행동 전환점', '마감 임박 D-5 알림'],
  ]
  stats.forEach(([h, b], i) => {
    const y = 2.35 + i * 1.24
    card(s, 7.05, y, 5.5, 1.07)
    s.addText(h, {
      x: 7.4, y, w: 1.75, h: 1.07, fontSize: 13, bold: true, color: ORANGE,
      valign: 'middle', fontFace: FONT, isTextBox: true, margin: 0,
    })
    s.addText(b, {
      x: 9.15, y, w: 3.2, h: 1.07, fontSize: 15, bold: true, color: NAVY,
      valign: 'middle', fontFace: FONT, isTextBox: true, margin: 0, lineSpacingMultiple: 1.2,
    })
  })
  s.addText('리스트를 더 주는 서비스는 많다 — 집캐치는 좌표를 준다', {
    x: M, y: 6.15, w: CW, h: 0.5, fontSize: 18, bold: true, color: NAVY,
    fontFace: FONT, isTextBox: true, margin: 0,
  })
  foot(s)
}

/* ══ S4 · 솔루션 ═════════════════════════════ */
{
  const s = slide()
  head(s, 'SOLUTION', '질문 5개를 한 화면에서 끝낸다', '탭 5개는 기능 5개가 아니라 실수요자의 의사결정 5단계')
  const rows = [
    ['분양정보', '지금 넣을 수 있는 게 뭐지?'],
    ['경쟁률 현황', '이 단지, 얼마나 몰리지?'],
    ['핫플레이스', '어느 지역이 과열됐지?'],
    ['당첨자 통계', '실제로 누가 됐지?'],
    ['AI 당첨 예측', '나는 될까?'],
  ]
  rows.forEach(([t, q], i) => {
    const y = 2.35 + i * 0.86
    const last = i === rows.length - 1
    card(s, M, y, CW, 0.73, last ? NAVY : ICE)
    numDot(s, M + 0.3, y + 0.12, i + 1, last ? ORANGE : NAVY)
    s.addText(t, {
      x: M + 1.0, y, w: 2.7, h: 0.73, fontSize: 17, bold: true, color: last ? WHITE : NAVY,
      valign: 'middle', fontFace: FONT, isTextBox: true, margin: 0,
    })
    s.addText(q, {
      x: M + 3.8, y, w: 7.7, h: 0.73, fontSize: 16, bold: last, color: last ? ORANGE : GRAY,
      valign: 'middle', fontFace: FONT, isTextBox: true, margin: 0,
    })
  })
  s.addText('마지막 한 줄이 이 서비스의 존재 이유입니다', {
    x: M, y: 6.7, w: CW, h: 0.35, fontSize: 13.5, color: GRAY,
    fontFace: FONT, isTextBox: true, margin: 0,
  })
  foot(s)
}

/* ══ S5 · 섹션 01 ════════════════════════════ */
section('01', '제품', '무엇을 보여주고, 무엇을 판단해 주는가', ['제품 5기능', '기술과 운영', '시장과 성장'], 0)

/* ══ S6 · 분양정보 ═══════════════════════════ */
{
  const s = slide()
  head(s, 'FEATURE 01', '놓치지 않게 만드는 D-day', '히어로 캐러셀 + KPI 4종 · 마감임박 클릭 시 해당 목록 즉시 전개')
  card(s, M, 2.35, 4.25, 3.5, NAVY)
  s.addText('D-5', {
    x: M, y: 2.8, w: 4.25, h: 1.45, fontSize: 92, bold: true, color: ORANGE,
    align: 'center', fontFace: FONT, isTextBox: true, margin: 0,
  })
  s.addText('접수 종료 5일 이내를\n마감 임박으로 정의', {
    x: M, y: 4.4, w: 4.25, h: 1.05, fontSize: 15, color: 'C3D4E8', align: 'center',
    fontFace: FONT, isTextBox: true, margin: 0, lineSpacingMultiple: 1.3,
  })
  const k = [
    ['접수중', '지금 신청 가능한 공고 수'],
    ['마감임박', 'D-5 이내 — 클릭 시 목록 전개'],
    ['총 공급세대', '조회 기간 내 공급 물량 합계'],
    ['갱신시각', '데이터 신선도를 화면에 노출'],
  ]
  k.forEach(([h, b], i) => {
    const y = 2.35 + i * 0.92
    card(s, 5.35, y, 7.2, 0.78)
    s.addText(h, {
      x: 5.7, y, w: 2.0, h: 0.78, fontSize: 15, bold: true, color: NAVY,
      valign: 'middle', fontFace: FONT, isTextBox: true, margin: 0,
    })
    s.addText(b, {
      x: 7.7, y, w: 4.6, h: 0.78, fontSize: 13, color: GRAY,
      valign: 'middle', fontFace: FONT, isTextBox: true, margin: 0,
    })
  })
  banner(s, 6.05, '청약에서 가장 비싼 실수는 떨어지는 게 아니라 모르고 지나치는 것', 'warm')
  foot(s)
}

/* ══ S7 · 경쟁률 ═════════════════════════════ */
{
  const s = slide()
  head(s, 'FEATURE 02', '평균이 아니라 분포를 본다', '특별공급과 일반공급은 모수도 자격도 다르다')
  const cols = [
    ['특별공급', '신혼부부 · 생애최초 · 다자녀 · 노부모부양 등\n자격 요건이 좁고 모수가 작다', ['배정 물량이 작아 경쟁률 변동성이 크다', '자격 판정이 지원 여부를 먼저 결정한다']],
    ['일반공급', '가점제와 추첨제가 혼재한다\n모수가 크고 변동 폭이 넓다', ['가점제 비율은 주택형 · 지역별로 다르다', '추첨제는 가점과 무관한 별도 전략']],
  ]
  cols.forEach(([h, b, bullets], i) => {
    const x = M + i * 6.15
    card(s, x, 2.35, 5.65, 2.6)
    s.addText(h, {
      x: x + 0.4, y: 2.6, w: 4.9, h: 0.5, fontSize: 22, bold: true, color: NAVY,
      fontFace: FONT, isTextBox: true, margin: 0,
    })
    s.addText(b, {
      x: x + 0.4, y: 3.15, w: 4.9, h: 0.75, fontSize: 13.5, color: GRAY,
      fontFace: FONT, isTextBox: true, margin: 0, lineSpacingMultiple: 1.25,
    })
    s.addText(bullets.map((t, j) => ({
      text: t, options: { bullet: true, breakLine: j < bullets.length - 1 },
    })), {
      x: x + 0.4, y: 3.95, w: 4.9, h: 0.85, fontSize: 12.5, color: NAVY2,
      fontFace: FONT, isTextBox: true, margin: 0, paraSpaceAfter: 5,
    })
  })
  banner(s, 5.2, '합산 평균 경쟁률은 실수요자를 오도한다 — 두 값을 분리해 저장·표시한다', 'warm')
  s.addText('제공 단위   지역별 평균 경쟁률  ·  공고번호 기준 단지 상세  ·  주택형별 경쟁률', {
    x: M, y: 6.3, w: CW, h: 0.4, fontSize: 14, color: NAVY,
    fontFace: FONT, isTextBox: true, margin: 0,
  })
  foot(s)
}

/* ══ S8 · 핫플레이스 ═════════════════════════ */
{
  const s = slide()
  head(s, 'FEATURE 03', '어디가 과열됐는지 3초에 안다', '시·도 SVG 경계 히트맵 + 단지 마커 · 줌 · 팬')
  card(s, M, 2.35, 6.0, 3.65, NAVY)
  s.addText('좌표 없는 데이터를\n지도로 만드는 법', {
    x: M + 0.45, y: 2.65, w: 5.1, h: 1.0, fontSize: 23, bold: true, color: WHITE,
    fontFace: FONT, isTextBox: true, margin: 0, lineSpacingMultiple: 1.25,
  })
  s.addText([
    { text: '청약홈 API에는 위경도가 없다', options: { bullet: true, breakLine: true } },
    { text: '지역코드 → 시·도 bbox 매핑', options: { bullet: true, breakLine: true } },
    { text: '자체 레이아웃 알고리즘으로 마커 배치', options: { bullet: true, breakLine: true } },
    { text: '경쟁률 → 색 강도(heat level) 환산', options: { bullet: true } },
  ], {
    x: M + 0.45, y: 3.9, w: 5.1, h: 1.85, fontSize: 14, color: 'C3D4E8',
    fontFace: FONT, isTextBox: true, margin: 0, paraSpaceAfter: 7,
  })
  const chips = [
    ['줌 · 팬', '수도권까지 확대해 단지 단위로 탐색'],
    ['호버 툴팁', '지역 · 단지 경쟁률 즉시 확인'],
    ['Bottom Sheet', '모바일에서 목록을 끌어올려 조회'],
  ]
  chips.forEach(([h, b], i) => {
    const y = 2.35 + i * 1.28
    card(s, 6.95, y, 5.6, 1.1)
    s.addText(h, {
      x: 7.3, y: y + 0.15, w: 5.0, h: 0.4, fontSize: 17, bold: true, color: NAVY,
      fontFace: FONT, isTextBox: true, margin: 0,
    })
    s.addText(b, {
      x: 7.3, y: y + 0.58, w: 5.0, h: 0.4, fontSize: 13, color: GRAY,
      fontFace: FONT, isTextBox: true, margin: 0,
    })
  })
  s.addText('기능이 아니라 소요 시간으로 말한다', {
    x: M, y: 6.25, w: CW, h: 0.4, fontSize: 14, color: GRAY,
    fontFace: FONT, isTextBox: true, margin: 0,
  })
  foot(s)
}

/* ══ S9 · 당첨자 통계 ════════════════════════ */
{
  const s = slide()
  head(s, 'FEATURE 04', '소문을 숫자로 바꾼다', '연령별 · 지역별 신청자 대비 당첨자, 가점 분포')
  const m = [['평균', 'AVRG_SCORE'], ['최저', 'LWET_SCORE'], ['최고', 'TOP_SCORE'], ['중위', 'MED_SCORE']]
  m.forEach(([h, code], i) => {
    const x = M + i * 3.03
    card(s, x, 2.35, 2.73, 1.95, NAVY)
    s.addText(h, {
      x, y: 2.6, w: 2.73, h: 0.65, fontSize: 30, bold: true, color: WHITE,
      align: 'center', fontFace: FONT, isTextBox: true, margin: 0,
    })
    s.addText('당첨 가점', {
      x, y: 3.3, w: 2.73, h: 0.3, fontSize: 13, color: ORANGE,
      align: 'center', fontFace: FONT, isTextBox: true, margin: 0,
    })
    s.addText(code, {
      x, y: 3.68, w: 2.73, h: 0.3, fontSize: 11, color: '7E96B4',
      align: 'center', fontFace: FONT, isTextBox: true, margin: 0,
    })
  })
  card(s, M, 4.6, CW, 1.55)
  s.addText('"요즘 60점으론 안 된다"는 말 — 여기서 월 단위로 검증된다', {
    x: M + 0.45, y: 4.82, w: CW - 0.9, h: 0.5, fontSize: 20, bold: true, color: NAVY,
    fontFace: FONT, isTextBox: true, margin: 0,
  })
  s.addText('모든 통계에 기준월(STAT_DE)과 표본 수를 함께 노출 — 인용 가능한 형태로 제공한다', {
    x: M + 0.45, y: 5.42, w: CW - 0.9, h: 0.5, fontSize: 14, color: GRAY,
    fontFace: FONT, isTextBox: true, margin: 0,
  })
  s.addText('출처   공공데이터포털 청약홈 OpenAPI · 한국부동산원', {
    x: M, y: 6.4, w: CW, h: 0.35, fontSize: 11, color: GRAY2,
    fontFace: FONT, isTextBox: true, margin: 0,
  })
  foot(s)
}

/* ══ S10 · AI 예측 ═══════════════════════════ */
{
  const s = slide()
  head(s, 'FEATURE 05', '이 서비스의 심장 — AI 당첨 예측', '3단계 입력 → 84점 가점 환산 → 지역 당첨 분포와 비교 → 확률 + 근거 문장')
  s.addChart(p.ChartType.bar, [{
    name: '배점',
    labels: ['무주택 기간', '부양가족 수', '입주자저축\n가입기간'],
    values: [32, 35, 17],
  }], {
    x: M, y: 2.3, w: 5.85, h: 4.1,
    barDir: 'col', chartColors: [NAVY, ORANGE, NAVY2], varyColors: true,
    showTitle: true, title: '청약가점 만점 84점의 구성', titleFontSize: 15, titleColor: NAVY, titleFontFace: FONT,
    showValue: true, dataLabelPosition: 'outEnd', dataLabelColor: NAVY,
    dataLabelFontSize: 14, dataLabelFontFace: FONT, dataLabelFontBold: true,
    showLegend: false,
    catAxisLabelColor: GRAY, catAxisLabelFontSize: 11, catAxisLabelFontFace: FONT,
    valAxisLabelColor: GRAY2, valAxisLabelFontSize: 10, valAxisMaxVal: 40,
    valGridLine: { color: 'EDF2F8', size: 1 }, catGridLine: { style: 'none' },
    barGapWidthPct: 72,
  })
  const steps = [
    ['입력', '무주택 기간 · 부양가족 · 통장 가입기간'],
    ['환산', '「주택공급에 관한 규칙」 별표1 기준 84점'],
    ['비교', '지역별 최근 당첨 가점 평균 · 최저 · 최고'],
    ['해석', '확률 5~94% + 커트라인 대비 여유 점수'],
  ]
  steps.forEach(([h, b], i) => {
    const y = 2.35 + i * 1.0
    card(s, 6.95, y, 5.6, 0.85)
    numDot(s, 7.2, y + 0.19, i + 1, i === 3 ? ORANGE : NAVY)
    s.addText(h, {
      x: 7.82, y, w: 0.95, h: 0.85, fontSize: 15, bold: true, color: NAVY,
      valign: 'middle', fontFace: FONT, isTextBox: true, margin: 0,
    })
    s.addText(b, {
      x: 8.77, y, w: 3.6, h: 0.85, fontSize: 12, color: GRAY,
      valign: 'middle', fontFace: FONT, isTextBox: true, margin: 0,
    })
  })
  s.addShape(p.ShapeType.roundRect, {
    x: 6.95, y: 6.4, w: 5.6, h: 0.42, rectRadius: 0.1,
    fill: { color: SAND }, line: { color: ORANGE, width: 1 },
  })
  s.addText('맞히는 게 아니라 설명 가능한 기준선을 준다', {
    x: 6.95, y: 6.4, w: 5.6, h: 0.42, fontSize: 12.5, bold: true, color: 'B3431A',
    align: 'center', valign: 'middle', fontFace: FONT, isTextBox: true, margin: 0,
  })
  s.addNotes('블랙박스가 아니라 규칙 기반 — 왜 그 숫자인지 설명할 수 있다는 점을 강조.')
  foot(s)
}

/* ══ S11 · 섹션 02 ═══════════════════════════ */
section('02', '기술과 운영', '무엇으로 만들었고, 어떻게 안전하게 돌리는가', ['제품 5기능', '기술과 운영', '시장과 성장'], 1)

/* ══ S12 · 아키텍처 ══════════════════════════ */
{
  const s = slide()
  head(s, 'ARCHITECTURE', '키는 서버에, 캐시는 엣지에', 'Next.js 16 App Router · React 19 · TypeScript · Tailwind v4 · Recharts')
  const boxes = [
    ['청약홈 OpenAPI', '공공데이터포털\n한국부동산원 통계', ICE, NAVY, GRAY],
    ['Next.js Route Handler', 'app/api/* — API 키 서버 보관\nrevalidate 300~600초 캐싱', NAVY, WHITE, 'C3D4E8'],
    ['클라이언트 대시보드', '탭 단위 dynamic import\nssr:false — 초기 번들 최소화', ICE, NAVY, GRAY],
  ]
  boxes.forEach(([h, b, bg, fg, bodyColor], i) => {
    const x = M + i * 4.3
    card(s, x, 2.35, 3.65, 2.1, bg)
    s.addText(h, {
      x: x + 0.3, y: 2.62, w: 3.05, h: 0.5, fontSize: 16.5, bold: true, color: fg,
      fontFace: FONT, isTextBox: true, margin: 0,
    })
    s.addText(b, {
      x: x + 0.3, y: 3.2, w: 3.05, h: 1.0, fontSize: 12.5, color: bodyColor,
      fontFace: FONT, isTextBox: true, margin: 0, lineSpacingMultiple: 1.3,
    })
    if (i < 2) {
      s.addShape(p.ShapeType.rightArrow, { x: x + 3.79, y: 3.23, w: 0.27, h: 0.34, fill: { color: ORANGE } })
    }
  })
  const pts = [
    ['API 키 노출 0', '모든 외부 호출은 서버 라우트에서만 수행 — 클라이언트 번들에 키가 들어가지 않는다'],
    ['호출량 제어', 'revalidate 캐시(경쟁률 600초 / 분양정보 300초)로 공공 API 쿼터와 응답 지연을 동시에 억제'],
    ['타입 안전', '공공 API 원본 필드를 lib/types.ts 에 명시적으로 선언해 코드값 해석을 한 곳에 모았다'],
  ]
  pts.forEach(([h, b], i) => {
    const y = 4.85 + i * 0.68
    s.addShape(p.ShapeType.ellipse, { x: M, y: y + 0.12, w: 0.2, h: 0.2, fill: { color: ORANGE } })
    s.addText(h, {
      x: M + 0.38, y, w: 2.5, h: 0.44, fontSize: 14, bold: true, color: NAVY,
      valign: 'middle', fontFace: FONT, isTextBox: true, margin: 0,
    })
    s.addText(b, {
      x: M + 2.95, y, w: 8.85, h: 0.44, fontSize: 12.5, color: GRAY,
      valign: 'middle', fontFace: FONT, isTextBox: true, margin: 0,
    })
  })
  foot(s)
}

/* ══ S13 · 데모 ══════════════════════════════ */
{
  const s = slide()
  head(s, 'LIVE DEMO', '3분, 클릭 7번', '기능 순서가 아니라 사용자의 판단 순서로 보여준다')
  const d = [
    ['메인 진입', '지금 이 숫자는 실시간 공공데이터다'],
    ['마감임박 KPI 클릭', 'D-5 이내만 걸러진다'],
    ['단지 상세 진입', '공고 원문 대신 필요한 것만'],
    ['경쟁률 탭', '특공과 일반을 분리해서 본다'],
    ['핫플레이스 → 수도권 줌', '과열이 어디로 이동하는지 보인다'],
    ['AI 예측 · 7년 / 2명 / 9년', '이게 제 조건이다 — 64점'],
    ['결과 게이지', '확률보다 커트라인 대비 여유 점수를 보라'],
  ]
  d.forEach(([h, b], i) => {
    const col = i < 4 ? 0 : 1
    const row = i < 4 ? i : i - 4
    const x = M + col * 6.15
    const y = 2.35 + row * 1.05
    card(s, x, y, 5.65, 0.92, i === 6 ? NAVY : ICE)
    numDot(s, x + 0.28, y + 0.22, i + 1, i === 6 ? ORANGE : NAVY)
    s.addText(h, {
      x: x + 0.9, y: y + 0.1, w: 4.6, h: 0.37, fontSize: 14.5, bold: true,
      color: i === 6 ? WHITE : NAVY, fontFace: FONT, isTextBox: true, margin: 0,
    })
    s.addText(b, {
      x: x + 0.9, y: y + 0.5, w: 4.6, h: 0.35, fontSize: 12, color: i === 6 ? ORANGE : GRAY,
      fontFace: FONT, isTextBox: true, margin: 0,
    })
  })
  s.addShape(p.ShapeType.roundRect, {
    x: 6.9, y: 5.55, w: 5.65, h: 0.75, rectRadius: 0.12,
    fill: { color: SAND }, line: { color: ORANGE, width: 1 },
  })
  s.addText('안전장치 — 로딩 3초 초과 시 즉시 녹화본 전환', {
    x: 6.9, y: 5.55, w: 5.65, h: 0.75, fontSize: 13, bold: true, color: 'B3431A',
    align: 'center', valign: 'middle', fontFace: FONT, isTextBox: true, margin: 0,
  })
  foot(s)
}

/* ══ S14 · 섹션 03 ═══════════════════════════ */
section('03', '시장과 성장', '왜 지금이고, 어디서 돈이 나오는가', ['제품 5기능', '기술과 운영', '시장과 성장'], 2)

/* ══ S15 · 차별점 ════════════════════════════ */
{
  const s = slide()
  head(s, 'POSITIONING', '청약홈을 대체하지 않는다, 읽어준다', '원천 데이터는 공공이, 해석과 판단은 집캐치가')
  const hdr = ['', '청약홈', '부동산 포털', '커뮤니티', '집캐치']
  const rows = [
    ['원천 데이터', '◎', '△', '✕', '◎'],
    ['해석 · 시각화', '✕', '△', '△', '◎'],
    ['개인화 판단', '✕', '✕', '△ (비검증)', '◎ (근거 제시)'],
    ['갱신 주기', '실시간', '수동', '비정형', '실시간 + 캐시'],
  ]
  const tbl = [hdr.map(t => ({
    text: t,
    options: { bold: true, color: WHITE, fill: { color: NAVY }, fontSize: 15, align: 'center', fontFace: FONT },
  }))]
  rows.forEach((r, ri) => {
    tbl.push(r.map((t, ci) => ({
      text: t,
      options: {
        fontSize: ci === 0 ? 14 : 16,
        bold: ci === 0 || ci === 4,
        color: ci === 4 ? ORANGE : NAVY,
        align: ci === 0 ? 'left' : 'center',
        fill: { color: ci === 4 ? SAND : (ri % 2 ? 'F6F9FC' : WHITE) },
        fontFace: FONT,
      },
    })))
  })
  s.addTable(tbl, {
    x: M, y: 2.35, w: CW, colW: [2.9, 2.0, 2.25, 2.45, 2.2], rowH: 0.64,
    border: { type: 'solid', color: LINE, pt: 1 }, valign: 'middle',
  })
  banner(s, 5.85, '진입장벽은 기능이 아니라 누적 사용자 가점 분포 데이터에서 생긴다')
  foot(s)
}

/* ══ S16 · 로드맵 ════════════════════════════ */
{
  const s = slide()
  head(s, 'ROADMAP', '정확도부터 손익까지', '취약점은 지적당하기 전에 먼저 올린다')
  const q = [
    ['Q1', '가점 로직 완전 정합화', '현행 선형 근사를 「주택공급에 관한 규칙」\n별표1 구간표로 교체\n0점 · 1년 미만 구간 오차 제거', ORANGE],
    ['Q2', '알림 · 자가진단', '관심단지 마감 D-3 푸시 알림\n특별공급 자격 자가진단 플로우 추가', NAVY],
    ['Q3', '당첨 후 손익까지', '실거래가 · 전월세 데이터 결합\n당첨되면 얼마인지까지 확장', NAVY2],
  ]
  q.forEach(([tag, h, b, c], i) => {
    const x = M + i * 4.03
    card(s, x, 2.35, 3.74, 3.5)
    badge(s, x + 0.35, 2.65, tag, c, WHITE, 0.85)
    s.addText(h, {
      x: x + 0.35, y: 3.12, w: 3.04, h: 0.85, fontSize: 18.5, bold: true, color: NAVY,
      fontFace: FONT, isTextBox: true, margin: 0, lineSpacingMultiple: 1.15,
    })
    s.addText(b, {
      x: x + 0.35, y: 3.95, w: 3.04, h: 1.7, fontSize: 12.5, color: GRAY,
      fontFace: FONT, isTextBox: true, margin: 0, lineSpacingMultiple: 1.35,
    })
  })
  s.addText('정확도는 신뢰의 전부 — 그래서 Q1이 정확도다', {
    x: M, y: 6.15, w: CW, h: 0.45, fontSize: 16, bold: true, color: NAVY,
    fontFace: FONT, isTextBox: true, margin: 0,
  })
  foot(s)
}

/* ══ S17 · 수익 모델 ═════════════════════════ */
{
  const s = slide()
  head(s, 'BUSINESS MODEL', '무료로 모으고, 판단으로 과금하고, 데이터로 번다', '3단계 수익화 — 마지막 단계가 실제 매출 축')
  const stages = [
    ['STEP 1', '무료 확장', '전 기능 무료 공개로 사용자 · 가점 입력 데이터 확보', '핵심 지표 — 월간 활성 사용자', ICE, NAVY, GRAY],
    ['STEP 2', '구독 전환', '관심단지 알림 · 정밀 당첨 리포트 · 특공 자격 진단', '핵심 지표 — 유료 전환율', NAVY, WHITE, 'C3D4E8'],
    ['STEP 3', 'B2B 데이터', '시행사 · 분양대행사 대상 수요 · 가점 분포 분석 제공', '핵심 지표 — 계약 단지 수', ICE, NAVY, GRAY],
  ]
  stages.forEach(([tag, h, b, kpi, bg, fg, bodyColor], i) => {
    const x = M + i * 4.03
    card(s, x, 2.35, 3.74, 2.95, bg)
    s.addText(tag, {
      x: x + 0.35, y: 2.6, w: 3.04, h: 0.3, fontSize: 11.5, bold: true,
      color: i === 1 ? ORANGE : ORANGE, charSpacing: 1.5, fontFace: FONT, isTextBox: true, margin: 0,
    })
    s.addText(h, {
      x: x + 0.35, y: 2.95, w: 3.04, h: 0.5, fontSize: 21, bold: true, color: fg,
      fontFace: FONT, isTextBox: true, margin: 0,
    })
    s.addText(b, {
      x: x + 0.35, y: 3.55, w: 3.04, h: 1.05, fontSize: 12.5, color: bodyColor,
      fontFace: FONT, isTextBox: true, margin: 0, lineSpacingMultiple: 1.35,
    })
    s.addText(kpi, {
      x: x + 0.35, y: 4.72, w: 3.04, h: 0.4, fontSize: 11.5, bold: true,
      color: i === 1 ? WHITE : NAVY2, fontFace: FONT, isTextBox: true, margin: 0,
    })
    if (i < 2) {
      s.addShape(p.ShapeType.rightArrow, { x: x + 3.83, y: 3.62, w: 0.25, h: 0.3, fill: { color: ORANGE } })
    }
  })
  banner(s, 5.6, '사용자가 남긴 가점 · 관심단지 데이터는 경쟁사가 복제할 수 없는 자산이 된다')
  foot(s)
}

/* ══ S18 · 클로징 ════════════════════════════ */
{
  const s = slide(true)
  s.addShape(p.ShapeType.ellipse, { x: -2.0, y: 3.8, w: 5.4, h: 5.4, fill: { color: NAVY2 } })
  s.addShape(p.ShapeType.ellipse, { x: 11.5, y: -1.2, w: 3.4, h: 3.4, fill: { color: ORANGE } })
  s.addText('청약은 되돌릴 수 없는 결정입니다', {
    x: 1.3, y: 1.85, w: 10.7, h: 0.6, fontSize: 20, color: '9FB6D1',
    align: 'center', fontFace: FONT, isTextBox: true, margin: 0,
  })
  s.addText('집을 잡는 건\n운이 아니라 기준입니다', {
    x: 1.3, y: 2.6, w: 10.7, h: 2.2, fontSize: 46, bold: true, color: WHITE,
    align: 'center', fontFace: FONT, isTextBox: true, margin: 0, lineSpacingMultiple: 1.25,
  })
  s.addText('공개된 데이터를, 읽을 수 있는 판단으로', {
    x: 1.3, y: 4.95, w: 10.7, h: 0.5, fontSize: 20, bold: true, color: ORANGE,
    align: 'center', fontFace: FONT, isTextBox: true, margin: 0,
  })
  s.addText('집캐치  ·  JibCatch', {
    x: 1.3, y: 6.1, w: 10.7, h: 0.45, fontSize: 14, color: '7E96B4',
    align: 'center', charSpacing: 2, fontFace: FONT, isTextBox: true, margin: 0,
  })
  s.addNotes('마지막 문장은 슬라이드를 보지 않고 외워서 말한다.')
}

p.writeFile({ fileName: process.argv[2] }).then(f => console.log('OK', f))
