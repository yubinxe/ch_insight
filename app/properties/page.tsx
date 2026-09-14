import CrmShell from '@/components/crm/CrmShell'
import PropertiesView from '@/components/crm/PropertiesView'

export const metadata = { title: '관리 주택 — 집인사이트' }

export default function PropertiesPage() {
  return (
    <CrmShell>
      <PropertiesView />
    </CrmShell>
  )
}
