import { NextRequest } from 'next/server'
import { REGION_BBOX_BY_CODE } from '@/lib/korea-map-data'
import { layoutHotspotInRegion } from '@/lib/hotmap-layout'
import { KOREA_REGIONS, REGION_BY_CODE, heatLevel } from '@/lib/korea-regions'
import type { HotmapPayload, HotmapRegion, HotmapSpot } from '@/lib/hotmap-types'
import type { Announcement, CompetitionStatItem } from '@/lib/types'
import { getSubscriptionStatus } from '@/lib/announcement-helpers'
import { dataPortalKey } from '@/lib/config/data-portal-key'

const BASE = 'https://api.odcloud.kr/api'
const KEY = dataPortalKey()

function parseRate(v: string) {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

function avgRate(special: number, general: number) {
  const vals = [special, general].filter(n => n > 0)
  if (vals.length === 0) return 0
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get('month') ?? ''

  try {
    const compParams = new URLSearchParams({
      serviceKey: KEY,
      page: '1',
      perPage: '500',
      returnType: 'JSON',
    })
    if (month) {
      compParams.set('cond[STAT_DE::GTE]', month)
      compParams.set('cond[STAT_DE::LTE]', month)
    }

    const annParams = new URLSearchParams({
      serviceKey: KEY,
      page: '1',
      perPage: '120',
      returnType: 'JSON',
    })

    const today = new Date()
    const from = new Date(today)
    from.setMonth(from.getMonth() - 4)
    const dateFrom = from.toISOString().slice(0, 10)
    const dateTo = new Date(today.getTime() + 60 * 86400000).toISOString().slice(0, 10)
    annParams.set('cond[RCRIT_PBLANC_DE::GTE]', dateFrom)
    annParams.set('cond[RCRIT_PBLANC_DE::LTE]', dateTo)

    const [compRes, annRes] = await Promise.all([
      fetch(`${BASE}/ApplyhomeStatSvc/v1/getAPTCmpetrtAreaStat?${compParams}`, { next: { revalidate: 600 } }),
      fetch(`${BASE}/ApplyhomeInfoDetailSvc/v1/getAPTLttotPblancDetail?${annParams}`, { next: { revalidate: 300 } }),
    ])

    const compJson = await compRes.json()
    const annJson = await annRes.json()
    const compData = (compJson.data as CompetitionStatItem[]) ?? []
    const announcements = (annJson.data as Announcement[]) ?? []

    const months = [...new Set(compData.map(d => d.STAT_DE))].sort().reverse()
    const statMonth = month || months[0] || ''
    const compFiltered = statMonth ? compData.filter(d => d.STAT_DE === statMonth) : compData

    const compByRegion = new Map<string, CompetitionStatItem>()
    compFiltered.forEach(row => {
      const code = row.SUBSCRPT_AREA_CODE
      if (!compByRegion.has(code)) compByRegion.set(code, row)
    })

    const regions: HotmapRegion[] = KOREA_REGIONS.map(geo => {
      const row = compByRegion.get(geo.code)
      const specialComp = row ? parseRate(row.SPSPLY_CMPET_RATE) : 0
      const avgComp = row ? avgRate(specialComp, parseRate(row.SUPLY_CMPET_RATE)) : 0
      const annInRegion = announcements.filter(a => a.SUBSCRPT_AREA_CODE === geo.code)
      return {
        code: geo.code,
        name: geo.name,
        x: geo.x,
        y: geo.y,
        avgComp: Math.round(avgComp * 10) / 10,
        specialComp: Math.round(specialComp * 10) / 10,
        supplyUnits: annInRegion.reduce((s, a) => s + (Number(a.TOT_SUPLY_HSHLDCO) || 0), 0),
        projectCount: annInRegion.length,
        heat: heatLevel(avgComp),
      }
    })

    const regionCompMap = Object.fromEntries(regions.map(r => [r.code, r.avgComp]))

    const byRegion = new Map<string, Announcement[]>()
    announcements.forEach(a => {
      const code = a.SUBSCRPT_AREA_CODE || ''
      if (!byRegion.has(code)) byRegion.set(code, [])
      byRegion.get(code)!.push(a)
    })

    const hotspots: HotmapSpot[] = []
    byRegion.forEach((items, code) => {
      const geo = REGION_BY_CODE[code]
      if (!geo) return
      const baseComp = regionCompMap[code] ?? 0
      const special = compByRegion.get(code)
      const specialComp = special ? parseRate(special.SPSPLY_CMPET_RATE) : 0

      const count = Math.min(items.length, 12)
      const bbox = REGION_BBOX_BY_CODE[code] ?? {
        x: geo.x - 20,
        y: geo.y - 20,
        width: 40,
        height: 40,
      }
      items.slice(0, 12).forEach((a, i) => {
        const pos = layoutHotspotInRegion(bbox, i, count)
        const status = getSubscriptionStatus(a)
        hotspots.push({
          id: a.PBLANC_NO || a.HOUSE_MANAGE_NO,
          pblancNo: a.PBLANC_NO,
          name: a.HOUSE_NM,
          regionCode: code,
          regionName: a.SUBSCRPT_AREA_CODE_NM || geo.name,
          address: a.HSSPLY_ADRES || '',
          builder: a.BSNS_MBY_NM || '—',
          units: Number(a.TOT_SUPLY_HSHLDCO) || 0,
          compRate: baseComp,
          specialComp,
          status,
          nspc: a.NSPRC_NM || '-',
          x: pos.x,
          y: pos.y,
          openDate: a.RCEPT_BGNDE || '',
          closeDate: a.RCEPT_ENDDE || '',
        })
      })
    })

    hotspots.sort((a, b) => b.compRate - a.compRate)

    const allRates = regions.map(r => r.avgComp).filter(r => r > 0)
    const nationalAvg = allRates.length
      ? Math.round((allRates.reduce((s, v) => s + v, 0) / allRates.length) * 10) / 10
      : 0

    const payload: HotmapPayload = {
      statMonth,
      regions,
      hotspots,
      nationalAvg,
    }

    return Response.json(payload)
  } catch {
    return Response.json({
      statMonth: '',
      regions: KOREA_REGIONS.map(geo => ({
        code: geo.code,
        name: geo.name,
        x: geo.x,
        y: geo.y,
        avgComp: 0,
        specialComp: 0,
        supplyUnits: 0,
        projectCount: 0,
        heat: 0 as const,
      })),
      hotspots: [],
      nationalAvg: 0,
    } satisfies HotmapPayload)
  }
}
