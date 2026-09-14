import { checkMutation } from '@/lib/consumer/security'
import { NextRequest } from 'next/server'
import { resolveSession } from '@/lib/consumer/session'
import { listSaved, saveNotice, track, unsaveNotice } from '@/lib/consumer/store'
import { propertyById } from '@/lib/crm/store'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await resolveSession()
  return Response.json({ savedIds: listSaved(session).map(r => r.propertyId) })
}

export async function POST(req: NextRequest) {
  const denied = checkMutation(req)
  if (denied) return denied
  try {
    const session = await resolveSession()
    const { propertyId } = (await req.json()) ?? {}
    if (typeof propertyId !== 'string' || !propertyById(propertyId)) {
      return Response.json({ error: '공고를 찾을 수 없습니다.' }, { status: 404 })
    }
    saveNotice(session, propertyId)
    track(session, 'notice_saved', { propertyId })
    return Response.json({ savedIds: listSaved(session).map(r => r.propertyId) })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : '저장하지 못했습니다.' },
      { status: 500 },
    )
  }
}

export async function DELETE(req: NextRequest) {
  const denied = checkMutation(req)
  if (denied) return denied
  try {
    const session = await resolveSession()
    const { propertyId } = (await req.json()) ?? {}
    if (typeof propertyId !== 'string') {
      return Response.json({ error: '잘못된 요청입니다.' }, { status: 400 })
    }
    unsaveNotice(session, propertyId)
    return Response.json({ savedIds: listSaved(session).map(r => r.propertyId) })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : '해제하지 못했습니다.' },
      { status: 500 },
    )
  }
}
