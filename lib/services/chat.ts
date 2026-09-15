/**
 * 상담 챗봇 — 시나리오 기반.
 *
 * 정의: docs/scenarios/consultation.md
 * 답변 문구를 바꿀 때 두 곳을 함께 고친다.
 *
 * 자격을 확정하지 않고, 당첨 확률을 말하지 않으며,
 * 없는 날짜·금액·경쟁률을 만들지 않는다.
 */

export type ScenarioId = 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6' | 'S0'

export interface ChatContext {
  hasPreference: boolean
  candidateCount: number | null
  emailConfigured: boolean
  /** 지금 저장소에 있는 실제 공고 수. 0 이면 예시만 있다 */
  officialCount: number
  regions: string[]
}

export interface ChatReply {
  scenario: ScenarioId
  text: string
  /** 다음 행동 제안 */
  actions: { label: string; href: string }[]
}

/** 메시지에서 뽑아낸 개인정보. 사용자가 먼저 준 것만 담는다. */
export interface ExtractedInfo {
  email?: string
  phone?: string
  name?: string
  regions?: string[]
  maxDeposit?: number
  maxMonthlyRent?: number
  minArea?: number
}

const SEOUL_GU = [
  '강남구','강동구','강북구','강서구','관악구','광진구','구로구','금천구','노원구','도봉구',
  '동대문구','동작구','마포구','서대문구','서초구','성동구','성북구','송파구','양천구','영등포구',
  '용산구','은평구','종로구','중구','중랑구',
]

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.]+/
const PHONE_RE = /01[016789][-\s.]?\d{3,4}[-\s.]?\d{4}/
// 뒤에 붙는 조사까지 이름으로 먹지 않게 lookahead 로 끊는다.
// ("저는 김유빈입니다" 에서 '김유빈입' 을 잡던 문제)
const NAME_RE =
  /(?:저는|제?\s*이름은?)\s*([가-힣]{2,4})(?=입니다|이에요|예요|이라고|이고|고요|요|[^가-힣]|$)/

/** "6500만원", "1억 2000", "보증금 7천" 같은 표기를 만원 정수로 */
function parseMan(raw: string): number | null {
  const s = raw.replace(/\s/g, '')
  let total = 0
  let matched = false

  const eok = s.match(/(\d+(?:\.\d+)?)억/)
  if (eok) {
    total += parseFloat(eok[1]) * 10000
    matched = true
  }
  const cheon = s.match(/(\d+(?:\.\d+)?)천(?!만)/)
  if (cheon) {
    total += parseFloat(cheon[1]) * 1000
    matched = true
  }
  const man = s.replace(/\d+(?:\.\d+)?억/, '').replace(/\d+(?:\.\d+)?천(?!만)/, '').match(/([\d,]+)만/)
  if (man) {
    total += parseFloat(man[1].replace(/,/g, ''))
    matched = true
  }
  return matched && Number.isFinite(total) ? Math.round(total) : null
}

export function extractInfo(message: string): ExtractedInfo {
  const out: ExtractedInfo = {}

  const email = message.match(EMAIL_RE)
  if (email) out.email = email[0]

  const phone = message.match(PHONE_RE)
  if (phone) out.phone = phone[0].replace(/[\s.]/g, '-')

  const name = message.match(NAME_RE)
  if (name) out.name = name[1]

  const regions = SEOUL_GU.filter(g => message.includes(g))
  if (regions.length) out.regions = regions.slice(0, 3)

  // "보증금 6500만" / "월세 40만" / "30㎡" 를 각각 잡는다
  const depositCtx = message.match(/보증금[^\d억천만]{0,6}([\d,]+\s*(?:억|천|만)[^\s]*)/)
  if (depositCtx) {
    const v = parseMan(depositCtx[1])
    if (v !== null) out.maxDeposit = v
  }
  const rentCtx = message.match(/(?:월세|월\s*임대료)[^\d억천만]{0,6}([\d,]+\s*(?:억|천|만)[^\s]*)/)
  if (rentCtx) {
    const v = parseMan(rentCtx[1])
    if (v !== null) out.maxMonthlyRent = v
  }
  const areaCtx = message.match(/(\d{2,3})\s*(?:㎡|제곱미터|m2)/i)
  if (areaCtx) out.minArea = Number(areaCtx[1])

  return out
}

export function hasAnyInfo(info: ExtractedInfo): boolean {
  return Object.keys(info).length > 0
}

/** 저장한 항목을 사용자에게 그대로 알린다 */
export function describeSaved(info: ExtractedInfo): string {
  const bits: string[] = []
  if (info.name) bits.push('이름')
  if (info.email) bits.push('이메일')
  if (info.phone) bits.push('연락처')
  if (info.regions?.length) bits.push(`희망지역(${info.regions.join('·')})`)
  if (info.maxDeposit !== undefined) bits.push(`보증금 상한 ${info.maxDeposit.toLocaleString()}만원`)
  if (info.maxMonthlyRent !== undefined) bits.push(`월 임대료 상한 ${info.maxMonthlyRent.toLocaleString()}만원`)
  if (info.minArea !== undefined) bits.push(`최소 면적 ${info.minArea}㎡`)
  if (!bits.length) return ''
  return `말씀해 주신 ${bits.join(', ')}을(를) 저장했어요. 다음에 오시면 이 조건으로 바로 보여드릴게요.`
}

function detect(message: string): ScenarioId {
  const m = message.replace(/\s/g, '')
  if (/상담|문의|연락처|전화주|담당자/.test(m)) return 'S6'
  if (/진짜|실제공고|믿을|출처|예시데이터|가짜/.test(m)) return 'S5'
  if (/마감|일정|언제|접수기간|접수일/.test(m)) return 'S4'
  if (/알림|알려줘|메일|이메일|연락받/.test(m)) return 'S3'
  if (/자격|조건이되|가능한가|될까요|해당되|자격요건|소득|자산/.test(m)) return 'S1'
  if (/추천|찾아|알아보|어디가|공고있|매물|집좀|구하고|봐주/.test(m)) return 'S2'
  return 'S0'
}

const FIND: { label: string; href: string } = { label: '내 조건으로 집 찾기', href: '/analyze' }
const RESULTS: { label: string; href: string } = { label: '내 후보 보기', href: '/results' }
const SAVED: { label: string; href: string } = { label: '관심공고', href: '/saved' }
const NOTICES: { label: string; href: string } = { label: '공고 둘러보기', href: '/notices' }

export function reply(message: string, ctx: ChatContext): ChatReply {
  const scenario = detect(message)

  switch (scenario) {
    case 'S1':
      return {
        scenario,
        text:
          '지금은 지역·보증금·월 임대료·면적처럼 희망 조건이 맞는지까지 확인해 드려요.\n' +
          '소득·자산·거주기간 같은 공식 자격요건은 공고마다 기준이 달라서, 지원 전 공식 모집공고문을 꼭 확인하셔야 합니다.\n' +
          '조건부터 넣어보시겠어요?',
        actions: [ctx.hasPreference ? RESULTS : FIND],
      }

    case 'S2':
      return {
        scenario,
        text: ctx.hasPreference
          ? `저장하신 조건(${ctx.regions.join('·') || '설정한 지역'})으로 확인해 보니 ` +
            (ctx.candidateCount === null
              ? '후보를 다시 계산해 드릴게요.'
              : `지금 지원 가능한 후보가 ${ctx.candidateCount}건 있어요.`)
          : '살고 싶은 지역과 감당 가능한 보증금·월 임대료만 알려주시면 지금 지원 가능한 후보부터 정리해 드릴게요.',
        actions: ctx.hasPreference ? [RESULTS, FIND] : [FIND, NOTICES],
      }

    case 'S3':
      return {
        scenario,
        text:
          '조건에 맞는 새 공고가 뜨거나 관심공고 마감이 다가오면 가입하신 이메일로 보내드려요.\n' +
          '앱 설치나 별도 아이디 등록은 없습니다. 수신 동의만 해주시면 되고, 언제든 관심공고 화면에서 끄실 수 있어요.' +
          (ctx.emailConfigured
            ? ''
            : '\n\n다만 지금은 메일 발송 연동 전이라 설정만 저장되고 실제 발송은 아직 되지 않습니다.'),
        actions: [SAVED, ctx.hasPreference ? RESULTS : FIND],
      }

    case 'S4':
      return {
        scenario,
        text:
          '공고에 적힌 접수 마감·발표일과, 저희가 제안하는 준비 권장일을 구분해서 보여드려요.\n' +
          '공고에 없는 날짜는 만들지 않고 “미정”으로 둡니다.',
        actions: [ctx.hasPreference ? RESULTS : NOTICES],
      }

    case 'S5':
      return {
        scenario,
        text:
          ctx.officialCount > 0
            ? `공고 목록에는 청약홈에서 가져온 실제 모집공고 ${ctx.officialCount}건과 예시 공고가 함께 있어요.\n` +
              '카드에 공식 공고 / 예시 공고로 구분해 두었고, 공식 공고는 원문 링크를 함께 드립니다.\n' +
              '공고에 없는 금액·면적은 채우지 않고 “모집공고문 확인”으로 둡니다.'
            : '지금 보이는 공고는 서비스 구성을 보여드리기 위한 예시 데이터입니다.\n' +
              '공식 공고 연동 전까지 실제 공고인 것처럼 표시하지 않습니다.\n' +
              '원문 링크가 있는 공고는 링크를 함께 드립니다.',
        actions: [NOTICES],
      }

    case 'S6':
      return {
        scenario,
        text:
          '연락처를 남겨주시면 담당자가 확인하고 연락드릴게요.\n' +
          '남겨주신 연락처는 상담 목적으로만 사용합니다.',
        actions: [ctx.hasPreference ? RESULTS : FIND],
      }

    default:
      return {
        scenario: 'S0',
        text:
          '제가 도와드릴 수 있는 건 조건에 맞는 공고 찾기, 관심공고 알림, 접수 일정 확인이에요.\n' +
          '어떤 게 궁금하세요?',
        actions: [FIND, NOTICES],
      }
  }
}
