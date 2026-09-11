'use client'

import { useCallback, useEffect, useState } from 'react'
import { fetchSnapshot, type CrmSnapshot } from '@/lib/crm/client'

export function useSnapshot() {
  const [data, setData] = useState<CrmSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      const snap = await fetchSnapshot()
      setData(snap)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let alive = true
    fetchSnapshot()
      .then(snap => {
        if (!alive) return
        setData(snap)
        setError(null)
      })
      .catch((err: unknown) => {
        if (!alive) return
        setError(err instanceof Error ? err.message : '데이터를 불러오지 못했습니다.')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  return { data, loading, error, reload, setData }
}

/** 만원 단위 금액을 한국어 표기로 */
export function won(man: number) {
  if (man >= 10000) {
    const eok = Math.floor(man / 10000)
    const rest = man % 10000
    return rest ? `${eok}억 ${rest.toLocaleString()}만` : `${eok}억`
  }
  return `${man.toLocaleString()}만`
}

export function shortDate(iso: string | null) {
  if (!iso) return '미정'
  const [, m, d] = iso.split('-')
  if (!m || !d) return iso
  return `${Number(m)}.${Number(d)}`
}

export function clockTime(iso: string) {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function ddayLabel(days: number | null) {
  if (days === null) return '일정 미정'
  if (days < 0) return `${-days}일 경과`
  if (days === 0) return 'D-DAY'
  return `D-${days}`
}
