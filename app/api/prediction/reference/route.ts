import { NextRequest } from 'next/server'
import { aggregateReferenceStats } from '@/lib/subscription-score'
import type { ScoreStatItem } from '@/lib/types'

const BASE = 'https://api.odcloud.kr/api'
const KEY = process.env.PUBLIC_DATA_API_KEY!

const REGION_NAMES: Record<string, string> = {
  '100': '서울',
  '200': '강원',
  '300': '대전',
  '312': '충남',
  '338': '세종',
  '360': '충북',
  '400': '인천',
  '410': '경기',
  '500': '광주',
  '513': '전남',
  '560': '전북',
  '600': '부산',
  '621': '경남',
  '680': '울산',
  '690': '제주',
  '700': '대구',
  '712': '경북',
}

export async function GET(req: NextRequest) {
  const region = req.nextUrl.searchParams.get('region') ?? ''

  try {
    const params = new URLSearchParams({
      serviceKey: KEY,
      page: '1',
      perPage: '200',
      returnType: 'JSON',
    })
    if (region) params.set('cond[SUBSCRPT_AREA_CODE::EQ]', region)

    const url = `${BASE}/ApplyhomeStatSvc/v1/getAPTApsPrzwnerStat?${params}`
    const res = await fetch(url, { next: { revalidate: 600 } })
    const json = await res.json()
    const data = (json.data as ScoreStatItem[]) ?? []

    // 집계할 통계가 없으면 임의 기본값을 만들어 채우지 않는다.
    if (data.length === 0) {
      return Response.json({
        stats: null,
        regionName: region ? (REGION_NAMES[region] ?? '해당 지역') : '전국',
        reason: 'NO_DATA' as const,
      })
    }

    const months = [...new Set(data.map(d => d.STAT_DE))].sort().reverse()
    const latest = months[0]
    const filtered = latest ? data.filter(d => d.STAT_DE === latest) : data

    const regionName = region
      ? (REGION_NAMES[region] ?? filtered[0]?.SUBSCRPT_AREA_CODE_NM ?? '해당 지역')
      : '전국'

    const stats = aggregateReferenceStats(filtered, regionName)
    if (!stats) {
      return Response.json({ stats: null, regionName, reason: 'INSUFFICIENT' as const })
    }

    return Response.json({ stats, regionName, reason: null })
  } catch {
    return Response.json({
      stats: null,
      regionName: region ? (REGION_NAMES[region] ?? '해당 지역') : '전국',
      reason: 'FETCH_FAILED' as const,
    })
  }
}
