import { NextRequest } from 'next/server'
import { aggregateReferenceStats } from '@/lib/subscription-score'
import type { ScoreStatItem } from '@/lib/types'
import { dataPortalKey } from '@/lib/config/data-portal-key'

const BASE = 'https://api.odcloud.kr/api'
const KEY = dataPortalKey()

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
    /**
     * 최근 열두 달을 함께 본다.
     *
     * 한 달치만 쓰면 그 달에 어떤 단지가 열렸는지에 따라 값이 크게 흔들린다.
     * 대형 단지 하나가 평균을 통째로 끌고 가는 달도 있다. 열두 달을 모으면
     * 그런 흔들림이 가라앉는다.
     *
     * 통계는 두어 달 늦게 올라오므로 최근 두 달은 비어 있는 게 정상이다.
     */
    const now = new Date()
    now.setDate(1)
    now.setMonth(now.getMonth() - 2)
    const to = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
    now.setMonth(now.getMonth() - 11)
    const from = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`

    const params = new URLSearchParams({
      serviceKey: KEY,
      page: '1',
      perPage: '1000',
      returnType: 'JSON',
      'cond[STAT_DE::GTE]': from,
      'cond[STAT_DE::LTE]': to,
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

    // 예전에는 가장 최근 한 달만 남겼다. 이제 받아온 기간을 통째로 쓴다.
    const filtered = data

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
