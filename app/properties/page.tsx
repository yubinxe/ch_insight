import CrmShell from '@/components/crm/CrmShell'
import PropertiesView from '@/components/crm/PropertiesView'

export const metadata = { title: '관리 주택 — 집플리즈' }

export default function PropertiesPage() {
  return (
    <CrmShell>
      <PropertiesView />
    </CrmShell>
  )
}
