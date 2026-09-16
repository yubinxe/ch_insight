import { NextRequest } from 'next/server'
import { dataPortalKey } from '@/lib/config/data-portal-key'

const BASE = 'https://api.odcloud.kr/api'
const KEY = dataPortalKey()

async function fetchRegion(endpoint: string, month: string) {
  const params = new URLSearchParams({
    serviceKey: KEY,
    page: '1',
    perPage: '500',
    returnType: 'JSON',
  })
  if (month) {
    params.set('cond[STAT_DE::GTE]', month)
    params.set('cond[STAT_DE::LTE]', month)
  }

  const res = await fetch(`${BASE}/ApplyhomeStatSvc/v1/${endpoint}?${params}`, {
    next: { revalidate: 600 },
  })
  return res.json()
}

export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get('month') ?? ''

  const [applicants, winners] = await Promise.all([
    fetchRegion('getAPTReqstAreaStat', month),
    fetchRegion('getAPTPrzwnerAreaStat', month),
  ])

  return Response.json({ applicants: applicants.data ?? [], winners: winners.data ?? [] })
}
