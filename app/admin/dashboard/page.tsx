import CrmShell from '@/components/crm/CrmShell'
import CrmDashboard from '@/components/crm/CrmDashboard'

export const metadata = { title: '운영 · CRM 종합현황 — 집캐치' }

export default function AdminDashboardPage() {
  return (
    <CrmShell>
      <CrmDashboard />
    </CrmShell>
  )
}
