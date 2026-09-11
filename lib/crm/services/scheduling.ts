import type { Application, Property, Task } from '../types'

interface TaskTemplate {
  title: string
  /** 기준 날짜 선택 — 없으면 date pending */
  from: 'start' | 'end' | 'result'
  offsetDays: number
  reminderType: Task['reminderType']
}

/**
 * 공고 일정으로부터 지원 Task 를 생성한다.
 * 공고에 해당 날짜가 없으면 임의 날짜를 만들지 않고 PENDING_DATE 로 남긴다.
 */
const TEMPLATES: TaskTemplate[] = [
  { title: '공고문 확인', from: 'start', offsetDays: 0, reminderType: 'KAKAO' },
  { title: '지원 검토 · 자격요건 대조', from: 'start', offsetDays: 1, reminderType: 'PUSH' },
  { title: '청약 신청 접수', from: 'end', offsetDays: -2, reminderType: 'KAKAO' },
  { title: '서류 준비 (주민등록등본·소득증빙)', from: 'end', offsetDays: -1, reminderType: 'PUSH' },
  { title: '서류 제출', from: 'end', offsetDays: 0, reminderType: 'KAKAO' },
  { title: '결과 확인', from: 'result', offsetDays: 0, reminderType: 'KAKAO' },
  { title: '계약 체결', from: 'result', offsetDays: 7, reminderType: 'PUSH' },
]

function shiftIso(dateStr: string, days: number) {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

let taskSeq = 0

export function buildTasks(application: Application, property: Property): Task[] {
  const anchors: Record<TaskTemplate['from'], string | null> = {
    start: property.applicationStart,
    end: property.applicationEnd,
    result: property.resultDate,
  }

  return TEMPLATES.map(t => {
    const anchor = anchors[t.from]
    taskSeq += 1
    const dueDate = anchor ? shiftIso(anchor, t.offsetDays) : null
    return {
      id: `T${String(Date.now()).slice(-6)}${String(taskSeq).padStart(3, '0')}`,
      applicationId: application.id,
      title: t.title,
      dueDate,
      status: dueDate ? 'TODO' : 'PENDING_DATE',
      reminderType: t.reminderType,
    } satisfies Task
  })
}
