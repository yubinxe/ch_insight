import type { ApplicationTaskRow, OpportunityRow } from '@/lib/db/types'

/**
 * 공고 일정 → 지원 Task.
 *
 * 규칙:
 *  - 공고에 날짜가 없으면 만들어내지 않는다 (DATE_UNKNOWN 또는 미생성)
 *  - OFFICIAL(공고 기재) 과 RECOMMENDED(서비스 제안 준비일) 을 분리 표기한다
 *  - 계약은 당첨 등 선행 조건이 확정돼야 활성화한다
 */

type NewTask = Omit<ApplicationTaskRow, 'id' | 'created_at'>

function shift(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00`)
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function buildApplicationTasks(applicationId: string, opp: OpportunityRow): NewTask[] {
  const tasks: NewTask[] = []
  const push = (t: Omit<NewTask, 'application_id'>) => tasks.push({ application_id: applicationId, ...t })

  // 준비 권장일 — 공식 기한에서 역산. 기준 날짜가 없으면 만들지 않는다.
  if (opp.application_start) {
    push({
      title: '공고문 검토',
      due_date: opp.application_start,
      task_type: 'REVIEW',
      date_source: 'RECOMMENDED',
      status: 'TODO',
    })
  }
  if (opp.application_end) {
    push({
      title: '신청 준비 (자격요건 대조)',
      due_date: shift(opp.application_end, -5),
      task_type: 'REVIEW',
      date_source: 'RECOMMENDED',
      status: 'TODO',
    })
    push({
      title: '구비서류 준비',
      due_date: shift(opp.application_end, -3),
      task_type: 'DOCUMENT',
      date_source: 'RECOMMENDED',
      status: 'TODO',
    })
    // 공식 기한
    push({
      title: '청약 신청 접수 마감',
      due_date: opp.application_end,
      task_type: 'APPLY',
      date_source: 'OFFICIAL',
      status: 'TODO',
    })
  } else {
    push({
      title: '청약 신청 접수 마감',
      due_date: null,
      task_type: 'APPLY',
      date_source: 'OFFICIAL',
      status: 'DATE_UNKNOWN',
    })
  }

  // 서류 마감은 접수 마감과 다른 날짜다. 복사하지 않는다.
  push({
    title: '서류 제출 마감',
    due_date: opp.document_deadline,
    task_type: 'DOCUMENT',
    date_source: 'OFFICIAL',
    status: opp.document_deadline ? 'TODO' : 'DATE_UNKNOWN',
  })

  push({
    title: '당첨자 발표',
    due_date: opp.result_date,
    task_type: 'RESULT',
    date_source: 'OFFICIAL',
    status: opp.result_date ? 'TODO' : 'DATE_UNKNOWN',
  })

  // 계약은 당첨 확정 전까지 잠근다. 발표일 +N 로 만들어내지 않는다.
  push({
    title: '계약 체결',
    due_date: opp.contract_start,
    task_type: 'CONTRACT',
    date_source: 'OFFICIAL',
    status: 'BLOCKED',
  })

  return tasks
}
