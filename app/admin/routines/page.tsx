import CrmShell from '@/components/crm/CrmShell'
import RoutinesView from '@/components/crm/RoutinesView'

export const metadata = { title: '운영 · 루틴 — 집캐치' }

export default function AdminRoutinesPage() {
  return (
    <CrmShell>
      <RoutinesView />
    </CrmShell>
  )
}
