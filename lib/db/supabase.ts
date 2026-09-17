import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase 서버 클라이언트.
 *
 * service role 키는 절대 브라우저로 나가면 안 되므로 이 모듈은 서버에서만 import 한다.
 * (클라이언트 컴포넌트에서 import 하면 빌드 시 번들에 포함되므로 주의)
 *
 * 키가 없으면 null 을 반환하고, 상위 레이어가 메모리 저장소로 폴백한다.
 * 자격증명이 없다고 앱이 죽지 않게 한다.
 */

let cached: SupabaseClient | null | undefined

function readEnv() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  return { url: url.trim(), key: key.trim() }
}

export function isSupabaseConfigured() {
  const { url, key } = readEnv()
  return Boolean(url && key)
}

export function getSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached

  const { url, key } = readEnv()
  if (!url || !key) {
    cached = null
    return null
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-application-name': 'jipcatch' } },
  })
  return cached
}

/** 테스트·재설정용 */
export function resetSupabaseClient() {
  cached = undefined
}
