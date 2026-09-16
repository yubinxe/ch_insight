import { NextRequest } from 'next/server'
import { matchesHouseTypeFilter } from '@/lib/house-types'
import type { Announcement } from '@/lib/types'
import { dataPortalKey } from '@/lib/config/data-portal-key'

const BASE = 'https://api.odcloud.kr/api'
const KEY = dataPortalKey()

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const page = sp.get('page') ?? '1'
  const perPage = sp.get('perPage') ?? '15'
  const region = sp.get('region') ?? ''
  const dateFrom = sp.get('dateFrom') ?? ''
  const dateTo = sp.get('dateTo') ?? ''
  const houseName = sp.get('houseName') ?? ''
  const houseType = sp.get('houseType') ?? ''

  const params = new URLSearchParams({
    serviceKey: KEY,
    page,
    perPage,
    returnType: 'JSON',
  })
  if (region) params.set('cond[SUBSCRPT_AREA_CODE::EQ]', region)
  if (dateFrom) params.set('cond[RCRIT_PBLANC_DE::GTE]', dateFrom)
  if (dateTo) params.set('cond[RCRIT_PBLANC_DE::LTE]', dateTo)
  if (houseName) params.set('cond[HOUSE_NM::LIKE]', houseName)
  if (houseType) params.set('cond[HOUSE_DTL_SECD::EQ]', houseType)

  const url = `${BASE}/ApplyhomeInfoDetailSvc/v1/getAPTLttotPblancDetail?${params}`
  const res = await fetch(url, { next: { revalidate: 300 } })
  const json = await res.json()

  if (houseType && Array.isArray(json.data)) {
    const rows = (json.data as Announcement[]).filter(item =>
      matchesHouseTypeFilter(item, houseType),
    )
    json.data = rows
    json.currentCount = rows.length
  }

  return Response.json(json)
}
