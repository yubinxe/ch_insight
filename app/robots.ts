import type { MetadataRoute } from 'next'

/**
 * 크롤러 정책.
 *
 * 서비스 화면은 검색에 걸려야 한다 — 사람이 찾아오는 길이다. 막을 것은 두 가지다.
 *
 * 1) `/api/` — 공고·경쟁률·가점 집계를 JSON 으로 통째로 내주는 자리다.
 *    검색 결과에 실릴 이유가 없고, 실리면 수집의 출발점이 된다.
 * 2) 학습·수집 전용 봇 — 화면을 사람에게 보여주려고 오는 것이 아니라
 *    내용을 통째로 가져가려고 온다.
 *
 * robots.txt 는 지키는 쪽에만 효력이 있다. 규칙을 무시하는 수집기는 이걸로
 * 막지 못한다 — 그쪽은 `proxy.ts` 의 요청 제한이 맡는다. 둘 다 있어야 한다.
 */
const HARVESTERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'anthropic-ai',
  'Claude-Web',
  'CCBot',
  'Google-Extended',
  'PerplexityBot',
  'Applebot-Extended',
  'Bytespider',
  'Amazonbot',
  'meta-externalagent',
  'Diffbot',
  'Scrapy',
]

/**
 * 링크 미리보기를 만드는 봇.
 *
 * 카카오톡·슬랙에 주소를 붙이면 이들이 찾아와 og 태그와 그림을 읽어 간다.
 * 막으면 미리보기가 빈 칸이 된다 — 그림을 만들어 둔 보람이 없어진다.
 *
 * `User-Agent: *` 가 이미 허용이라 없어도 되지만 적어 둔다. 나중에 전체를
 * 조일 때 이들까지 함께 잠기는 일을 막으려는 것이다.
 *
 * `FacebookBot`(수집)과 `facebookexternalhit`(미리보기)은 다른 봇이다.
 * 이름이 비슷해 한꺼번에 막기 쉬우니 갈라 둔다.
 */
const PREVIEW_BOTS = [
  'facebookexternalhit',
  'kakaotalk-scrap',
  'Twitterbot',
  'Slackbot',
  'Slackbot-LinkExpanding',
  'TelegramBot',
  'LinkedInBot',
  'Discordbot',
  'WhatsApp',
  'Yeti',
  'Daumoa',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // 공개 API 와 관리 화면은 색인 대상이 아니다
        disallow: ['/api/', '/admin'],
      },
      {
        userAgent: PREVIEW_BOTS,
        allow: '/',
        disallow: ['/api/', '/admin'],
      },
      {
        userAgent: HARVESTERS,
        disallow: '/',
      },
    ],
  }
}
