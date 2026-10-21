'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { AlertSubscription, ConsumerUser, PendingIntent, SearchProfile } from '@/lib/crm/types'

export interface ConsumerMe {
  user: ConsumerUser | null
  profile: SearchProfile | null
  savedIds: string[]
  alerts: AlertSubscription[]
  pendingIntent: PendingIntent | null
}

interface ConsumerContextValue extends ConsumerMe {
  savedCount: number
  loading: boolean
  refresh: () => Promise<void>
  setMe: (me: ConsumerMe) => void
}

const EMPTY: ConsumerMe = {
  user: null,
  profile: null,
  savedIds: [],
  alerts: [],
  pendingIntent: null,
}

const Ctx = createContext<ConsumerContextValue>({
  ...EMPTY,
  savedCount: 0,
  loading: true,
  refresh: async () => {},
  setMe: () => {},
})

export function useConsumer() {
  return useContext(Ctx)
}

export default function ConsumerProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<ConsumerMe>(EMPTY)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/me', { cache: 'no-store' })
      if (res.ok) setMe(await res.json())
    } catch {
      // 세션 조회 실패는 화면을 막지 않는다. 비로그인 상태로 계속 사용할 수 있다.
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let alive = true
    fetch('/api/me', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : EMPTY))
      .then((data: ConsumerMe) => {
        if (alive) setMe(data)
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const value = useMemo<ConsumerContextValue>(
    () => ({ ...me, savedCount: me.savedIds.length, loading, refresh, setMe }),
    [me, loading, refresh],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
