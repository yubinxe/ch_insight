/**
 * Supabase 연결 · 스키마 점검.
 *
 *   npm run db:check
 *
 * .env.local 의 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 로 접속해
 * supabase/schema.sql 의 테이블이 실제로 있는지 하나씩 확인한다.
 * 키를 화면에 출력하지 않는다.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const TABLES = [
  'customers',
  'customer_preferences',
  'opportunities',
  'opportunity_events',
  'matches',
  'notifications',
  'behavior_events',
  'applications',
  'application_tasks',
  'inquiries',
]

function loadEnv(file) {
  try {
    for (const line of readFileSync(resolve(process.cwd(), file), 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
      if (!m) continue
      const v = m[2].trim().replace(/^["'](.*)["']$/, '$1')
      if (!(m[1] in process.env)) process.env[m[1]] = v
    }
  } catch {
    /* 파일이 없으면 넘어간다 */
  }
}

loadEnv('.env.local')

const url = (process.env.SUPABASE_URL ?? '').trim().replace(/\/+$/, '')
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim()

if (!url || !key) {
  // 무엇이 빠졌는지 정확히 말한다. 둘 다 없다고 하면 엉뚱한 곳을 보게 된다.
  if (!url) console.log('✗ .env.local 에 SUPABASE_URL 이 없습니다.')
  if (!key) {
    console.log('✗ .env.local 에 SUPABASE_SERVICE_ROLE_KEY 가 없습니다.')
    if (url) {
      const ref = url.replace(/^https?:\/\//, '').split('.')[0]
      console.log(`  https://supabase.com/dashboard/project/${ref}/settings/api-keys`)
      console.log('  → service_role 키를 복사해 .env.local 의 SUPABASE_SERVICE_ROLE_KEY= 뒤에 붙여넣으세요.')
      console.log('  (anon 키가 아닙니다. 이 키는 서버에서만 쓰며 브라우저로 내보내지 않습니다.)')
    }
  }
  console.log('')
  console.log('자세한 절차: docs/setup/supabase.md')
  console.log('(지금 상태로도 앱은 뜹니다 — 메모리에 저장되고 서버를 끄면 사라집니다.)')
  process.exit(1)
}

console.log(`대상 ${url}`)

const missing = []
let reachable = true

for (const t of TABLES) {
  let label
  try {
    const res = await fetch(`${url}/rest/v1/${t}?select=*&limit=0`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'count=exact' },
    })
    if (res.ok) {
      const range = res.headers.get('content-range') ?? ''
      const count = range.split('/')[1] ?? '?'
      label = `✓ ${t.padEnd(22)} ${count}행`
    } else if (res.status === 404 || res.status === 401) {
      const body = await res.text()
      if (/does not exist|could not find the table/i.test(body)) {
        missing.push(t)
        label = `✗ ${t.padEnd(22)} 테이블 없음`
      } else {
        reachable = false
        label = `✗ ${t.padEnd(22)} ${res.status} ${body.slice(0, 90)}`
      }
    } else {
      const body = await res.text()
      missing.push(t)
      label = `✗ ${t.padEnd(22)} ${res.status} ${body.slice(0, 90)}`
    }
  } catch (err) {
    reachable = false
    label = `✗ ${t.padEnd(22)} 접속 실패: ${err.message}`
  }
  console.log('  ' + label)
}

console.log('')
if (!reachable) {
  console.log('접속이 안 됩니다. SUPABASE_URL 이 프로젝트 주소(https://xxxx.supabase.co)인지,')
  console.log('키가 anon 이 아니라 service_role 인지 확인하세요.')
  process.exit(1)
}
if (missing.length) {
  console.log(`테이블 ${missing.length}개가 없습니다: ${missing.join(', ')}`)
  console.log('Supabase → SQL Editor 에 supabase/schema.sql 전체를 붙여넣고 Run 하세요.')
  process.exit(1)
}
console.log('모든 테이블이 준비됐습니다. 이제 저장소가 Supabase 로 동작합니다.')
console.log('다음: 앱을 켜고 /admin → 시연 데이터 생성 · 청약홈 동기화.')
