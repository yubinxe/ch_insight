import { NextRequest } from 'next/server'
import { isAdminRequest } from '@/lib/admin/auth'
import { parseOpportunityCsv } from '@/lib/adapters/csv-opportunities'
import * as repo from '@/lib/db/repo'

export const dynamic = 'force-dynamic'

/** CSV 업로드 → 검증 → 정규화 → upsert. 실패 행은 사유와 함께 돌려준다. */
export async function POST(req: NextRequest) {
  if (!(await isAdminRequest())) {
    return Response.json({ error: '운영자 인증이 필요합니다.' }, { status: 401 })
  }

  try {
    const contentType = req.headers.get('content-type') ?? ''
    let text = ''
    let source = 'CSV'

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData()
      const file = form.get('file')
      if (!(file instanceof File)) {
        return Response.json({ error: 'CSV 파일이 필요합니다.' }, { status: 400 })
      }
      if (file.size > 5 * 1024 * 1024) {
        return Response.json({ error: '파일이 너무 큽니다 (최대 5MB).' }, { status: 413 })
      }
      text = await file.text()
      const s = form.get('source')
      if (typeof s === 'string' && s.trim()) source = s.trim()
    } else {
      const body = await req.json().catch(() => ({}))
      text = typeof body?.csv === 'string' ? body.csv : ''
      if (typeof body?.source === 'string' && body.source.trim()) source = body.source.trim()
    }

    if (!text.trim()) return Response.json({ error: '내용이 비어 있습니다.' }, { status: 400 })

    const parsed = parseOpportunityCsv(text, source)
    const result = parsed.valid.length
      ? await repo.upsertOpportunities(parsed.valid)
      : { inserted: 0, updated: 0, failed: 0, errors: [] }

    return Response.json({
      total: parsed.total,
      inserted: result.inserted,
      updated: result.updated,
      failed: parsed.issues.length + result.failed,
      issues: parsed.issues.slice(0, 50),
      errors: result.errors,
      storage: repo.storageMode(),
    })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : '가져오기에 실패했습니다.' },
      { status: 500 },
    )
  }
}
