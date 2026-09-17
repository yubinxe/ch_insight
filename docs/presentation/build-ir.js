const pptxgen = require('pptxgenjs')
const FONT = process.env.DECK_FONT || 'Pretendard'
const p = new pptxgen()
p.layout = 'LAYOUT_WIDE'
p.author = 'ZipCatch'
p.title = '집캐치 IR'

/* 제품 디자인 규격 그대로 — docs/strategy/consumer-design-direction */
const HANJI='F4F1EB', CARD='FFFFFF', INK='14110C', BODY='3B352C',
      SUB='6F6859', RULE='E2DBCF', VERM='A83A20', OK='3D5F43', WARN='7D6320'
const W=13.3, M=0.85, CW=W-M*2
let page=0

function slide(dark){
  const s=p.addSlide()
  s.background={color: dark?INK:HANJI}
  return s
}
/** 인덱스 번호 + 괘선 + 헤드라인 — 제품 시그니처 */
function head(s,no,title,sub){
  s.addText(no,{x:M,y:0.55,w:1.2,h:0.4,fontSize:15,bold:true,color:VERM,fontFace:FONT,isTextBox:true,margin:0,charSpacing:1})
  s.addShape(p.ShapeType.line,{x:M,y:1.02,w:CW,h:0,line:{color:RULE,width:1}})
  s.addText(title,{x:M,y:1.18,w:CW,h:0.8,fontSize:38,bold:true,color:INK,fontFace:FONT,isTextBox:true,margin:0,charSpacing:-0.5})
  if(sub) s.addText(sub,{x:M,y:2.0,w:CW,h:0.4,fontSize:15,color:SUB,fontFace:FONT,isTextBox:true,margin:0})
}
function foot(s){
  page+=1
  s.addText('집캐치',{x:M,y:6.95,w:3,h:0.3,fontSize:10,color:SUB,fontFace:FONT,isTextBox:true,margin:0})
  s.addText(String(page).padStart(3,'0'),{x:W-M-1,y:6.95,w:1,h:0.3,fontSize:10,bold:true,color:SUB,align:'right',fontFace:FONT,isTextBox:true,margin:0})
}
function card(s,x,y,w,h,fill){
  s.addShape(p.ShapeType.roundRect,{x,y,w,h,rectRadius:0.2,fill:{color:fill||CARD},line:{color:RULE,width:1}})
}
function seal(s,x,y,text){ // 인장처럼 아껴 쓰는 주묵 강조
  s.addShape(p.ShapeType.roundRect,{x,y,w:1.15,h:0.42,rectRadius:0.08,fill:{color:VERM}})
  s.addText(text,{x,y,w:1.15,h:0.42,fontSize:12,bold:true,color:'FFFFFF',align:'center',valign:'middle',fontFace:FONT,isTextBox:true,margin:0})
}

/* 001 표지 */
{
  const s=slide()
  s.addShape(p.ShapeType.line,{x:M,y:2.5,w:3.0,h:0,line:{color:VERM,width:3}})
  s.addText('집캐치',{x:M,y:2.75,w:9,h:1.5,fontSize:82,bold:true,color:INK,fontFace:FONT,isTextBox:true,margin:0,charSpacing:-2.5})
  s.addText('청약 · 공공임대 통합 탐색 서비스',{x:M,y:4.35,w:10,h:0.55,fontSize:22,color:BODY,fontFace:FONT,isTextBox:true,margin:0})
  s.addText('조건 입력 1회로 지원 가능 공고를 선별합니다',{x:M,y:4.95,w:10,h:0.45,fontSize:16,color:SUB,fontFace:FONT,isTextBox:true,margin:0})
  s.addShape(p.ShapeType.line,{x:M,y:5.75,w:CW,h:0,line:{color:RULE,width:1}})
  s.addText('청약홈 · LH청약플러스 공공데이터 기반   |   IR 요약자료',{x:M,y:5.95,w:10,h:0.4,fontSize:13,color:SUB,fontFace:FONT,isTextBox:true,margin:0})
  s.addNotes('첫 문장: "공고는 전부 공개돼 있습니다. 그런데 내가 지금 넣을 수 있는 게 뭔지는 아무도 안 알려줍니다."')
}

/* 002 문제 */
{
  const s=slide()
  head(s,'01','공고는 공개, 판단은 부재','공고는 전량 공개되어 있으나, 개인 조건 기준의 선별 수단이 존재하지 않습니다')
  const items=[['출처 분산','분양은 청약홈, 임대는 LH청약플러스로\n이원화. 단일 조회 수단 부재'],
               ['선별 기능 부재','지역 · 예산 · 면적 · 가구형태 기준\n후보 선별 기능 미제공'],
               ['일정 관리 공백','접수 · 서류 · 발표 · 계약 일정이\n공고문 내부에만 존재']]
  items.forEach(([h,b],i)=>{
    const x=M+i*3.95
    card(s,x,2.65,3.65,2.35)
    s.addText(String(i+1).padStart(2,'0'),{x:x+0.35,y:2.95,w:1,h:0.35,fontSize:13,bold:true,color:VERM,fontFace:FONT,isTextBox:true,margin:0})
    s.addText(h,{x:x+0.35,y:3.35,w:2.95,h:0.45,fontSize:20,bold:true,color:INK,fontFace:FONT,isTextBox:true,margin:0})
    s.addText(b,{x:x+0.35,y:3.92,w:2.95,h:0.95,fontSize:13.5,color:BODY,fontFace:FONT,isTextBox:true,margin:0,lineSpacingMultiple:1.3})
  })
  card(s,M,5.35,CW,1.05,CARD)
  s.addText('정보 접근성이 아닌 판단 지원의 부재',{x:M+0.5,y:5.35,w:CW-1,h:1.05,fontSize:19,bold:true,color:VERM,valign:'middle',fontFace:FONT,isTextBox:true,margin:0})
  foot(s)
}

/* 003 솔루션 */
{
  const s=slide()
  head(s,'02','조건 입력 1회 → 지원 가능 후보 선별','동일한 공고 데이터에서 검증 가능한 판단 근거를 생성합니다')
  card(s,M,2.65,5.6,3.0)
  s.addText('공고 원문',{x:M+0.45,y:2.95,w:3,h:0.35,fontSize:13,bold:true,color:SUB,charSpacing:1,fontFace:FONT,isTextBox:true,margin:0})
  s.addText('모집공고 제12차\n공급유형 국민임대\n전용면적 —\n보증금 —\n접수 2026.09.18~09.20',{x:M+0.45,y:3.45,w:4.8,h:1.7,fontSize:14,color:BODY,fontFace:'Courier New',isTextBox:true,margin:0,lineSpacingMultiple:1.35})
  s.addShape(p.ShapeType.rightArrow,{x:6.62,y:4.0,w:0.45,h:0.4,fill:{color:VERM}})
  card(s,7.3,2.65,5.15,3.0,INK)
  s.addText('내 후보',{x:7.75,y:2.95,w:3,h:0.35,fontSize:13,bold:true,color:VERM,charSpacing:1,fontFace:FONT,isTextBox:true,margin:0})
  s.addText('조건 충족 · 예산 이내',{x:7.75,y:3.45,w:4.3,h:0.5,fontSize:24,bold:true,color:'FFFFFF',fontFace:FONT,isTextBox:true,margin:0})
  s.addText('전용 29㎡ — 희망 최소 28㎡ 대비 +1㎡\n보증금 3,200만원 — 상한 8,000만원 이내\n접수 마감 D-3',{x:7.75,y:4.1,w:4.3,h:1.3,fontSize:14,color:'D8D2C6',fontFace:FONT,isTextBox:true,margin:0,lineSpacingMultiple:1.35})
  card(s,M,5.95,CW,0.95)
  s.addText('판단 근거를 점수 구간이 아닌 실측값 차이로 제시 — 「+1㎡」 「4,800만원 초과」',{x:M+0.5,y:5.95,w:CW-1,h:0.95,fontSize:16,bold:true,color:INK,valign:'middle',fontFace:FONT,isTextBox:true,margin:0})
  foot(s)
}

/* 004 소비자 흐름 */
{
  const s=slide()
  head(s,'03','6단계 사용자 여정','방문부터 재방문까지 단일 흐름으로 설계')
  const steps=[['방문','/','공고 열람 전 서비스 가치 인지'],
               ['조건 입력','/analyze','지역 → 주거비 → 가구 · 선호 3단계'],
               ['후보 확인','/results','조건 충족 · 예산 초과 분리 제시'],
               ['관심 · 알림','/saved','관심공고 저장 및 알림 수신 설정'],
               ['가입','/login','이메일 기반 계정 생성'],
               ['재방문','알림','신규 공고 · 마감 임박 알림으로 재유입']]
  steps.forEach(([t,path,d],i)=>{
    const col=i<3?0:1, row=i<3?i:i-3
    const x=M+col*6.1, y=2.65+row*1.35
    card(s,x,y,5.6,1.15)
    s.addText(String(i+1).padStart(2,'0'),{x:x+0.35,y:y+0.14,w:0.6,h:0.35,fontSize:13,bold:true,color:VERM,fontFace:FONT,isTextBox:true,margin:0})
    s.addText(t,{x:x+1.0,y:y+0.1,w:1.6,h:0.42,fontSize:18,bold:true,color:INK,fontFace:FONT,isTextBox:true,margin:0})
    s.addText(path,{x:x+2.6,y:y+0.15,w:2.6,h:0.35,fontSize:12,color:SUB,fontFace:'Courier New',isTextBox:true,margin:0})
    s.addText(d,{x:x+1.0,y:y+0.58,w:4.3,h:0.42,fontSize:13,color:BODY,fontFace:FONT,isTextBox:true,margin:0})
  })
  s.addText('CRM은 내부 운영 자산이며 소비자 판매 상품이 아님',{x:M,y:6.5,w:CW,h:0.35,fontSize:13,color:SUB,fontFace:FONT,isTextBox:true,margin:0})
  foot(s)
}

/* 005 판정 원칙 — 진짜 차별점 */
{
  const s=slide()
  head(s,'04','4축 분리 판정 구조','단일 점수 통합 시 예산 초과 건이 상위 노출되는 구조적 오류가 발생합니다')
  const four=[['자격','공식 요건','자격 엔진 도입 전 전 건 UNKNOWN 처리\n미확인을 불충족으로 단정하지 않음',WARN],
              ['예산','사용자가 정한 상한','기본 후보의 필수 조건\n초과 건은 초과액 명시 후 별도 반환',INK],
              ['선호 적합도','지역 50 · 면적 25 · 유형 25','희망 조건과의 근접도만 산출',OK],
              ['마감 긴급도','독립 지표','적합도 점수에 가산하지 않음',VERM]]
  four.forEach(([t,sub2,d,c],i)=>{
    const y=2.65+i*0.98
    card(s,M,y,CW,0.86)
    s.addShape(p.ShapeType.ellipse,{x:M+0.38,y:y+0.34,w:0.18,h:0.18,fill:{color:c}})
    s.addText(t,{x:M+0.72,y:y,w:1.6,h:0.86,fontSize:19,bold:true,color:INK,valign:'middle',fontFace:FONT,isTextBox:true,margin:0})
    s.addText(sub2,{x:M+2.4,y:y,w:2.7,h:0.86,fontSize:13,color:SUB,valign:'middle',fontFace:FONT,isTextBox:true,margin:0})
    s.addText(d,{x:M+5.2,y:y,w:6.4,h:0.86,fontSize:13.5,color:BODY,valign:'middle',fontFace:FONT,isTextBox:true,margin:0,lineSpacingMultiple:1.2})
  })
  s.addText('화면 내 최고 채도는 마감 정보에 한정',{x:M,y:6.55,w:CW,h:0.35,fontSize:13,italic:true,color:VERM,fontFace:FONT,isTextBox:true,margin:0})
  foot(s)
}

/* 006 정직성 */
{
  const s=slide()
  head(s,'05','데이터 신뢰성 확보 원칙','부동산 서비스의 신뢰 훼손 요인을 사전 차단합니다')
  const no=[['당첨 확률 미산출','공개 데이터 기준 개인별 확률 산출 근거 부재\n과거 당첨가점 비교만 제공, 표본 부재 시 자료 부족 표기'],
            ['결측값 미보완','청약홈 분양정보의 전용면적 · 보증금 · 월임대료는\nnull 유지 후 「미공개」로 표기'],
            ['일정 구분 표기','공고 원문 기한은 OFFICIAL,\n역산 준비일은 RECOMMENDED 로 구분 표기'],
            ['수집 실패 미은폐','수집 실패 시 sources[] 에 원문 그대로 반영\n합성 데이터로 대체하지 않음']]
  no.forEach(([t,d],i)=>{
    const col=i%2, row=Math.floor(i/2)
    const x=M+col*6.1, y=2.65+row*2.0
    card(s,x,y,5.6,1.8)
    s.addText('—',{x:x+0.4,y:y+0.22,w:0.4,h:0.35,fontSize:16,bold:true,color:VERM,fontFace:FONT,isTextBox:true,margin:0})
    s.addText(t,{x:x+0.85,y:y+0.18,w:4.5,h:0.45,fontSize:17,bold:true,color:INK,fontFace:FONT,isTextBox:true,margin:0})
    s.addText(d,{x:x+0.85,y:y+0.72,w:4.4,h:0.9,fontSize:13,color:BODY,fontFace:FONT,isTextBox:true,margin:0,lineSpacingMultiple:1.3})
  })
  foot(s)
}

/* 007 데이터 */
{
  const s=slide()
  head(s,'06','분양 · 임대 통합 수집','이원화된 공고 출처를 단일 서비스로 통합합니다')
  const src=[['청약홈','분양 모집공고','공공데이터포털',INK],
             ['LH 청약플러스','국민임대 · 행복주택 · 매입임대 · 통합공공임대','공공데이터포털',INK],
             ['CSV','운영자 직접 등록 공고','내부 업로드',SUB],
             ['예시','화면 구성용 합성 데이터','dataOrigin: SYNTHETIC',SUB]]
  src.forEach(([t,d,o,c],i)=>{
    const y=2.65+i*0.95
    card(s,M,y,CW,0.82)
    s.addText(t,{x:M+0.4,y:y,w:2.4,h:0.82,fontSize:17,bold:true,color:c,valign:'middle',fontFace:FONT,isTextBox:true,margin:0})
    s.addText(d,{x:M+2.9,y:y,w:6.2,h:0.82,fontSize:13.5,color:BODY,valign:'middle',fontFace:FONT,isTextBox:true,margin:0})
    s.addText(o,{x:M+9.2,y:y,w:2.4,h:0.82,fontSize:12,color:SUB,align:'right',valign:'middle',fontFace:FONT,isTextBox:true,margin:0})
  })
  card(s,M,6.5,CW,0.62,CARD)
  s.addText('수집 공고는 「공식 공고」, 합성 데이터는 「예시 공고」로 구분 표기',{x:M+0.5,y:6.5,w:CW-1,h:0.62,fontSize:13.5,bold:true,color:INK,valign:'middle',fontFace:FONT,isTextBox:true,margin:0})
  foot(s)
}

/* 008 운영 자동화 — Claude Routines */
{
  const s=slide()
  head(s,'07','CRM 운영 자동화 — Claude Routines 12종','일 단위 운영 업무를 정시 자동 수행 구조로 전환')
  const r=[['07:00','자동화 상태 점검'],['07:30','CRM 데이터 품질 점검'],['08:00','마감 임박 고객 알림 · 메일'],
           ['08:30','일일 CRM 운영 브리핑'],['09:05','신규 추천 공고 알림 · 메일'],['09:30','오늘 연락할 고객'],
           ['10:00','고의도 고객 감지'],['10:30','신청 진행 고객 점검'],['18:00','고객 전환 퍼널 점검'],
           ['매시','공고 변경 감시 · 발송 실패 재처리'],['월요일','주간 CRM KPI 리포트']]
  r.forEach(([t,n],i)=>{
    const col=i<6?0:1, row=i<6?i:i-6
    const x=M+col*6.1, y=2.6+row*0.66
    s.addText(t,{x:x,y:y,w:1.1,h:0.5,fontSize:13,bold:true,color:VERM,valign:'middle',fontFace:FONT,isTextBox:true,margin:0})
    s.addText(n,{x:x+1.15,y:y,w:4.4,h:0.5,fontSize:14,color:INK,valign:'middle',fontFace:FONT,isTextBox:true,margin:0})
    s.addShape(p.ShapeType.line,{x:x,y:y+0.55,w:5.5,h:0,line:{color:RULE,width:0.75}})
  })
  card(s,M+6.1,5.9,5.6,1.15,INK)
  s.addText('Supabase 실데이터 조회 · Gmail 발송\n실행 이력 자동 적재',{x:M+6.45,y:5.9,w:5.0,h:1.15,fontSize:14,bold:true,color:'FFFFFF',valign:'middle',fontFace:FONT,isTextBox:true,margin:0,lineSpacingMultiple:1.25})
  foot(s)
}

/* 009 수익 모델 */
{
  const s=slide()
  head(s,'08','3단계 수익화 모델','3단계가 실질 매출 축에 해당합니다')
  const st=[['STEP 1','무료 확장','전 기능 무료 제공\n조건 · 관심공고 데이터 확보','월간 활성 사용자',2.75,CARD,INK,BODY],
            ['STEP 2','구독 전환','마감 알림 · 정밀 후보 리포트\n자격 자가진단 유료화','유료 전환율',3.25,CARD,INK,BODY],
            ['STEP 3','B2B 데이터','시행사 · 분양대행사 대상\n수요 · 조건 분포 분석 제공','계약 단지 수',3.75,INK,'FFFFFF','D8D2C6']]
  st.forEach(([tag,h,b,kpi,ht,bg,fg,bc],i)=>{
    const x=M+i*4.0, y=6.3-ht
    card(s,x,y,3.7,ht,bg)
    s.addText(tag,{x:x+0.35,y:y+0.28,w:3,h:0.3,fontSize:11.5,bold:true,color:VERM,charSpacing:1.5,fontFace:FONT,isTextBox:true,margin:0})
    s.addText(h,{x:x+0.35,y:y+0.66,w:3,h:0.5,fontSize:21,bold:true,color:fg,fontFace:FONT,isTextBox:true,margin:0})
    s.addText(b,{x:x+0.35,y:y+1.3,w:3,h:0.9,fontSize:13,color:bc,fontFace:FONT,isTextBox:true,margin:0,lineSpacingMultiple:1.35})
    s.addText('핵심 지표 — '+kpi,{x:x+0.35,y:y+2.25,w:3,h:0.35,fontSize:12,bold:true,color:i===2?'FFFFFF':INK,fontFace:FONT,isTextBox:true,margin:0})
  })
  s.addText('축적된 조건 · 관심공고 데이터는 경쟁사 복제가 불가능한 자산',{x:M,y:6.55,w:CW,h:0.4,fontSize:15,bold:true,color:INK,fontFace:FONT,isTextBox:true,margin:0})
  foot(s)
}

/* 010 클로징 */
{
  const s=slide(true)
  s.addShape(p.ShapeType.line,{x:4.6,y:2.4,w:4.1,h:0,line:{color:VERM,width:3}})
  s.addText('공고는 이미 공개되어 있습니다',{x:1.3,y:2.7,w:10.7,h:0.55,fontSize:19,color:'9A9182',align:'center',fontFace:FONT,isTextBox:true,margin:0})
  s.addText('부재한 것은 정보가 아니라\n선별의 기준입니다',{x:1.3,y:3.35,w:10.7,h:2.0,fontSize:42,bold:true,color:'FFFFFF',align:'center',fontFace:FONT,isTextBox:true,margin:0,lineSpacingMultiple:1.3})
  s.addText('집캐치는 그 기준을 제공합니다',{x:1.3,y:5.5,w:10.7,h:0.5,fontSize:20,bold:true,color:VERM,align:'center',fontFace:FONT,isTextBox:true,margin:0})
  s.addText('집캐치  ·  ZipCatch',{x:1.3,y:6.4,w:10.7,h:0.4,fontSize:13,color:'7A7263',align:'center',charSpacing:2,fontFace:FONT,isTextBox:true,margin:0})
  s.addNotes('마지막 문장은 슬라이드를 보지 않고 외워서 말한다.')
}

p.writeFile({fileName: process.argv[2]}).then(f=>console.log('OK',f))
