import type { MetadataRoute } from 'next'

/**
 * 검색엔진에 어느 화면이 있는지 알린다.
 *
 * 공고 상세는 넣지 않는다. 접수가 끝나면 사라지는 자리라, 색인해 두면
 * 검색 결과에서 이미 마감된 공고로 들어오게 된다. 목록은 늘 최신이므로
 * 목록만 알린다.
 */
const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://zipcatch.vercel.app').replace(/\/$/, '')

const PAGES: { path: string; priority: number; freq: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
  { path: '', priority: 1, freq: 'daily' },
  { path: '/notices', priority: 0.9, freq: 'daily' },
  { path: '/analyze', priority: 0.8, freq: 'monthly' },
  { path: '/guide', priority: 0.7, freq: 'monthly' },
  { path: '/pro', priority: 0.7, freq: 'monthly' },
  { path: '/score', priority: 0.7, freq: 'weekly' },
  { path: '/stats', priority: 0.6, freq: 'weekly' },
  { path: '/news', priority: 0.6, freq: 'daily' },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return PAGES.map(p => ({
    url: `${SITE}${p.path}`,
    lastModified: now,
    changeFrequency: p.freq,
    priority: p.priority,
  }))
}
