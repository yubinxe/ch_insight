import CrmShell from '@/components/crm/CrmShell'
import MatchesView from '@/components/crm/MatchesView'

export const metadata = { title: '운영 · 매칭현황 — 청약인사이트' }

export default function MatchesPage() {
  return (
    <CrmShell>
      <MatchesView />
    </CrmShell>
  )
}
