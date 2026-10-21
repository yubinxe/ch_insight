import type { OpportunityRow } from '@/lib/db/types'

/**
 * CSV → Opportunity 정규화.
 *
 * 외부 소스 구조를 DB 스키마에 그대로 붙이지 않고 여기서 정규화한다.
 * 잘못된 행은 조용히 버리지 않고 사유와 함께 보고한다.
 */

export interface ImportIssue {
  row: number
  reason: string
}

export interface ParsedCsv {
  valid: Partial<OpportunityRow>[]
  issues: ImportIssue[]
  total: number
}

const HOUSING_TYPES = ['청년매입임대', '행복주택', '공공임대', '공공지원민간임대', '신혼희망타운', '국민임대', '영구임대']

/** 흔한 헤더 표기를 표준 필드로 매핑한다 */
const HEADER_MAP: Record<string, keyof OpportunityRow> = {
  공고명: 'title',
  title: 'title',
  주택명: 'title',
  지역: 'region',
  region: 'region',
  시군구: 'region',
  광역: 'district',
  district: 'district',
  시도: 'district',
  주소: 'address',
  address: 'address',
  주택유형: 'housing_type',
  housing_type: 'housing_type',
  유형: 'housing_type',
  전용면적: 'area',
  area: 'area',
  면적: 'area',
  보증금: 'deposit',
  deposit: 'deposit',
  월임대료: 'monthly_rent',
  월세: 'monthly_rent',
  monthly_rent: 'monthly_rent',
  공급세대수: 'supply_count',
  supply_count: 'supply_count',
  공실: 'vacancy_count',
  vacancy_count: 'vacancy_count',
  접수시작일: 'application_start',
  application_start: 'application_start',
  접수마감일: 'application_end',
  application_end: 'application_end',
  서류마감일: 'document_deadline',
  document_deadline: 'document_deadline',
  발표일: 'result_date',
  result_date: 'result_date',
  계약일: 'contract_start',
  contract_start: 'contract_start',
  공고번호: 'external_id',
  external_id: 'external_id',
  원문링크: 'source_url',
  source_url: 'source_url',
  경쟁률: 'competition_rate',
  competition_rate: 'competition_rate',
}

/** 따옴표를 존중하는 최소 CSV 파서 */
export function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else quoted = false
      } else cur += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') {
      out.push(cur)
      cur = ''
    } else cur += ch
  }
  out.push(cur)
  return out.map(v => v.trim())
}

/** "6,500", "6500만원", "1억 2,000" 같은 표기를 만원 정수로 */
export function parseMan(raw: string): number | null {
  if (!raw) return null
  const s = raw.replace(/\s/g, '')
  const eokMatch = s.match(/(\d+(?:\.\d+)?)억/)
  const restMatch = s.replace(/\d+(?:\.\d+)?억/, '').match(/([\d,]+(?:\.\d+)?)/)
  let total = 0
  if (eokMatch) total += parseFloat(eokMatch[1]) * 10000
  if (restMatch) total += parseFloat(restMatch[1].replace(/,/g, ''))
  if (!eokMatch && !restMatch) return null
  return Number.isFinite(total) ? Math.round(total) : null
}

export function parseNumber(raw: string): number | null {
  if (!raw) return null
  const n = Number(raw.replace(/[^\d.-]/g, ''))
  return Number.isFinite(n) ? n : null
}

/** YYYY-MM-DD / YYYY.MM.DD / YYYYMMDD 를 ISO 날짜로. 없으면 null */
export function parseDate(raw: string): string | null {
  if (!raw) return null
  const digits = raw.replace(/[^\d]/g, '')
  if (digits.length !== 8) return null
  const [y, m, d] = [digits.slice(0, 4), digits.slice(4, 6), digits.slice(6, 8)]
  const date = new Date(`${y}-${m}-${d}T00:00:00`)
  if (Number.isNaN(date.getTime())) return null
  return `${y}-${m}-${d}`
}

function normalizeRegion(raw: string): string {
  const s = raw.trim()
  // "서울특별시 관악구" → "관악구"
  const parts = s.split(/\s+/)
  return parts[parts.length - 1] || s
}

function normalizeHousingType(raw: string): string {
  const s = raw.replace(/\s/g, '')
  const hit = HOUSING_TYPES.find(t => s.includes(t.replace(/\s/g, '')))
  return hit ?? (s || '기타')
}

function statusFrom(start: string | null, end: string | null, today = new Date()): OpportunityRow['status'] {
  if (!start || !end) return 'UPCOMING'
  const t = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate(),
  ).padStart(2, '0')}`
  if (t < start) return 'UPCOMING'
  if (t > end) return 'CLOSED'
  return 'OPEN'
}

export function parseOpportunityCsv(text: string, source = 'CSV'): ParsedCsv {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0)
  if (lines.length < 2) {
    return { valid: [], issues: [{ row: 0, reason: '헤더와 데이터 행이 필요합니다.' }], total: 0 }
  }

  const headers = splitCsvLine(lines[0]).map(h => h.replace(/^﻿/, ''))
  const fields = headers.map(h => HEADER_MAP[h] ?? HEADER_MAP[h.toLowerCase()] ?? null)

  const valid: Partial<OpportunityRow>[] = []
  const issues: ImportIssue[] = []
  const seen = new Set<string>()

  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i])
    const raw: Record<string, string> = {}
    fields.forEach((f, idx) => {
      if (f) raw[f] = cells[idx] ?? ''
    })

    const title = raw.title?.trim()
    const region = raw.region ? normalizeRegion(raw.region) : ''

    if (!title) {
      issues.push({ row: i + 1, reason: '공고명이 비어 있습니다.' })
      continue
    }
    if (!region) {
      issues.push({ row: i + 1, reason: '지역이 비어 있습니다.' })
      continue
    }

    const deposit = parseMan(raw.deposit ?? '')
    const rent = parseMan(raw.monthly_rent ?? '')
    if (raw.deposit && deposit === null) {
      issues.push({ row: i + 1, reason: `보증금을 숫자로 읽을 수 없습니다: "${raw.deposit}"` })
      continue
    }
    if (raw.monthly_rent && rent === null) {
      issues.push({ row: i + 1, reason: `월 임대료를 숫자로 읽을 수 없습니다: "${raw.monthly_rent}"` })
      continue
    }

    const externalId = raw.external_id?.trim() || `${region}|${title}`
    const key = `${source}|${externalId}`
    if (seen.has(key)) {
      issues.push({ row: i + 1, reason: `같은 파일 안에 중복된 공고입니다: ${externalId}` })
      continue
    }
    seen.add(key)

    const start = parseDate(raw.application_start ?? '')
    const end = parseDate(raw.application_end ?? '')

    valid.push({
      source,
      external_id: externalId,
      opportunity_type: 'RENTAL',
      housing_type: normalizeHousingType(raw.housing_type ?? ''),
      title,
      region,
      district: raw.district?.trim() || null,
      address: raw.address?.trim() || null,
      area: parseNumber(raw.area ?? ''),
      deposit,
      monthly_rent: rent,
      supply_count: parseNumber(raw.supply_count ?? ''),
      vacancy_count: parseNumber(raw.vacancy_count ?? ''),
      // 원문에 없는 날짜는 만들지 않는다
      application_start: start,
      application_end: end,
      document_deadline: parseDate(raw.document_deadline ?? ''),
      result_date: parseDate(raw.result_date ?? ''),
      contract_start: parseDate(raw.contract_start ?? ''),
      status: statusFrom(start, end),
      source_url: raw.source_url?.trim() || null,
      // 경쟁률은 실제 값이 있을 때만
      competition_rate: parseNumber(raw.competition_rate ?? ''),
      is_demo: false,
    })
  }

  return { valid, issues, total: lines.length - 1 }
}
