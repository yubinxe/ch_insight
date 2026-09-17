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
  s.addText('청약·공공임대 공고를 찾는 일반 소비자를 위한 서비스',{x:M,y:4.35,w:10,h:0.55,fontSize:22,color:BODY,fontFace:FONT,isTextBox:true,margin:0})
  s.addText('조건을 한 번 입력하면 지금 지원할 수 있는 후보를 정리해 준다',{x:M,y:4.95,w:10,h:0.45,fontSize:16,color:SUB,fontFace:FONT,isTextBox:true,margin:0})
  s.addShape(p.ShapeType.line,{x:M,y:5.75,w:CW,h:0,line:{color:RULE,width:1}})
  s.addText('청약홈 · LH청약플러스 공공데이터   |   IR 핵심 요약',{x:M,y:5.95,w:10,h:0.4,fontSize:13,color:SUB,fontFace:FONT,isTextBox:true,margin:0})
  s.addNotes('첫 문장: "공고는 전부 공개돼 있습니다. 그런데 내가 지금 넣을 수 있는 게 뭔지는 아무도 안 알려줍니다."')
}

/* 002 문제 */
{
  const s=slide()
  head(s,'01','공개돼 있지만, 내 것을 못 고른다','공고는 청약홈·LH에 다 있다. 없는 것은 "나에게 맞는가"에 대한 답이다')
  const items=[['찾는 곳이 다르다','분양은 청약홈, 임대는 LH청약플러스.\n한 사람이 두 곳을 오간다'],
               ['조건이 안 걸린다','지역·예산·면적·가구형태를 넣어\n걸러주는 화면이 없다'],
               ['일정이 흩어진다','접수·서류·발표·계약이\n공고문 안에만 적혀 있다']]
  items.forEach(([h,b],i)=>{
    const x=M+i*3.95
    card(s,x,2.65,3.65,2.35)
    s.addText(String(i+1).padStart(2,'0'),{x:x+0.35,y:2.95,w:1,h:0.35,fontSize:13,bold:true,color:VERM,fontFace:FONT,isTextBox:true,margin:0})
    s.addText(h,{x:x+0.35,y:3.35,w:2.95,h:0.45,fontSize:20,bold:true,color:INK,fontFace:FONT,isTextBox:true,margin:0})
    s.addText(b,{x:x+0.35,y:3.92,w:2.95,h:0.95,fontSize:13.5,color:BODY,fontFace:FONT,isTextBox:true,margin:0,lineSpacingMultiple:1.3})
  })
  card(s,M,5.35,CW,1.05,CARD)
  s.addText('정보가 없는 게 아니라, 판단이 없다',{x:M+0.5,y:5.35,w:CW-1,h:1.05,fontSize:19,bold:true,color:VERM,valign:'middle',fontFace:FONT,isTextBox:true,margin:0})
  foot(s)
}

/* 003 솔루션 */
{
  const s=slide()
  head(s,'02','조건 한 번, 후보 정리','같은 공고 데이터, 다른 결과물')
  card(s,M,2.65,5.6,3.0)
  s.addText('공고 원문',{x:M+0.45,y:2.95,w:3,h:0.35,fontSize:13,bold:true,color:SUB,charSpacing:1,fontFace:FONT,isTextBox:true,margin:0})
  s.addText('모집공고 제12차\n공급유형 국민임대\n전용면적 —\n보증금 —\n접수 2026.09.18~09.20',{x:M+0.45,y:3.45,w:4.8,h:1.7,fontSize:14,color:BODY,fontFace:'Courier New',isTextBox:true,margin:0,lineSpacingMultiple:1.35})
  s.addShape(p.ShapeType.rightArrow,{x:6.62,y:4.0,w:0.45,h:0.4,fill:{color:VERM}})
  card(s,7.3,2.65,5.15,3.0,INK)
  s.addText('내 후보',{x:7.75,y:2.95,w:3,h:0.35,fontSize:13,bold:true,color:VERM,charSpacing:1,fontFace:FONT,isTextBox:true,margin:0})
  s.addText('조건 충족 · 예산 이내',{x:7.75,y:3.45,w:4.3,h:0.5,fontSize:24,bold:true,color:'FFFFFF',fontFace:FONT,isTextBox:true,margin:0})
  s.addText('전용 29㎡ — 희망 최소 28㎡보다 1㎡ 넓음\n보증금 3,200만원 — 상한 8,000만원 이내\n접수 마감 D-3',{x:7.75,y:4.1,w:4.3,h:1.3,fontSize:14,color:'D8D2C6',fontFace:FONT,isTextBox:true,margin:0,lineSpacingMultiple:1.35})
  card(s,M,5.95,CW,0.95)
  s.addText('근거는 점수 구간이 아니라 실제 값 차이로 쓴다 — "1㎡ 넓음", "4,800만원 초과"',{x:M+0.5,y:5.95,w:CW-1,h:0.95,fontSize:16,bold:true,color:INK,valign:'middle',fontFace:FONT,isTextBox:true,margin:0})
  foot(s)
}

/* 004 소비자 흐름 */
{
  const s=slide()
  head(s,'03','소비자는 여섯 걸음만 걷는다','방문 → 조건 입력 → 후보 확인 → 관심·알림 → 가입 → 재방문')
  const steps=[['방문','/','공고 없이도 무엇을 해주는지 보인다'],
               ['조건 입력','/analyze','지역 → 주거비 → 가구·선호 3단계'],
               ['후보 확인','/results','조건 충족 / 예산 초과를 분리해 보여준다'],
               ['관심·알림','/saved','관심공고 저장, 알림 수신 선택'],
               ['가입','/login','이메일로 계정 생성'],
               ['재방문','알림','새 공고·마감 임박이 오면 다시 들어온다']]
  steps.forEach(([t,path,d],i)=>{
    const col=i<3?0:1, row=i<3?i:i-3
    const x=M+col*6.1, y=2.65+row*1.35
    card(s,x,y,5.6,1.15)
    s.addText(String(i+1).padStart(2,'0'),{x:x+0.35,y:y+0.14,w:0.6,h:0.35,fontSize:13,bold:true,color:VERM,fontFace:FONT,isTextBox:true,margin:0})
    s.addText(t,{x:x+1.0,y:y+0.1,w:1.6,h:0.42,fontSize:18,bold:true,color:INK,fontFace:FONT,isTextBox:true,margin:0})
    s.addText(path,{x:x+2.6,y:y+0.15,w:2.6,h:0.35,fontSize:12,color:SUB,fontFace:'Courier New',isTextBox:true,margin:0})
    s.addText(d,{x:x+1.0,y:y+0.58,w:4.3,h:0.42,fontSize:13,color:BODY,fontFace:FONT,isTextBox:true,margin:0})
  })
  s.addText('CRM은 사업자가 내부에서 쓰는 자산이다. 소비자에게 파는 관리도구가 아니다.',{x:M,y:6.5,w:CW,h:0.35,fontSize:13,color:SUB,fontFace:FONT,isTextBox:true,margin:0})
  foot(s)
}

/* 005 판정 원칙 — 진짜 차별점 */
{
  const s=slide()
  head(s,'04','네 가지를 섞지 않는다','하나의 점수로 합치면 "예산 초과인데 점수가 높은" 결과가 나온다')
  const four=[['자격','공식 요건','자격 엔진 전까지 전부 UNKNOWN\n미확인을 불충족으로 단정하지 않는다',WARN],
              ['예산','사용자가 정한 상한','기본 후보의 필수조건\n초과 건은 초과액과 함께 별도 반환',INK],
              ['선호 적합도','지역 50 · 면적 25 · 유형 25','희망과 얼마나 가까운가만 본다',OK],
              ['마감 긴급도','별도 지표','적합도를 올리지 않는다',VERM]]
  four.forEach(([t,sub2,d,c],i)=>{
    const y=2.65+i*0.98
    card(s,M,y,CW,0.86)
    s.addShape(p.ShapeType.ellipse,{x:M+0.38,y:y+0.34,w:0.18,h:0.18,fill:{color:c}})
    s.addText(t,{x:M+0.72,y:y,w:1.6,h:0.86,fontSize:19,bold:true,color:INK,valign:'middle',fontFace:FONT,isTextBox:true,margin:0})
    s.addText(sub2,{x:M+2.4,y:y,w:2.7,h:0.86,fontSize:13,color:SUB,valign:'middle',fontFace:FONT,isTextBox:true,margin:0})
    s.addText(d,{x:M+5.2,y:y,w:6.4,h:0.86,fontSize:13.5,color:BODY,valign:'middle',fontFace:FONT,isTextBox:true,margin:0,lineSpacingMultiple:1.2})
  })
  s.addText('화면에서 가장 붉은 것은 항상 마감이다.',{x:M,y:6.55,w:CW,h:0.35,fontSize:13,italic:true,color:VERM,fontFace:FONT,isTextBox:true,margin:0})
  foot(s)
}

/* 006 정직성 */
{
  const s=slide()
  head(s,'05','만들지 않는 것이 경쟁력이다','부동산 서비스가 신뢰를 잃는 지점을 먼저 닫았다')
  const no=[['당첨 확률을 산출하지 않는다','과거 당첨가점과의 비교만 제공한다.\n표본이 0이면 임의 평균을 만들지 않고 자료 부족으로 표시한다'],
            ['없는 값을 채우지 않는다','청약홈 분양정보에는 전용면적·보증금·월세가 없다.\nnull 로 남기고 "미공개"로 쓴다'],
            ['일정을 지어내지 않는다','공고 원문의 기한은 OFFICIAL,\n역산한 준비일은 RECOMMENDED 로 구분해 표시한다'],
            ['실패를 예시로 덮지 않는다','수집이 실패하면 sources[] 에 그대로 보고한다.\n합성 데이터로 가리지 않는다']]
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
  head(s,'06','분양과 임대를 한자리에','한 사람이 두 사이트를 오가지 않게 한다')
  const src=[['청약홈','분양 모집공고','공공데이터포털',INK],
             ['LH 청약플러스','국민임대 · 행복주택 · 매입임대 · 통합공공임대','공공데이터포털',INK],
             ['CSV','직접 올린 공고','운영자 업로드',SUB],
             ['예시','화면 구성용 합성 데이터','dataOrigin: SYNTHETIC',SUB]]
  src.forEach(([t,d,o,c],i)=>{
    const y=2.65+i*0.95
    card(s,M,y,CW,0.82)
    s.addText(t,{x:M+0.4,y:y,w:2.4,h:0.82,fontSize:17,bold:true,color:c,valign:'middle',fontFace:FONT,isTextBox:true,margin:0})
    s.addText(d,{x:M+2.9,y:y,w:6.2,h:0.82,fontSize:13.5,color:BODY,valign:'middle',fontFace:FONT,isTextBox:true,margin:0})
    s.addText(o,{x:M+9.2,y:y,w:2.4,h:0.82,fontSize:12,color:SUB,align:'right',valign:'middle',fontFace:FONT,isTextBox:true,margin:0})
  })
  card(s,M,6.5,CW,0.62,CARD)
  s.addText('수집된 실제 공고는 「공식 공고」, 합성 데이터는 「예시 공고」로 화면에 표시한다',{x:M+0.5,y:6.5,w:CW-1,h:0.62,fontSize:13.5,bold:true,color:INK,valign:'middle',fontFace:FONT,isTextBox:true,margin:0})
  foot(s)
}

/* 008 운영 자동화 — Claude Routines */
{
  const s=slide()
  head(s,'07','운영은 사람이 지키지 않는다','Claude Routines 12개가 CRM 운영 업무를 매일 대신 수행한다')
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
  s.addText('Supabase CRM 실데이터 조회\nGmail 실발송 · 실행 이력 누적',{x:M+6.45,y:5.9,w:5.0,h:1.15,fontSize:14,bold:true,color:'FFFFFF',valign:'middle',fontFace:FONT,isTextBox:true,margin:0,lineSpacingMultiple:1.25})
  foot(s)
}

/* 009 수익 모델 */
{
  const s=slide()
  head(s,'08','무료로 모으고, 판단으로 과금하고, 데이터로 번다','마지막 단계가 실제 매출 축')
  const st=[['STEP 1','무료 확장','전 기능 무료 공개\n조건·관심공고 데이터 확보','월간 활성 사용자',2.75,CARD,INK,BODY],
            ['STEP 2','구독 전환','마감 알림 · 정밀 후보 리포트\n자격 자가진단','유료 전환율',3.25,CARD,INK,BODY],
            ['STEP 3','B2B 데이터','시행사 · 분양대행사 대상\n수요·조건 분포 분석','계약 단지 수',3.75,INK,'FFFFFF','D8D2C6']]
  st.forEach(([tag,h,b,kpi,ht,bg,fg,bc],i)=>{
    const x=M+i*4.0, y=6.3-ht
    card(s,x,y,3.7,ht,bg)
    s.addText(tag,{x:x+0.35,y:y+0.28,w:3,h:0.3,fontSize:11.5,bold:true,color:VERM,charSpacing:1.5,fontFace:FONT,isTextBox:true,margin:0})
    s.addText(h,{x:x+0.35,y:y+0.66,w:3,h:0.5,fontSize:21,bold:true,color:fg,fontFace:FONT,isTextBox:true,margin:0})
    s.addText(b,{x:x+0.35,y:y+1.3,w:3,h:0.9,fontSize:13,color:bc,fontFace:FONT,isTextBox:true,margin:0,lineSpacingMultiple:1.35})
    s.addText('핵심 지표 — '+kpi,{x:x+0.35,y:y+2.25,w:3,h:0.35,fontSize:12,bold:true,color:i===2?'FFFFFF':INK,fontFace:FONT,isTextBox:true,margin:0})
  })
  s.addText('사용자가 남긴 조건·관심공고는 경쟁사가 복제할 수 없는 자산이 된다',{x:M,y:6.55,w:CW,h:0.4,fontSize:15,bold:true,color:INK,fontFace:FONT,isTextBox:true,margin:0})
  foot(s)
}

/* 010 클로징 */
{
  const s=slide(true)
  s.addShape(p.ShapeType.line,{x:4.6,y:2.4,w:4.1,h:0,line:{color:VERM,width:3}})
  s.addText('공고는 이미 공개돼 있습니다',{x:1.3,y:2.7,w:10.7,h:0.55,fontSize:19,color:'9A9182',align:'center',fontFace:FONT,isTextBox:true,margin:0})
  s.addText('없는 것은 정보가 아니라\n내 것을 고르는 기준입니다',{x:1.3,y:3.35,w:10.7,h:2.0,fontSize:42,bold:true,color:'FFFFFF',align:'center',fontFace:FONT,isTextBox:true,margin:0,lineSpacingMultiple:1.3})
  s.addText('집캐치는 그 기준을 만듭니다',{x:1.3,y:5.5,w:10.7,h:0.5,fontSize:20,bold:true,color:VERM,align:'center',fontFace:FONT,isTextBox:true,margin:0})
  s.addText('집캐치  ·  ZipCatch',{x:1.3,y:6.4,w:10.7,h:0.4,fontSize:13,color:'7A7263',align:'center',charSpacing:2,fontFace:FONT,isTextBox:true,margin:0})
  s.addNotes('마지막 문장은 슬라이드를 보지 않고 외워서 말한다.')
}

p.writeFile({fileName: process.argv[2]}).then(f=>console.log('OK',f))
