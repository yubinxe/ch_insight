import { Suspense } from 'react'
import CrmShell from '@/components/crm/CrmShell'
import CustomersView from '@/components/crm/CustomersView'

export const metadata = { title: '고객 CRM — 집인사이트' }

export default function CustomersPage() {
  return (
    <CrmShell>
      <Suspense fallback={<div className="crm-skel" style={{ height: 320 }} />}>
        <CustomersView />
      </Suspense>
    </CrmShell>
  )
}
