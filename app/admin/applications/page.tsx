import CrmShell from '@/components/crm/CrmShell'
import ApplicationsView from '@/components/crm/ApplicationsView'

export const metadata = { title: '운영 · 지원관리 — 청약인사이트' }

export default function ApplicationsPage() {
  return (
    <CrmShell>
      <ApplicationsView />
    </CrmShell>
  )
}
