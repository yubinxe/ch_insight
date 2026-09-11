import CrmShell from '@/components/crm/CrmShell'
import MatchesView from '@/components/crm/MatchesView'

export const metadata = { title: '추천 랭킹 — 집플리즈' }

export default function MatchesPage() {
  return (
    <CrmShell>
      <MatchesView />
    </CrmShell>
  )
}
