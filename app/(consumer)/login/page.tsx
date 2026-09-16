import { Suspense } from 'react'
import LoginView from '@/components/consumer/LoginView'

export const metadata = { title: '로그인 — 집캐치' }

export default function LoginPage() {
  // LoginView 는 ?next= 를 읽어 보던 자리로 돌려보낸다.
  // useSearchParams 를 쓰므로 정적 렌더가 여기서 한 번 끊겨야 한다.
  return (
    <Suspense fallback={<div className="cs-wrap" style={{ paddingTop: 64, minHeight: '60vh' }} />}>
      <LoginView />
    </Suspense>
  )
}
