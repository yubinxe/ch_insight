import { resetState } from '@/lib/crm/store'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    resetState()
    return Response.json({ ok: true })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : '초기화 실패' },
      { status: 500 },
    )
  }
}
