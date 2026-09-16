import { NextRequest } from 'next/server'
import { dataPortalKey } from '@/lib/config/data-portal-key'

const BASE = 'https://api.odcloud.kr/api'
const KEY = dataPortalKey()

async function fetchAge(endpoint: string, monthFrom: string, monthTo: string) {
  const params = new URLSearchParams({
    serviceKey: KEY,
    page: '1',
    perPage: '100',
    returnType: 'JSON',
  })
  if (monthFrom) params.set('cond[STAT_DE::GTE]', monthFrom)
  if (monthTo) params.set('cond[STAT_DE::LTE]', monthTo)

  const res = await fetch(`${BASE}/ApplyhomeStatSvc/v1/${endpoint}?${params}`, {
    next: { revalidate: 600 },
  })
  return res.json()
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const monthFrom = sp.get('monthFrom') ?? ''
  const monthTo = sp.get('monthTo') ?? ''

  const [applicants, winners] = await Promise.all([
    fetchAge('getAPTReqstAgeStat', monthFrom, monthTo),
    fetchAge('getAPTPrzwnerAgeStat', monthFrom, monthTo),
  ])

  return Response.json({ applicants: applicants.data ?? [], winners: winners.data ?? [] })
}
