import { NextRequest } from 'next/server'
import { dataPortalKey } from '@/lib/config/data-portal-key'

const BASE = 'https://api.odcloud.kr/api'
const KEY = dataPortalKey()

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const month = sp.get('month') ?? ''
  const region = sp.get('region') ?? ''

  const params = new URLSearchParams({
    serviceKey: KEY,
    page: '1',
    perPage: '50',
    returnType: 'JSON',
  })
  if (month) {
    params.set('cond[STAT_DE::GTE]', month)
    params.set('cond[STAT_DE::LTE]', month)
  }
  if (region) params.set('cond[SUBSCRPT_AREA_CODE::EQ]', region)

  const url = `${BASE}/ApplyhomeStatSvc/v1/getAPTApsPrzwnerStat?${params}`
  const res = await fetch(url, { next: { revalidate: 600 } })
  const data = await res.json()
  return Response.json(data)
}
