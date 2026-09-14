import CrmShell from '@/components/crm/CrmShell'
import MatchesView from '@/components/crm/MatchesView'

export const metadata = { title: '매칭현황 — 집인사이트' }

export default function MatchesPage() {
  return (
    <CrmShell>
      <MatchesView />
    </CrmShell>
  )
}
