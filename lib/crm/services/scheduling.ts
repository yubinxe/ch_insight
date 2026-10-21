import type { Property, Task, TaskKind, TaskSource } from '../types'

/**
 * 일정은 두 종류를 절대 섞지 않는다.
 *
 *  OFFICIAL    — 공고 원문에 적힌 기한. 원문에 없으면 만들지 않고 미정으로 남긴다.
 *  RECOMMENDED — 우리가 제안하는 준비일. 항상 공식 기한에서 역산하며 그렇게 표시한다.
 *
 * 결과발표일 +7일을 공식 계약일로 만들거나, 접수마감일을 서류마감일로 복사하지 않는다.
 */

interface TaskTemplate {
  title: string
  kind: TaskKind
  source: TaskSource
  /** 기준이 되는 공고 일자. null 이면 해당 항목은 생성하지 않는다 */
  anchor: 'applicationStart' | 'applicationEnd' | 'documentDeadline' | 'resultDate' | 'contractStart'
  /** RECOMMENDED 일 때만 사용하는 역산 일수 */
  offsetDays?: number
  /** 선행 조건이 확정되어야 활성화되는 항목 */
  requiresWin?: boolean
  hint?: string
}

const TEMPLATES: TaskTemplate[] = [
  {
    title: '모집공고문 확인',
    kind: 'REVIEW',
    source: 'RECOMMENDED',
    anchor: 'applicationStart',
    offsetDays: 0,
    hint: '접수 시작일 기준 권장',
  },
  {
    title: '자격요건 대조',
    kind: 'REVIEW',
    source: 'RECOMMENDED',
    anchor: 'applicationEnd',
    offsetDays: -5,
    hint: '접수 마감 5일 전 권장',
  },
  {
    title: '구비서류 준비',
    kind: 'DOCUMENT',
    source: 'RECOMMENDED',
    anchor: 'applicationEnd',
    offsetDays: -3,
    hint: '접수 마감 3일 전 권장',
  },
  {
    title: '청약 신청 접수 마감',
    kind: 'APPLY',
    source: 'OFFICIAL',
    anchor: 'applicationEnd',
    hint: '공고 기재 기한',
  },
  {
    title: '서류 제출 마감',
    kind: 'DOCUMENT',
    source: 'OFFICIAL',
    anchor: 'documentDeadline',
    hint: '공고 기재 기한',
  },
  {
    title: '당첨자 발표',
    kind: 'RESULT',
    source: 'OFFICIAL',
    anchor: 'resultDate',
    hint: '공고 기재 일자',
  },
  {
    title: '계약 체결',
    kind: 'CONTRACT',
    source: 'OFFICIAL',
    anchor: 'contractStart',
    requiresWin: true,
    hint: '당첨 후 진행',
  },
]

function shiftIso(dateStr: string, days: number) {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

let taskSeq = 0

export interface BuildTasksOptions {
  applicationId: string
  /** 당첨 등 선행 조건이 확정되었는지 */
  won?: boolean
}

export function buildTasks(property: Property, options: BuildTasksOptions): Task[] {
  const anchors: Record<TaskTemplate['anchor'], string | null> = {
    applicationStart: property.applicationStart,
    applicationEnd: property.applicationEnd,
    documentDeadline: property.documentDeadline,
    resultDate: property.resultDate,
    contractStart: property.contractStart,
  }

  return TEMPLATES.map(t => {
    const anchor = anchors[t.anchor] ?? null
    taskSeq += 1

    // 원문에 기준 일자가 없으면 날짜를 만들지 않는다.
    const dueDate =
      anchor === null ? null : t.source === 'OFFICIAL' ? anchor : shiftIso(anchor, t.offsetDays ?? 0)

    const blocked = Boolean(t.requiresWin && !options.won)

    return {
      id: `T${String(Date.now()).slice(-6)}${String(taskSeq).padStart(3, '0')}`,
      applicationId: options.applicationId,
      title: t.title,
      kind: t.kind,
      source: t.source,
      dueDate,
      status: blocked ? 'BLOCKED' : dueDate ? 'TODO' : 'DATE_UNKNOWN',
      hint: t.hint,
      reminderType: 'NONE',
    } satisfies Task
  })
}
