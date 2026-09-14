import CrmShell from '@/components/crm/CrmShell'
import DashboardView from '@/components/crm/DashboardView'

export const metadata = { title: '종합현황 — 집인사이트' }

export default function DashboardPage() {
  return (
    <CrmShell>
      <DashboardView />
    </CrmShell>
  )
}
