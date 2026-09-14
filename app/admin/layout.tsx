import type { ReactNode } from 'react'
import Link from 'next/link'
import { isAdminEnabled, isAdminRequest } from '@/lib/admin/auth'
import AdminLogin from '@/components/admin/AdminLogin'

export const metadata = { title: '운영 · 청약인사이트' }

/**
 * 운영 화면은 매 요청 서버에서 인증을 확인한다.
 * 인증 전에는 하위 화면을 렌더링하지 않으므로 데이터가 노출되지 않는다.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  if (!isAdminEnabled()) {
    return (
      <div className="cs">
        <main className="cs-main cs-wrap" style={{ paddingTop: 80, maxWidth: 640 }}>
          <h1 className="cs-page-title">운영 화면이 잠겨 있습니다</h1>
          <p className="cs-lead" style={{ marginTop: 14 }}>
            <code>ADMIN_PASSCODE</code> 환경변수를 설정해야 운영 화면을 열 수 있습니다. 기본 암호는 두지
            않습니다.
          </p>
          <Link href="/" className="cs-btn cs-btn--ghost" style={{ marginTop: 24 }}>
            홈으로
          </Link>
        </main>
      </div>
    )
  }

  if (!(await isAdminRequest())) return <AdminLogin />

  return <>{children}</>
}
