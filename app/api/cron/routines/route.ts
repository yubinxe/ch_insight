import { ROUTINES } from '@/lib/services/routines'
import { runRoutine, nextRunAt, ensureRoutines } from '@/lib/services/routine-runner'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * 스케줄러 진입점 (Vercel Cron).
 *
 * 인증은 `CRON_SECRET` 으로만 한다. 이 경로가 열려 있으면
 * 아무나 알림 발송을 트리거할 수 있다.
 * Vercel Cron 은 `Authorization: Bearer <CRON_SECRET>` 을 붙여 호출한다.
 */
export async function GET(req: Request) {
  const secret = (process.env.CRON_SECRET ?? '').trim()
  if (!secret) {
    return Response.json({ error: '스케줄러가 설정되지 않았습니다.' }, { status: 503 })
  }
  const auth = req.headers.get('authorization') ?? ''
  if (auth !== `Bearer ${secret}`) {
    return Response.json({ error: '인증되지 않은 호출입니다.' }, { status: 401 })
  }

  await ensureRoutines()

  // 이 시각에 돌아야 할 루틴만 고른다. 분 단위 오차는 Vercel 이 알아서 흡수한다.
  const nowIso = new Date().toISOString()
  const due = ROUTINES.filter(r => {
    const next = nextRunAt(r.scheduleCron, new Date(Date.now() - 90 * 1000))
    return next !== null && next <= nowIso
  })

  const results = []
  for (const r of due) {
    results.push({ key: r.key, ...(await runRoutine(r.key, 'SCHEDULE')) })
  }

  return Response.json({ ran: results.length, results })
}
