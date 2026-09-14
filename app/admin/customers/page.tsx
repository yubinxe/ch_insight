import { Suspense } from 'react'
import CrmShell from '@/components/crm/CrmShell'
import CustomersView from '@/components/crm/CustomersView'

export const metadata = { title: '운영 · 고객관리 — 청약인사이트' }

export default function CustomersPage() {
  return (
    <CrmShell>
      <Suspense fallback={<div className="crm-skel" style={{ height: 320 }} />}>
        <CustomersView />
      </Suspense>
    </CrmShell>
  )
}
