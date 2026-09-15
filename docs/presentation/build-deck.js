const pptxgen = require('pptxgenjs')
const p = new pptxgen()
p.layout = 'LAYOUT_WIDE'   // 13.3 x 7.5
p.author = 'JibCatch'
p.title = '집캐치 발표자료'

const NAVY = '10243E', NAVY2 = '1C3A5E', ICE = 'E8EEF6', ORANGE = 'FF7A45'
const GRAY = '5A6B7D', WHITE = 'FFFFFF', LINE = 'D4DEEA'
const F = '맑은 고딕'
const W = 13.3, M = 0.7

function shadow() { return { type: 'outer', color: '99A8BC', blur: 8, offset: 2, angle: 90, opacity: 0.25 } }

function base(dark) {
  const s = p.addSlide()
  s.background = { color: dark ? NAVY : WHITE }
  return s
}

function title(s, t, sub) {
  s.addText(t, { x: M, y: 0.5, w: W - M * 2, h: 0.72, fontSize: 38, bold: true, color: NAVY, fontFace: F, isTextBox: true, margin: 0 })
  if (sub) s.addText(sub, { x: M, y: 1.24, w: W - M * 2, h: 0.4, fontSize: 15, color: GRAY, fontFace: F, isTextBox: true, margin: 0 })
}

function card(s, x, y, w, h, fill) {
  s.addShape(p.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.12, fill: { color: fill || ICE }, line: { color: LINE, width: 0.75 }, shadow: shadow() })
}

function numCircle(s, x, y, n, bg, fg) {
  s.addShape(p.ShapeType.ellipse, { x, y, w: 0.46, h: 0.46, fill: { color: bg || ORANGE } })
  s.addText(String(n), { x, y, w: 0.46, h: 0.46, fontSize: 16, bold: true, color: fg || WHITE, align: 'center', valign: 'middle', fontFace: F, isTextBox: true, margin: 0 })
}

/* ── S1 표지 ───────────────────────────────── */
{
  const s = base(true)
  s.addShape(p.ShapeType.ellipse, { x: 9.6, y: -1.5, w: 5.4, h: 5.4, fill: { color: NAVY2 } })
  s.addShape(p.ShapeType.ellipse, { x: 11.3, y: 4.6, w: 2.6, h: 2.6, fill: { color: ORANGE }, transparency: 60 })
  s.addText('집캐치', { x: M, y: 1.95, w: 8, h: 1.35, fontSize: 72, bold: true, color: WHITE, fontFace: F, isTextBox: true, margin: 0, charSpacing: -1 })
  s.addText('JibCatch', { x: M, y: 3.35, w: 8, h: 0.5, fontSize: 20, color: ORANGE, bold: true, fontFace: F, isTextBox: true, margin: 0 })
  s.addText('청약, 감이 아니라 데이터로', { x: M, y: 4.1, w: 8.4, h: 0.6, fontSize: 28, color: ICE, fontFace: F, isTextBox: true, margin: 0 })
  s.addText('청약홈 공공데이터 기반 분양정보 · 경쟁률 · 당첨 예측 대시보드', { x: M, y: 4.85, w: 8.4, h: 0.4, fontSize: 14, color: '9FB3CC', fontFace: F, isTextBox: true, margin: 0 })
  s.addNotes('오프닝 질문 → 2초 침묵 → "저도 몰랐습니다. 청약홈에 다 있는데 아무도 못 봅니다."')
}

/* ── S2 문제 ───────────────────────────────── */
{
  const s = base()
  title(s, '정보는 공개돼 있는데, 쓸 수가 없다', '청약 데이터는 이미 100% 공개 — 병목은 접근성이 아니라 해석 가능성')
  const items = [
    ['파편화', '분양정보 · 경쟁률 · 당첨가점 · 지역통계가\n서로 다른 API와 화면에 흩어져 있다'],
    ['비가독성', '원본은 SUBSCRPT_AREA_CODE, LWET_SCORE 같은\n코드값 테이블 — 실수요자가 읽을 형태가 아니다'],
    ['판단 공백', '"내 가점으로 될까?"에 답하는 곳이 없다\n그 자리를 커뮤니티 카더라가 채운다'],
  ]
  items.forEach(([h, b], i) => {
    const x = M + i * 4.06
    card(s, x, 2.2, 3.76, 3.0)
    numCircle(s, x + 0.3, 2.55, i + 1)
    s.addText(h, { x: x + 0.9, y: 2.57, w: 2.7, h: 0.42, fontSize: 21, bold: true, color: NAVY, fontFace: F, isTextBox: true, margin: 0, valign: 'middle' })
    s.addText(b, { x: x + 0.3, y: 3.3, w: 3.16, h: 1.7, fontSize: 13, color: GRAY, fontFace: F, isTextBox: true, margin: 0, lineSpacingMultiple: 1.25 })
  })
  s.addText('정보 비대칭이 아니라 ‘해석 비대칭’이다.', { x: M, y: 5.75, w: W - M * 2, h: 0.5, fontSize: 19, italic: true, bold: true, color: ORANGE, fontFace: F, isTextBox: true, margin: 0 })
  s.addNotes('세 병목을 하나씩. 마지막 문장은 1.5초 쉬고 말한다.')
}

/* ── S3 타깃 ───────────────────────────────── */
{
  const s = base()
  title(s, '첫 집을 노리는 2030 무주택자', '공고는 본다 — 지원 여부를 못 정할 뿐이다')
  card(s, M, 2.2, 6.1, 3.8, NAVY)
  s.addText('페르소나', { x: M + 0.45, y: 2.55, w: 3, h: 0.35, fontSize: 13, bold: true, color: ORANGE, fontFace: F, isTextBox: true, margin: 0 })
  s.addText('28세 · 수도권 거주\n청약통장 7년차 · 가점 60점 초반', { x: M + 0.45, y: 3.05, w: 5.2, h: 1.1, fontSize: 22, bold: true, color: WHITE, fontFace: F, isTextBox: true, margin: 0, lineSpacingMultiple: 1.3 })
  s.addText('"공고는 매번 본다. 그런데 넣어야 할지를 모르겠다."', { x: M + 0.45, y: 4.55, w: 5.2, h: 1.0, fontSize: 15, italic: true, color: ICE, fontFace: F, isTextBox: true, margin: 0, lineSpacingMultiple: 1.25 })
  const stats = [['원하는 것', '매물 리스트가 아니라\n‘내 위치’'], ['판단 기준', '커트라인 대비\n내 가점의 여유 점수'], ['행동 전환점', '마감 임박 D-5\n알림']]
  stats.forEach(([h, b], i) => {
    const y = 2.2 + i * 1.33
    card(s, 7.1, y, 5.5, 1.14)
    s.addText(h, { x: 7.4, y: y, w: 1.8, h: 1.14, fontSize: 13, bold: true, color: ORANGE, fontFace: F, isTextBox: true, margin: 0, valign: 'middle' })
    s.addText(b, { x: 9.2, y: y, w: 3.2, h: 1.14, fontSize: 14, color: NAVY, bold: true, fontFace: F, isTextBox: true, margin: 0, valign: 'middle', lineSpacingMultiple: 1.2 })
  })
  s.addText('리스트를 더 주는 서비스는 많다. 집캐치는 ‘좌표’를 준다.', { x: M, y: 6.35, w: W - M * 2, h: 0.5, fontSize: 18, italic: true, bold: true, color: NAVY, fontFace: F, isTextBox: true, margin: 0 })
}

/* ── S4 솔루션 ─────────────────────────────── */
{
  const s = base()
  title(s, '5개 질문, 한 화면', '탭 5개는 기능 5개가 아니라 의사결정 5단계')
  const rows = [
    ['분양정보', '지금 넣을 수 있는 게 뭐지?'],
    ['경쟁률 현황', '이 단지, 얼마나 몰리지?'],
    ['핫플레이스', '어느 지역이 과열됐지?'],
    ['당첨자 통계', '실제로 누가 됐지?'],
    ['AI 당첨 예측', '나는 될까?'],
  ]
  rows.forEach(([t, q], i) => {
    const y = 1.95 + i * 0.92
    const last = i === rows.length - 1
    card(s, M, y, 11.9, 0.78, last ? NAVY : ICE)
    numCircle(s, M + 0.28, y + 0.16, i + 1, last ? ORANGE : NAVY)
    s.addText(t, { x: M + 0.95, y: y, w: 2.6, h: 0.78, fontSize: 17, bold: true, color: last ? WHITE : NAVY, fontFace: F, isTextBox: true, margin: 0, valign: 'middle' })
    s.addText(q, { x: M + 3.7, y: y, w: 7.9, h: 0.78, fontSize: 16, color: last ? ORANGE : GRAY, bold: last, fontFace: F, isTextBox: true, margin: 0, valign: 'middle' })
  })
  s.addText('마지막 한 줄이 이 서비스의 존재 이유다.', { x: M, y: 6.6, w: 11.9, h: 0.4, fontSize: 14, italic: true, color: GRAY, fontFace: F, isTextBox: true, margin: 0 })
}

/* ── S5 분양정보 ───────────────────────────── */
{
  const s = base()
  title(s, '① 분양정보 — 놓치지 않게 만드는 D-day', 'KPI 4종 · 마감임박 클릭 시 해당 목록 즉시 전개')
  card(s, M, 2.2, 4.3, 3.7, NAVY)
  s.addText('D-5', { x: M, y: 2.75, w: 4.3, h: 1.5, fontSize: 96, bold: true, color: ORANGE, align: 'center', fontFace: F, isTextBox: true, margin: 0 })
  s.addText('접수 종료 5일 이내를\n‘마감 임박’으로 정의', { x: M, y: 4.5, w: 4.3, h: 1.1, fontSize: 15, color: ICE, align: 'center', fontFace: F, isTextBox: true, margin: 0, lineSpacingMultiple: 1.25 })
  const k = [['접수중', '지금 신청 가능한 공고 수'], ['마감임박', 'D-5 이내 — 클릭 시 목록 전개'], ['총 공급세대', '조회 기간 내 공급 물량 합계'], ['갱신시각', '데이터 신선도를 화면에 노출']]
  k.forEach(([h, b], i) => {
    const y = 2.2 + i * 0.96
    card(s, 5.4, y, 7.2, 0.82)
    s.addText(h, { x: 5.7, y: y, w: 2.0, h: 0.82, fontSize: 15, bold: true, color: NAVY, fontFace: F, isTextBox: true, margin: 0, valign: 'middle' })
    s.addText(b, { x: 7.7, y: y, w: 4.6, h: 0.82, fontSize: 13, color: GRAY, fontFace: F, isTextBox: true, margin: 0, valign: 'middle' })
  })
  s.addText('청약에서 가장 비싼 실수는 떨어지는 게 아니라 모르고 지나치는 것이다.', { x: M, y: 6.35, w: 11.9, h: 0.5, fontSize: 17, italic: true, bold: true, color: NAVY, fontFace: F, isTextBox: true, margin: 0 })
}

/* ── S6 경쟁률 ─────────────────────────────── */
{
  const s = base()
  title(s, '② 경쟁률 — 평균이 아니라 분포', '특별공급과 일반공급은 모수도 자격도 다르다')
  const cols = [
    ['특별공급', '신혼부부 · 생애최초 · 다자녀 · 노부모부양 등\n자격 요건이 좁고 모수가 작다\n\n· 배정 물량이 작아 경쟁률 변동성이 크다\n· 자격 판정이 지원 여부를 먼저 결정한다'],
    ['일반공급', '가점제와 추첨제가 혼재한다\n모수가 크고 변동 폭이 넓다\n\n· 가점제 비율은 주택형 · 지역별로 다르다\n· 추첨제는 가점과 무관한 별도 전략이 필요하다'],
  ]
  cols.forEach(([h, b], i) => {
    const x = M + i * 6.2
    card(s, x, 2.2, 5.7, 2.6)
    s.addText(h, { x: x + 0.35, y: 2.5, w: 5.0, h: 0.5, fontSize: 22, bold: true, color: NAVY, fontFace: F, isTextBox: true, margin: 0 })
    s.addText(b, { x: x + 0.35, y: 3.1, w: 5.0, h: 1.6, fontSize: 13.5, color: GRAY, fontFace: F, isTextBox: true, margin: 0, lineSpacingMultiple: 1.25 })
  })
  s.addShape(p.ShapeType.roundRect, { x: M, y: 5.15, w: 11.9, h: 1.0, rectRadius: 0.1, fill: { color: 'FDEDE6' }, line: { color: ORANGE, width: 1 } })
  s.addText('합산 평균 경쟁률은 실수요자를 오도한다 — 집캐치는 두 값을 분리해 저장·표시한다', { x: M + 0.4, y: 5.15, w: 11.1, h: 1.0, fontSize: 16, bold: true, color: '9E3A12', fontFace: F, isTextBox: true, margin: 0, valign: 'middle' })
  s.addText('제공 단위:  지역별 평균 경쟁률  ·  공고번호 기준 단지 상세  ·  주택형별 경쟁률', { x: M, y: 6.4, w: 11.9, h: 0.5, fontSize: 15, color: NAVY, fontFace: F, isTextBox: true, margin: 0 })
}

/* ── S7 핫플레이스 ─────────────────────────── */
{
  const s = base()
  title(s, '③ 핫플레이스 — 전국 과열 지도', '시·도 SVG 경계 히트맵 + 단지 마커')
  card(s, M, 2.2, 6.0, 4.0, NAVY)
  s.addText('좌표 없는 데이터를\n지도로 만드는 법', { x: M + 0.45, y: 2.55, w: 5.1, h: 1.0, fontSize: 24, bold: true, color: WHITE, fontFace: F, isTextBox: true, margin: 0, lineSpacingMultiple: 1.2 })
  s.addText([
    { text: '청약홈 API에는 위경도가 없다', options: { bullet: true, breakLine: true } },
    { text: '지역코드 → 시·도 bbox 매핑', options: { bullet: true, breakLine: true } },
    { text: '자체 레이아웃 알고리즘으로 마커 배치', options: { bullet: true, breakLine: true } },
    { text: '경쟁률 → 색 강도(heat level) 환산', options: { bullet: true } },
  ], { x: M + 0.45, y: 3.85, w: 5.1, h: 2.1, fontSize: 14, color: ICE, fontFace: F, isTextBox: true, margin: 0, paraSpaceAfter: 6 })
  const chips = [['줌 · 팬', '수도권까지 확대해 단지 단위로 탐색'], ['호버 툴팁', '지역 · 단지 경쟁률 즉시 확인'], ['Bottom Sheet', '모바일에서 목록을 끌어올려 조회']]
  chips.forEach(([h, b], i) => {
    const y = 2.2 + i * 1.4
    card(s, 7.0, y, 5.6, 1.2)
    s.addText(h, { x: 7.35, y: y + 0.16, w: 5.0, h: 0.4, fontSize: 17, bold: true, color: NAVY, fontFace: F, isTextBox: true, margin: 0 })
    s.addText(b, { x: 7.35, y: y + 0.62, w: 5.0, h: 0.45, fontSize: 13, color: GRAY, fontFace: F, isTextBox: true, margin: 0 })
  })
  s.addText('"어디가 과열됐는지 3초에 안다" — 기능이 아니라 소요 시간으로 말한다', { x: M, y: 6.6, w: 11.9, h: 0.45, fontSize: 14, italic: true, color: GRAY, fontFace: F, isTextBox: true, margin: 0 })
}

/* ── S8 당첨자 통계 ────────────────────────── */
{
  const s = base()
  title(s, '④ 당첨자 통계 — 소문을 숫자로', '연령별 · 지역별 신청자 대비 당첨자, 가점 분포')
  const m = [['평균', 'AVRG_SCORE'], ['최저', 'LWET_SCORE'], ['최고', 'TOP_SCORE'], ['중위', 'MED_SCORE']]
  m.forEach(([h, code], i) => {
    const x = M + i * 3.05
    card(s, x, 2.2, 2.75, 2.0, NAVY)
    s.addText(h, { x, y: 2.5, w: 2.75, h: 0.65, fontSize: 30, bold: true, color: WHITE, align: 'center', fontFace: F, isTextBox: true, margin: 0 })
    s.addText('당첨 가점', { x, y: 3.2, w: 2.75, h: 0.3, fontSize: 13, color: ORANGE, align: 'center', fontFace: F, isTextBox: true, margin: 0 })
    s.addText(code, { x, y: 3.6, w: 2.75, h: 0.3, fontSize: 11, color: '8FA4BF', align: 'center', fontFace: F, isTextBox: true, margin: 0 })
  })
  card(s, M, 4.75, 11.9, 1.6)
  s.addText('"요즘 60점으론 안 된다"는 말 — 여기서 월 단위로 검증된다', { x: M + 0.4, y: 4.98, w: 11.1, h: 0.5, fontSize: 20, bold: true, color: NAVY, fontFace: F, isTextBox: true, margin: 0 })
  s.addText('모든 통계에 기준월(STAT_DE)과 표본 수를 함께 노출 — 인용 가능한 형태로 제공한다', { x: M + 0.4, y: 5.6, w: 11.1, h: 0.5, fontSize: 14, color: GRAY, fontFace: F, isTextBox: true, margin: 0 })
  s.addText('출처: 공공데이터포털 청약홈 OpenAPI · 한국부동산원', { x: M, y: 6.65, w: 11.9, h: 0.35, fontSize: 11, color: '8E9AA8', fontFace: F, isTextBox: true, margin: 0 })
}

/* ── S9 AI 예측 ────────────────────────────── */
{
  const s = base()
  title(s, '⑤ AI 당첨 예측 — 이 서비스의 심장', '3단계 입력 → 84점 가점 환산 → 지역 당첨 분포와 비교 → 확률 + 근거 문장')
  s.addChart(p.ChartType.bar, [{
    name: '배점',
    labels: ['무주택 기간', '부양가족 수', '입주자저축\n가입기간'],
    values: [32, 35, 17],
  }], {
    x: M, y: 2.0, w: 5.9, h: 4.3,
    barDir: 'col', chartColors: [NAVY, ORANGE, NAVY2],
    varyColors: true,
    showTitle: true, title: '청약가점 만점 84점의 구성', titleFontSize: 15, titleColor: NAVY, titleFontFace: F,
    showValue: true, dataLabelPosition: 'outEnd', dataLabelColor: NAVY, dataLabelFontSize: 14, dataLabelFontFace: F, dataLabelFontBold: true,
    showLegend: false, catAxisLabelColor: GRAY, catAxisLabelFontSize: 11, catAxisLabelFontFace: F,
    valAxisLabelColor: GRAY, valAxisLabelFontSize: 10, valAxisMaxVal: 40,
    valGridLine: { color: 'EDF1F6', size: 1 }, catGridLine: { style: 'none' },
    barGapWidthPct: 70,
  })
  const steps = [['입력', '무주택 기간 · 부양가족 · 통장 가입기간 3단계'], ['환산', '「주택공급에 관한 규칙」 별표1 기준 84점 체계'], ['비교', '지역별 최근 당첨 가점 평균 · 최저 · 최고와 대조'], ['해석', '확률 5~94% + 커트라인 대비 여유 점수 문장']]
  steps.forEach(([h, b], i) => {
    const y = 2.05 + i * 1.02
    card(s, 6.9, y, 5.7, 0.88)
    numCircle(s, 7.15, y + 0.21, i + 1, i === 3 ? ORANGE : NAVY)
    s.addText(h, { x: 7.75, y: y, w: 1.0, h: 0.88, fontSize: 15, bold: true, color: NAVY, fontFace: F, isTextBox: true, margin: 0, valign: 'middle' })
    s.addText(b, { x: 8.75, y: y, w: 3.7, h: 0.88, fontSize: 12, color: GRAY, fontFace: F, isTextBox: true, margin: 0, valign: 'middle' })
  })
  s.addText('블랙박스가 아니다 — 왜 그 숫자인지 설명할 수 있는 규칙 기반 모델이다', { x: 6.9, y: 6.2, w: 5.7, h: 0.7, fontSize: 14, italic: true, bold: true, color: ORANGE, fontFace: F, isTextBox: true, margin: 0, lineSpacingMultiple: 1.2 })
  s.addNotes('심사위원이 좋아하는 문장: "맞히는 게 아니라 설명 가능한 기준선을 제공한다."')
}

/* ── S10 아키텍처 ──────────────────────────── */
{
  const s = base()
  title(s, '아키텍처 — 키는 서버에, 캐시는 엣지에', 'Next.js 16 App Router · React 19 · TypeScript · Tailwind v4 · Recharts')
  const boxes = [
    ['청약홈 OpenAPI', '공공데이터포털\n한국부동산원 통계', ICE, NAVY],
    ['Next.js Route Handler', 'app/api/* — API 키 서버 보관\nrevalidate 300~600초 캐싱', NAVY, WHITE],
    ['클라이언트 대시보드', '탭 단위 dynamic import\nssr:false — 초기 번들 최소화', ICE, NAVY],
  ]
  boxes.forEach(([h, b, bg, fg], i) => {
    const x = M + i * 4.35
    card(s, x, 2.2, 3.7, 2.2, bg)
    s.addText(h, { x: x + 0.28, y: 2.5, w: 3.14, h: 0.5, fontSize: 17, bold: true, color: fg, fontFace: F, isTextBox: true, margin: 0 })
    s.addText(b, { x: x + 0.28, y: 3.1, w: 3.14, h: 1.1, fontSize: 12.5, color: i === 1 ? 'C7D6E8' : GRAY, fontFace: F, isTextBox: true, margin: 0, lineSpacingMultiple: 1.25 })
    if (i < 2) s.addShape(p.ShapeType.rightArrow, { x: x + 3.82, y: 3.1, w: 0.4, h: 0.4, fill: { color: ORANGE } })
  })
  const pts = [
    ['API 키 노출 0', '모든 외부 호출은 서버 라우트에서만 수행 — 클라이언트 번들에 키가 들어가지 않는다'],
    ['호출량 제어', 'revalidate 기반 캐시(경쟁률 600초 / 분양정보 300초)로 공공 API 쿼터와 응답 지연을 동시에 억제'],
    ['타입 안전', '공공 API 원본 필드를 lib/types.ts 에 명시적으로 선언해 코드값 해석을 한 곳에 모았다'],
  ]
  pts.forEach(([h, b], i) => {
    const y = 5.0 + i * 0.76
    s.addShape(p.ShapeType.ellipse, { x: M, y: y + 0.11, w: 0.2, h: 0.2, fill: { color: ORANGE } })
    s.addText(h, { x: M + 0.35, y: y, w: 2.5, h: 0.42, fontSize: 14, bold: true, color: NAVY, fontFace: F, isTextBox: true, margin: 0, valign: 'middle' })
    s.addText(b, { x: M + 2.9, y: y, w: 9.0, h: 0.42, fontSize: 12.5, color: GRAY, fontFace: F, isTextBox: true, margin: 0, valign: 'middle' })
  })
}

/* ── S11 데모 ──────────────────────────────── */
{
  const s = base()
  title(s, '라이브 데모 — 3분, 클릭 7번', '기능 순서가 아니라 사용자의 판단 순서로 보여준다')
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
    const x = M + col * 6.2
    const y = 2.0 + row * 1.0
    card(s, x, y, 5.7, 0.86, i === 6 ? NAVY : ICE)
    numCircle(s, x + 0.25, y + 0.25, i + 1, i === 6 ? ORANGE : NAVY)
    s.addText(h, { x: x + 0.85, y: y + 0.12, w: 4.6, h: 0.38, fontSize: 14.5, bold: true, color: i === 6 ? WHITE : NAVY, fontFace: F, isTextBox: true, margin: 0 })
    s.addText(b, { x: x + 0.85, y: y + 0.52, w: 4.6, h: 0.36, fontSize: 12, color: i === 6 ? ORANGE : GRAY, fontFace: F, isTextBox: true, margin: 0 })
  })
  s.addShape(p.ShapeType.roundRect, { x: 6.9, y: 6.35, w: 5.7, h: 0.72, rectRadius: 0.1, fill: { color: 'FDEDE6' }, line: { color: ORANGE, width: 1 } })
  s.addText('안전장치: 로딩 3초 초과 시 즉시 녹화본 전환', { x: 6.9, y: 6.35, w: 5.7, h: 0.72, fontSize: 13, bold: true, color: '9E3A12', align: 'center', valign: 'middle', fontFace: F, isTextBox: true, margin: 0 })
}

/* ── S12 차별점 ────────────────────────────── */
{
  const s = base()
  title(s, '우리는 청약홈을 대체하지 않는다', '청약홈을 ‘읽어주는 레이어’다')
  const hdr = ['', '청약홈', '부동산 포털', '커뮤니티', '집캐치']
  const rows = [
    ['원천 데이터', '◎', '△', '✕', '◎'],
    ['해석 · 시각화', '✕', '△', '△', '◎'],
    ['개인화 판단', '✕', '✕', '△ (비검증)', '◎ (근거 제시)'],
    ['갱신 주기', '실시간', '수동', '비정형', '실시간 + 캐시'],
  ]
  const tbl = [hdr.map(t => ({ text: t, options: { bold: true, color: WHITE, fill: { color: NAVY }, fontSize: 15, align: 'center', fontFace: F } }))]
  rows.forEach((r, ri) => {
    tbl.push(r.map((t, ci) => ({
      text: t,
      options: {
        fontSize: ci === 0 ? 14 : 16,
        bold: ci === 0 || ci === 4,
        color: ci === 4 ? ORANGE : NAVY,
        align: ci === 0 ? 'left' : 'center',
        fill: { color: ri % 2 ? 'F5F8FC' : WHITE },
        fontFace: F,
      },
    })))
  })
  s.addTable(tbl, { x: M, y: 2.2, w: 11.9, colW: [2.9, 2.0, 2.3, 2.5, 2.2], rowH: 0.76, border: { type: 'solid', color: LINE, pt: 1 }, valign: 'middle' })
  s.addText('진입장벽은 기능이 아니라 ‘누적 사용자 가점 분포 데이터’에서 생긴다', { x: M, y: 6.4, w: 11.9, h: 0.5, fontSize: 17, italic: true, bold: true, color: NAVY, fontFace: F, isTextBox: true, margin: 0 })
}

/* ── S13 로드맵 ────────────────────────────── */
{
  const s = base()
  title(s, '로드맵 — 정확도부터 손익까지', '취약점은 지적당하기 전에 먼저 올린다')
  const q = [
    ['Q1', '가점 로직 완전 정합화', '현행 선형 근사를 「주택공급에 관한 규칙」 별표1 구간표로 교체.\n0점 · 1년 미만 구간 오차 제거. 정확도는 신뢰의 전부다.', ORANGE],
    ['Q2', '알림 · 자가진단', '관심단지 마감 D-3 푸시 알림,\n특별공급 자격 자가진단 플로우 추가.', NAVY],
    ['Q3', '당첨 후 손익까지', '실거래가 · 전월세 데이터 결합,\n"당첨되면 얼마인가"까지 확장.', NAVY2],
  ]
  q.forEach(([tag, h, b, c], i) => {
    const x = M + i * 4.06
    card(s, x, 2.2, 3.76, 3.7)
    s.addShape(p.ShapeType.roundRect, { x: x + 0.3, y: 2.5, w: 0.85, h: 0.42, rectRadius: 0.08, fill: { color: c } })
    s.addText(tag, { x: x + 0.3, y: 2.5, w: 0.85, h: 0.42, fontSize: 14, bold: true, color: WHITE, align: 'center', valign: 'middle', fontFace: F, isTextBox: true, margin: 0 })
    s.addText(h, { x: x + 0.3, y: 3.1, w: 3.16, h: 0.85, fontSize: 19, bold: true, color: NAVY, fontFace: F, isTextBox: true, margin: 0, lineSpacingMultiple: 1.15 })
    s.addText(b, { x: x + 0.3, y: 4.05, w: 3.16, h: 1.7, fontSize: 12.5, color: GRAY, fontFace: F, isTextBox: true, margin: 0, lineSpacingMultiple: 1.3 })
  })
  s.addText('수익 모델:  무료 확장 → 알림 · 정밀 리포트 구독 → 시행사 · 분양대행사 대상 수요 분석 B2B', { x: M, y: 6.4, w: 11.9, h: 0.5, fontSize: 15, bold: true, color: NAVY, fontFace: F, isTextBox: true, margin: 0 })
}

/* ── S14 클로징 ────────────────────────────── */
{
  const s = base(true)
  s.addShape(p.ShapeType.ellipse, { x: -1.8, y: 4.0, w: 5.0, h: 5.0, fill: { color: NAVY2 } })
  s.addShape(p.ShapeType.ellipse, { x: 11.6, y: -1.0, w: 3.2, h: 3.2, fill: { color: ORANGE }, transparency: 65 })
  s.addText('집을 잡는 건\n운이 아니라 기준입니다', { x: 1.4, y: 2.1, w: 10.5, h: 2.4, fontSize: 46, bold: true, color: WHITE, align: 'center', fontFace: F, isTextBox: true, margin: 0, lineSpacingMultiple: 1.25 })
  s.addText('공개된 데이터를, 읽을 수 있는 판단으로', { x: 1.4, y: 4.7, w: 10.5, h: 0.5, fontSize: 20, color: ORANGE, align: 'center', fontFace: F, isTextBox: true, margin: 0 })
  s.addText('집캐치 · JibCatch', { x: 1.4, y: 6.0, w: 10.5, h: 0.45, fontSize: 15, color: '9FB3CC', align: 'center', fontFace: F, isTextBox: true, margin: 0 })
  s.addNotes('마지막 문장은 슬라이드를 보지 않고 외워서 말한다.')
}

p.writeFile({ fileName: process.argv[2] }).then(f => console.log('OK', f))
