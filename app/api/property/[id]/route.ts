import { NextRequest } from 'next/server'
import type { Announcement, CompetitionItem, SpecialSupplyItem } from '@/lib/types'
import { dataPortalKey } from '@/lib/config/data-portal-key'

const BASE = 'https://api.odcloud.kr/api'
const KEY = dataPortalKey()

async function fetchAnnouncement(id: string): Promise<Announcement | null> {
  const params = new URLSearchParams({
    serviceKey: KEY,
    page: '1',
    perPage: '5',
    returnType: 'JSON',
  })
  params.set('cond[PBLANC_NO::EQ]', id)

  const url = `${BASE}/ApplyhomeInfoDetailSvc/v1/getAPTLttotPblancDetail?${params}`
  const res = await fetch(url, { next: { revalidate: 300 } })
  const json = await res.json()
  const hit = (json.data as Announcement[] | undefined)?.find(
    a => a.PBLANC_NO === id || a.HOUSE_MANAGE_NO === id,
  )
  if (hit) return hit

  const fallback = new URLSearchParams({
    serviceKey: KEY,
    page: '1',
    perPage: '5',
    returnType: 'JSON',
  })
  fallback.set('cond[HOUSE_MANAGE_NO::EQ]', id)
  const res2 = await fetch(
    `${BASE}/ApplyhomeInfoDetailSvc/v1/getAPTLttotPblancDetail?${fallback}`,
    { next: { revalidate: 300 } },
  )
  const json2 = await res2.json()
  return (json2.data as Announcement[] | undefined)?.[0] ?? null
}

async function fetchCompetition(pblancNo: string) {
  const params = new URLSearchParams({ serviceKey: KEY, page: '1', perPage: '100', returnType: 'JSON' })
  params.set('cond[PBLANC_NO::EQ]', pblancNo)
  const url = `${BASE}/ApplyhomeInfoCmpetRtSvc/v1/getAPTLttotPblancCmpet?${params}`
  const res = await fetch(url, { next: { revalidate: 300 } })
  const json = await res.json()
  return (json.data as CompetitionItem[]) ?? []
}

async function fetchSpecial(pblancNo: string) {
  const params = new URLSearchParams({ serviceKey: KEY, page: '1', perPage: '100', returnType: 'JSON' })
  params.set('cond[PBLANC_NO::EQ]', pblancNo)
  const url = `${BASE}/ApplyhomeInfoCmpetRtSvc/v1/getAPTSpsplyReqstStus?${params}`
  const res = await fetch(url, { next: { revalidate: 300 } })
  const json = await res.json()
  return (json.data as SpecialSupplyItem[]) ?? []
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  if (!id) return Response.json({ error: 'ID required' }, { status: 400 })

  try {
    const announcement = await fetchAnnouncement(decodeURIComponent(id))
    if (!announcement) {
      return Response.json({ error: '단지 정보를 찾을 수 없습니다.' }, { status: 404 })
    }

    const pblancNo = announcement.PBLANC_NO
    const [competition, specialSupply] = await Promise.all([
      fetchCompetition(pblancNo).catch(() => [] as CompetitionItem[]),
      fetchSpecial(pblancNo).catch(() => [] as SpecialSupplyItem[]),
    ])

    return Response.json({ announcement, competition, specialSupply })
  } catch {
    return Response.json({ error: '데이터 로드 실패' }, { status: 500 })
  }
}
