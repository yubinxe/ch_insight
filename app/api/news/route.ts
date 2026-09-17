import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * 청약·주거 뉴스 모음.
 *
 * 기사를 옮겨 적지 않는다. 제목과 매체, 시각, 원문 링크만 정리해 넘긴다 —
 * 본문은 매체의 것이고, 우리가 요약해 얹으면 그 요약이 기사인 것처럼 읽힌다.
 * 카드마다 매체명을 붙이고 클릭은 원문으로 내보낸다.
 *
 * 출처는 Google 뉴스 RSS 다. 매체를 직접 고르면 그 매체의 논조만 실리므로
 * 주제어로 모으고, 어느 매체에서 왔는지는 각 항목에 그대로 남긴다.
 */

export interface NewsTopic {
  key: string
  label: string
  /** 화면에 그대로 적는다 — 무엇으로 모았는지 숨기지 않는다 */
  query: string
  hint: string
}

export const TOPICS: NewsTopic[] = [
  {
    key: 'subscription',
    label: '청약',
    // 한국어에서 '청약'은 주택과 증권 양쪽에 쓰인다. 주제어만 넣으면
    // 유상증자·공모주 기사가 절반을 차지한다. 주택 쪽으로 좁히고
    // 금융 용어는 빼낸다 (실측: 금융 혼입 0/10).
    query: '청약 아파트 분양 -유상증자 -공모주 -상장',
    hint: '모집공고·분양 일정·경쟁률 소식',
  },
  {
    key: 'policy',
    label: '주거정책',
    query: '주거정책 OR 부동산대책 OR 국토교통부 주택',
    hint: '제도 변경과 정부 발표',
  },
  {
    key: 'supply',
    label: '공급대책',
    query: '주택공급 대책 OR 공공주택 공급',
    hint: '공급 물량과 신규 택지',
  },
  {
    key: 'rent',
    label: '공공임대',
    query: 'LH 임대주택 OR 행복주택 OR 매입임대',
    hint: '임대 공고와 입주 소식',
  },
  {
    key: 'market',
    label: '부동산 시장',
    query: '부동산 시장 전세 매매 가격',
    hint: '시세·거래·금리 흐름',
  },
]

interface NewsItem {
  title: string
  link: string
  source: string
  publishedAt: string | null
}

function decode(s: string) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .trim()
}

function pick(block: string, tag: string) {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))
  return m ? decode(m[1]) : ''
}

/**
 * RSS 한 건을 항목으로 옮긴다.
 *
 * 구글 뉴스는 제목 끝에 " - 매체명" 을 붙여 준다. 매체를 따로 표기하면서
 * 제목에도 남겨두면 같은 말이 두 번 보이므로, 꼬리가 매체명과 같을 때만 뗀다.
 */
function toItem(block: string): NewsItem | null {
  const rawTitle = pick(block, 'title')
  const link = pick(block, 'link')
  if (!rawTitle || !link) return null

  const source = pick(block, 'source') || '출처 미상'
  const tail = ` - ${source}`
  const title = rawTitle.endsWith(tail) ? rawTitle.slice(0, -tail.length).trim() : rawTitle

  const pub = pick(block, 'pubDate')
  const at = pub ? new Date(pub) : null

  return {
    title,
    link,
    source,
    publishedAt: at && !Number.isNaN(at.getTime()) ? at.toISOString() : null,
  }
}

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('topic') ?? TOPICS[0].key
  const topic = TOPICS.find(t => t.key === key) ?? TOPICS[0]

  const url =
    'https://news.google.com/rss/search?q=' +
    encodeURIComponent(topic.query) +
    '&hl=ko&gl=KR&ceid=KR:ko'

  try {
    // 뉴스는 분 단위로 바뀌지 않는다. 10분간 재사용해 매체에 부담을 주지 않는다.
    const res = await fetch(url, {
      next: { revalidate: 600 },
      headers: { 'User-Agent': 'zipcatch-news/1.0 (+https://zipcatch.vercel.app)' },
    })
    if (!res.ok) {
      return Response.json(
        { topic: topic.key, items: [], error: `뉴스를 불러오지 못했습니다 (${res.status}).` },
        { status: 200 },
      )
    }

    const xml = await res.text()
    const blocks = xml.match(/<item>[\s\S]*?<\/item>/g) ?? []

    const seen = new Set<string>()
    const items = blocks
      .map(toItem)
      .filter((x): x is NewsItem => Boolean(x))
      // 같은 사건을 여러 매체가 같은 제목으로 쓴다. 한 번만 싣는다.
      .filter(x => {
        const k = x.title.replace(/\s+/g, '')
        if (seen.has(k)) return false
        seen.add(k)
        return true
      })
      .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
      .slice(0, 30)

    return Response.json({
      topic: topic.key,
      label: topic.label,
      query: topic.query,
      items,
      fetchedAt: new Date().toISOString(),
      error: null,
    })
  } catch (err) {
    // 뉴스가 없다고 화면이 죽지 않는다. 비어 있다는 사실만 넘긴다.
    return Response.json(
      {
        topic: topic.key,
        items: [],
        error: err instanceof Error ? err.message : '뉴스를 불러오지 못했습니다.',
      },
      { status: 200 },
    )
  }
}
