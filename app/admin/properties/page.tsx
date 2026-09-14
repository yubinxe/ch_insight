import CrmShell from '@/components/crm/CrmShell'
import PropertiesView from '@/components/crm/PropertiesView'

export const metadata = { title: '운영 · 물건관리 — 청약인사이트' }

export default function PropertiesPage() {
  return (
    <CrmShell>
      <PropertiesView />
    </CrmShell>
  )
}
