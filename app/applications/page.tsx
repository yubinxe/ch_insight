import CrmShell from '@/components/crm/CrmShell'
import ApplicationsView from '@/components/crm/ApplicationsView'

export const metadata = { title: '지원 관리 — 집플리즈' }

export default function ApplicationsPage() {
  return (
    <CrmShell>
      <ApplicationsView />
    </CrmShell>
  )
}
