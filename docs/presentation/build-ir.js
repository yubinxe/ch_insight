const pptxgen = require('pptxgenjs')

const FONT = process.env.DECK_FONT || 'Pretendard'
const p = new pptxgen()
p.layout = 'LAYOUT_WIDE'            // 13.3 x 7.5
p.author = 'JibCatch'
p.title = '집캐치 IR'

const NAVY = '0B1F3A', NAVY2 = '17375E', ORANGE = 'FF6B2C'
const SAND = 'FFF1E9', ICE = 'EEF3F9', LINE = 'D8E2EE'
const GRAY = '5B6B7F', GRAY2 = '8A99AB', WHITE = 'FFFFFF'

const W = 13.3, M = 0.8, CW = W - M * 2
let pageNo = 0

const shadow = () => ({ type: 'outer', color: 'A8B6C8', blur: 12, offset: 2, angle: 90, opacity: 0.25 })

function slide(dark) {
  const s = p.addSlide()
  s.background = { color: dark ? NAVY : WHITE }
  return s
}

/** 한 장 = 한 메시지. 헤드라인만 크게, 부연은 한 줄. */
function head(s, kicker, title, sub) {
  s.addText(kicker, { x: M, y: 0.55, w: CW, h: 0.3, fontSize: 12.5, bold: true, color: ORANGE, charSpacing: 2, fontFace: FONT, isTextBox: true, margin: 0 })
  s.addText(title, { x: M, y: 0.92, w: CW, h: 0.8, fontSize: 40, bold: true, color: NAVY, fontFace: FONT, isTextBox: true, margin: 0, charSpacing: -0.8 })
  if (sub) s.addText(sub, { x: M, y: 1.78, w: CW, h: 0.36, fontSize: 15, color: GRAY, fontFace: FONT, isTextBox: true, margin: 0 })
}

function foot(s) {
  pageNo += 1
  s.addText('집캐치  JibCatch', { x: M, y: 6.92, w: 4, h: 0.3, fontSize: 10, color: GRAY2, fontFace: FONT, isTextBox: true, margin: 0 })
  s.addText(String(pageNo).padStart(2, '0'), { x: W - M - 1, y: 6.92, w: 1, h: 0.3, fontSize: 10, bold: true, color: GRAY2, align: 'right', fontFace: FONT, isTextBox: true, margin: 0 })
}

function card(s, x, y, w, h, fill, noShadow) {
  const o = { x, y, w, h, rectRadius: 0.16, fill: { color: fill || ICE }, line: { color: fill && fill !== ICE ? fill : LINE, width: 1 } }
  if (!noShadow) o.shadow = shadow()
  s.addShape(p.ShapeType.roundRect, o)
}

function banner(s, y, text, warm) {
  s.addShape(p.ShapeType.roundRect, {
    x: M, y, w: CW, h: 0.9, rectRadius: 0.16,
    fill: { color: warm ? SAND : NAVY }, line: { color: warm ? ORANGE : NAVY, width: 1 },
  })
  s.addText(text, {
    x: M + 0.5, y, w: CW - 1, h: 0.9, fontSize: 17, bold: true,
    color: warm ? 'B3431A' : WHITE, valign: 'middle', fontFace: FONT, isTextBox: true, margin: 0,
  })
}

/* ══ 01 · 표지 ═══════════════════════════════ */
{
  const s = slide(true)
  s.addShape(p.ShapeType.ellipse, { x: 9.3, y: -2.0, w: 6.4, h: 6.4, fill: { color: NAVY2 } })
  s.addShape(p.ShapeType.ellipse, { x: 11.3, y: 4.6, w: 2.9, h: 2.9, fill: { color: ORANGE } })
  s.addText('집캐치', { x: M, y: 2.15, w: 8, h: 1.5, fontSize: 84, bold: true, color: WHITE, fontFace: FONT, isTextBox: true, margin: 0, charSpacing: -2.5 })
  s.addText('청약, 감이 아니라 데이터로', { x: M, y: 3.85, w: 9, h: 0.7, fontSize: 32, bold: true, color: ORANGE, fontFace: FONT, isTextBox: true, margin: 0 })
  s.addText('청약홈 공공데이터를 실수요자의 판단으로 바꾸는 서비스', { x: M, y: 4.75, w: 9, h: 0.4, fontSize: 16, color: '9FB6D1', fontFace: FONT, isTextBox: true, margin: 0 })
  s.addText('IR 핵심 요약  ·  10장', { x: M, y: 5.9, w: 6, h: 0.35, fontSize: 12, color: '6D87A6', charSpacing: 1.5, fontFace: FONT, isTextBox: true, margin: 0 })
  s.addNotes('첫 문장: "청약 정보는 이미 다 공개돼 있습니다. 문제는 아무도 못 읽는다는 겁니다."')
}

/* ══ 02 · 문제 ═══════════════════════════════ */
{
  const s = slide()
  head(s, 'PROBLEM', '공개돼 있지만, 아무도 읽지 못한다', '청약 데이터는 100% 공개 — 병목은 접근성이 아니라 해석')
  const items = [
    ['흩어짐', '4개 API'],
    ['코드값', '읽을 수 없는 원본'],
    ['판단 공백', '카더라가 대체'],
  ]
  items.forEach(([h, b], i) => {
    const x = M + i * 3.95
    card(s, x, 2.5, 3.65, 2.1)
    s.addText(h, { x: x + 0.4, y: 2.85, w: 2.85, h: 0.6, fontSize: 28, bold: true, color: NAVY, fontFace: FONT, isTextBox: true, margin: 0 })
    s.addText(b, { x: x + 0.4, y: 3.55, w: 2.85, h: 0.5, fontSize: 15, color: GRAY, fontFace: FONT, isTextBox: true, margin: 0 })
  })
  banner(s, 5.3, '정보 비대칭이 아니라 해석 비대칭 — 여기가 시장이다', true)
  foot(s)
}

/* ══ 03 · 솔루션 (Before / After) ════════════ */
{
  const s = slide()
  head(s, 'SOLUTION', '코드값을 판단 문장으로 바꾼다', '같은 데이터, 다른 결과물')
  card(s, M, 2.5, 5.7, 3.1)
  s.addText('BEFORE', { x: M + 0.45, y: 2.8, w: 3, h: 0.3, fontSize: 12, bold: true, color: GRAY2, charSpacing: 2, fontFace: FONT, isTextBox: true, margin: 0 })
  s.addText('LWET_SCORE : 52\nAVRG_SCORE : 58.2\nSUBSCRPT_AREA_CODE : 100', {
    x: M + 0.45, y: 3.3, w: 4.9, h: 1.5, fontSize: 15, color: GRAY, fontFace: 'Courier New', isTextBox: true, margin: 0, lineSpacingMultiple: 1.45,
  })
  s.addText('공공 API 원본', { x: M + 0.45, y: 4.95, w: 4.9, h: 0.35, fontSize: 13, color: GRAY2, fontFace: FONT, isTextBox: true, margin: 0 })

  s.addShape(p.ShapeType.rightArrow, { x: 6.68, y: 3.85, w: 0.45, h: 0.45, fill: { color: ORANGE } })

  card(s, 7.35, 2.5, 5.15, 3.1, NAVY)
  s.addText('AFTER', { x: 7.8, y: 2.8, w: 3, h: 0.3, fontSize: 12, bold: true, color: ORANGE, charSpacing: 2, fontFace: FONT, isTextBox: true, margin: 0 })
  s.addText('당첨 확률 78%', { x: 7.8, y: 3.25, w: 4.3, h: 0.6, fontSize: 30, bold: true, color: WHITE, fontFace: FONT, isTextBox: true, margin: 0 })
  s.addText('내 가점 64점은 최근 커트라인보다\n12점 여유가 있습니다', {
    x: 7.8, y: 3.95, w: 4.3, h: 0.9, fontSize: 15, color: 'C3D4E8', fontFace: FONT, isTextBox: true, margin: 0, lineSpacingMultiple: 1.35,
  })
  s.addText('집캐치 출력', { x: 7.8, y: 5.05, w: 4.3, h: 0.35, fontSize: 13, color: '7E96B4', fontFace: FONT, isTextBox: true, margin: 0 })

  banner(s, 5.9, '리스트를 더 주지 않는다 — 좌표를 준다')
  foot(s)
}

/* ══ 04 · 제품 ═══════════════════════════════ */
{
  const s = slide()
  head(s, 'PRODUCT', '질문 5개를 한 화면에서 끝낸다', '탭 5개 = 실수요자의 의사결정 5단계')
  const rows = [
    ['분양정보', '지금 넣을 수 있는 게 뭐지?'],
    ['경쟁률', '이 단지, 얼마나 몰리지?'],
    ['핫플레이스', '어느 지역이 과열됐지?'],
    ['당첨자 통계', '실제로 누가 됐지?'],
    ['AI 예측', '나는 될까?'],
  ]
  rows.forEach(([t, q], i) => {
    const y = 2.5 + i * 0.84
    const last = i === 4
    card(s, M, y, CW, 0.72, last ? NAVY : ICE)
    s.addShape(p.ShapeType.ellipse, { x: M + 0.32, y: y + 0.16, w: 0.4, h: 0.4, fill: { color: last ? ORANGE : NAVY } })
    s.addText(String(i + 1), { x: M + 0.32, y: y + 0.16, w: 0.4, h: 0.4, fontSize: 13, bold: true, color: WHITE, align: 'center', valign: 'middle', fontFace: FONT, isTextBox: true, margin: 0 })
    s.addText(t, { x: M + 1.0, y, w: 2.6, h: 0.72, fontSize: 17, bold: true, color: last ? WHITE : NAVY, valign: 'middle', fontFace: FONT, isTextBox: true, margin: 0 })
    s.addText(q, { x: M + 3.7, y, w: 7.4, h: 0.72, fontSize: 17, bold: last, color: last ? ORANGE : GRAY, valign: 'middle', fontFace: FONT, isTextBox: true, margin: 0 })
  })
  s.addText('마지막 한 줄이 이 서비스의 존재 이유', { x: M, y: 6.8, w: CW, h: 0.35, fontSize: 13.5, color: GRAY, fontFace: FONT, isTextBox: true, margin: 0 })
  foot(s)
}

/* ══ 05 · 핵심 기능 ══════════════════════════ */
{
  const s = slide()
  head(s, 'CORE', '입력 3개로 내 위치를 계산한다', '가점 84점 체계 →「주택공급에 관한 규칙」별표1 기준')

  const inputs = [['무주택', '7년'], ['부양가족', '2명'], ['통장', '9년']]
  inputs.forEach(([t, v], i) => {
    const y = 2.6 + i * 1.15
    card(s, M, y, 3.5, 0.95)
    s.addText(t, { x: M + 0.35, y, w: 1.7, h: 0.95, fontSize: 14, color: GRAY, valign: 'middle', fontFace: FONT, isTextBox: true, margin: 0 })
    s.addText(v, { x: M + 1.9, y, w: 1.3, h: 0.95, fontSize: 22, bold: true, color: NAVY, align: 'right', valign: 'middle', fontFace: FONT, isTextBox: true, margin: 0 })
  })
  s.addShape(p.ShapeType.rightArrow, { x: 4.6, y: 3.9, w: 0.45, h: 0.45, fill: { color: ORANGE } })

  card(s, 5.3, 2.6, 3.3, 3.05, NAVY)
  s.addText('64', { x: 5.3, y: 3.2, w: 3.3, h: 1.2, fontSize: 76, bold: true, color: WHITE, align: 'center', fontFace: FONT, isTextBox: true, margin: 0 })
  s.addText('내 가점 / 84점', { x: 5.3, y: 4.5, w: 3.3, h: 0.4, fontSize: 14, color: '9FB6D1', align: 'center', fontFace: FONT, isTextBox: true, margin: 0 })

  s.addShape(p.ShapeType.rightArrow, { x: 8.75, y: 3.9, w: 0.45, h: 0.45, fill: { color: ORANGE } })

  card(s, 9.45, 2.6, 3.05, 3.05, SAND)
  s.addText('78%', { x: 9.45, y: 3.2, w: 3.05, h: 1.2, fontSize: 60, bold: true, color: ORANGE, align: 'center', fontFace: FONT, isTextBox: true, margin: 0 })
  s.addText('당첨 가능성', { x: 9.45, y: 4.5, w: 3.05, h: 0.4, fontSize: 14, color: 'B3431A', align: 'center', fontFace: FONT, isTextBox: true, margin: 0 })

  banner(s, 5.9, '맞히는 게 아니라, 왜 그 숫자인지 설명한다 — 커트라인 대비 12점 여유')
  foot(s)
}

/* ══ 06 · 포지셔닝 맵 ════════════════════════ */
{
  const s = slide()
  head(s, 'POSITIONING', '아무도 개인화 판단을 하지 않는다', '해석 깊이 × 개인화 — 우상단이 비어 있다')

  const ox = 3.9, oy = 2.75, ow = 8.6, oh = 3.3
  s.addShape(p.ShapeType.rect, { x: ox, y: oy, w: ow, h: oh, fill: { color: 'F6F9FC' }, line: { color: LINE, width: 1 } })
  s.addShape(p.ShapeType.line, { x: ox, y: oy + oh / 2, w: ow, h: 0, line: { color: LINE, width: 1, dashType: 'dash' } })
  s.addShape(p.ShapeType.line, { x: ox + ow / 2, y: oy, w: 0, h: oh, line: { color: LINE, width: 1, dashType: 'dash' } })

  s.addText('개인화 판단  →', { x: ox, y: oy + oh + 0.14, w: ow, h: 0.32, fontSize: 12, bold: true, color: GRAY, align: 'center', fontFace: FONT, isTextBox: true, margin: 0 })
  s.addText('↑  해석 깊이', { x: ox + 0.15, y: oy - 0.42, w: 2.4, h: 0.32, fontSize: 12, bold: true, color: GRAY, fontFace: FONT, isTextBox: true, margin: 0 })

  const dots = [
    ['청약홈', 0.14, 0.64, NAVY2],
    ['부동산 포털', 0.30, 0.34, GRAY2],
    ['커뮤니티', 0.58, 0.18, GRAY2],
    ['집캐치', 0.80, 0.84, ORANGE],
  ]
  dots.forEach(([name, fx, fy, color]) => {
    const isUs = name === '집캐치'
    const d = isUs ? 0.62 : 0.34
    const cx = ox + ow * fx - d / 2
    const cy = oy + oh * (1 - fy) - d / 2
    s.addShape(p.ShapeType.ellipse, { x: cx, y: cy, w: d, h: d, fill: { color } })
    s.addText(name, {
      x: cx - 1.0, y: cy + d + 0.08, w: d + 2.0, h: 0.32,
      fontSize: isUs ? 15 : 12.5, bold: isUs, color: isUs ? ORANGE : GRAY,
      align: 'center', fontFace: FONT, isTextBox: true, margin: 0,
    })
  })

  card(s, M, 2.45, 2.4, 1.72, NAVY)
  s.addText('빈 사분면', { x: M + 0.25, y: 2.7, w: 1.9, h: 0.4, fontSize: 16, bold: true, color: WHITE, fontFace: FONT, isTextBox: true, margin: 0 })
  s.addText('원천 데이터 위에\n판단을 얹는 층', { x: M + 0.25, y: 3.2, w: 1.9, h: 0.8, fontSize: 12.5, color: 'C3D4E8', fontFace: FONT, isTextBox: true, margin: 0, lineSpacingMultiple: 1.3 })

  card(s, M, 4.45, 2.4, 1.72, SAND)
  s.addText('진입장벽', { x: M + 0.25, y: 4.7, w: 1.9, h: 0.4, fontSize: 16, bold: true, color: 'B3431A', fontFace: FONT, isTextBox: true, margin: 0 })
  s.addText('누적 사용자\n가점 분포 데이터', { x: M + 0.25, y: 5.2, w: 1.9, h: 0.8, fontSize: 12.5, color: 'B3431A', fontFace: FONT, isTextBox: true, margin: 0, lineSpacingMultiple: 1.3 })

  s.addText('청약홈을 대체하지 않는다 — 읽어준다', { x: M, y: 6.5, w: 8, h: 0.4, fontSize: 14, bold: true, color: NAVY, fontFace: FONT, isTextBox: true, margin: 0 })
  foot(s)
}

/* ══ 07 · 타깃 ═══════════════════════════════ */
{
  const s = slide()
  head(s, 'TARGET', '공고는 매달 본다, 못 정할 뿐이다', '첫 집을 노리는 2030 무주택 실수요자')
  card(s, M, 2.5, 6.2, 3.3, NAVY)
  s.addText('28세 · 수도권\n통장 7년차 · 가점 60점 초반', {
    x: M + 0.5, y: 2.95, w: 5.2, h: 1.1, fontSize: 24, bold: true, color: WHITE, fontFace: FONT, isTextBox: true, margin: 0, lineSpacingMultiple: 1.3,
  })
  s.addText('"넣어야 할지를 모르겠다"', { x: M + 0.5, y: 4.45, w: 5.2, h: 0.6, fontSize: 18, italic: true, color: ORANGE, fontFace: FONT, isTextBox: true, margin: 0 })

  const why = [
    ['원하는 것', '리스트가 아니라 내 위치'],
    ['행동 전환점', '마감 D-5 알림'],
    ['확장 경로', '당첨 후 손익까지'],
  ]
  why.forEach(([t, b], i) => {
    const y = 2.5 + i * 1.15
    card(s, 7.3, y, 5.2, 1.0)
    s.addText(t, { x: 7.6, y, w: 1.7, h: 1.0, fontSize: 13, bold: true, color: ORANGE, valign: 'middle', fontFace: FONT, isTextBox: true, margin: 0 })
    s.addText(b, { x: 9.3, y, w: 3.0, h: 1.0, fontSize: 14.5, bold: true, color: NAVY, valign: 'middle', fontFace: FONT, isTextBox: true, margin: 0 })
  })
  banner(s, 5.9, '가장 비싼 실수는 떨어지는 게 아니라 모르고 지나치는 것', true)
  foot(s)
}

/* ══ 08 · 비즈니스 모델 (계단) ═══════════════ */
{
  const s = slide()
  head(s, 'BUSINESS MODEL', '무료로 모으고, 판단으로 과금하고, 데이터로 번다', '마지막 단계가 실제 매출 축')
  const steps = [
    ['STEP 1', '무료 확장', '전 기능 무료 공개\n사용자 · 가점 데이터 확보', 'MAU', 2.8, ICE, NAVY, GRAY],
    ['STEP 2', '구독 전환', '알림 · 정밀 리포트\n특공 자격 진단', '유료 전환율', 3.3, NAVY2, WHITE, 'C3D4E8'],
    ['STEP 3', 'B2B 데이터', '시행사 · 분양대행사\n수요 · 가점 분포 분석', '계약 단지 수', 3.8, NAVY, WHITE, 'C3D4E8'],
  ]
  steps.forEach(([tag, h, b, kpi, ht, bg, fg, bodyC], i) => {
    const x = M + i * 4.05
    const y = 6.15 - ht
    card(s, x, y, 3.75, ht, bg)
    s.addText(tag, { x: x + 0.35, y: y + 0.28, w: 3.05, h: 0.3, fontSize: 11.5, bold: true, color: ORANGE, charSpacing: 1.5, fontFace: FONT, isTextBox: true, margin: 0 })
    s.addText(h, { x: x + 0.35, y: y + 0.66, w: 3.05, h: 0.55, fontSize: 22, bold: true, color: fg, fontFace: FONT, isTextBox: true, margin: 0 })
    s.addText(b, { x: x + 0.35, y: y + 1.35, w: 3.05, h: 0.9, fontSize: 13, color: bodyC, fontFace: FONT, isTextBox: true, margin: 0, lineSpacingMultiple: 1.35 })
    s.addText('핵심 지표 — ' + kpi, { x: x + 0.35, y: y + 2.35, w: 3.05, h: 0.35, fontSize: 12, bold: true, color: i === 0 ? NAVY2 : WHITE, fontFace: FONT, isTextBox: true, margin: 0 })
  })
  s.addText('사용자가 남긴 가점 · 관심단지 데이터는 경쟁사가 복제할 수 없다', {
    x: M, y: 6.45, w: CW, h: 0.4, fontSize: 15, bold: true, color: NAVY, fontFace: FONT, isTextBox: true, margin: 0,
  })
  foot(s)
}

/* ══ 09 · 로드맵 (타임라인) ══════════════════ */
{
  const s = slide()
  head(s, 'ROADMAP', '정확도부터 손익까지', '취약점은 지적당하기 전에 먼저 올린다')
  const y0 = 3.5
  s.addShape(p.ShapeType.line, { x: M + 0.6, y: y0, w: CW - 1.2, h: 0, line: { color: LINE, width: 2 } })
  const q = [
    ['Q1', '가점 로직 정합화', '선형 근사 → 별표1 구간표\n0점 · 1년 미만 오차 제거', ORANGE],
    ['Q2', '알림 · 자가진단', '마감 D-3 푸시\n특공 자격 진단', NAVY2],
    ['Q3', '당첨 후 손익', '실거래가 · 전월세 결합\n"얼마인가"까지', NAVY],
  ]
  q.forEach(([tag, h, b, c], i) => {
    const cx = M + 1.4 + i * ((CW - 2.8) / 2)
    s.addShape(p.ShapeType.ellipse, { x: cx - 0.3, y: y0 - 0.3, w: 0.6, h: 0.6, fill: { color: c } })
    s.addText(tag, { x: cx - 0.3, y: y0 - 0.3, w: 0.6, h: 0.6, fontSize: 13, bold: true, color: WHITE, align: 'center', valign: 'middle', fontFace: FONT, isTextBox: true, margin: 0 })
    s.addText(h, { x: cx - 1.75, y: y0 + 0.5, w: 3.5, h: 0.45, fontSize: 19, bold: true, color: NAVY, align: 'center', fontFace: FONT, isTextBox: true, margin: 0 })
    s.addText(b, { x: cx - 1.75, y: y0 + 1.05, w: 3.5, h: 0.9, fontSize: 13, color: GRAY, align: 'center', fontFace: FONT, isTextBox: true, margin: 0, lineSpacingMultiple: 1.35 })
  })
  banner(s, 5.8, '정확도는 신뢰의 전부 — 그래서 Q1이 정확도다')
  foot(s)
}

/* ══ 10 · 클로징 ═════════════════════════════ */
{
  const s = slide(true)
  s.addShape(p.ShapeType.ellipse, { x: -2.2, y: 3.6, w: 5.6, h: 5.6, fill: { color: NAVY2 } })
  s.addShape(p.ShapeType.ellipse, { x: 11.4, y: -1.3, w: 3.5, h: 3.5, fill: { color: ORANGE } })
  s.addText('청약은 되돌릴 수 없는 결정입니다', { x: 1.3, y: 2.0, w: 10.7, h: 0.6, fontSize: 20, color: '9FB6D1', align: 'center', fontFace: FONT, isTextBox: true, margin: 0 })
  s.addText('집을 잡는 건\n운이 아니라 기준입니다', {
    x: 1.3, y: 2.75, w: 10.7, h: 2.2, fontSize: 48, bold: true, color: WHITE, align: 'center', fontFace: FONT, isTextBox: true, margin: 0, lineSpacingMultiple: 1.25,
  })
  s.addText('공개된 데이터를, 읽을 수 있는 판단으로', { x: 1.3, y: 5.1, w: 10.7, h: 0.5, fontSize: 20, bold: true, color: ORANGE, align: 'center', fontFace: FONT, isTextBox: true, margin: 0 })
  s.addText('집캐치  ·  JibCatch', { x: 1.3, y: 6.15, w: 10.7, h: 0.45, fontSize: 14, color: '7E96B4', align: 'center', charSpacing: 2, fontFace: FONT, isTextBox: true, margin: 0 })
  s.addNotes('마지막 문장은 슬라이드를 보지 않고 외워서 말한다.')
}

p.writeFile({ fileName: process.argv[2] }).then(f => console.log('OK', f))
