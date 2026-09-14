import CrmShell from '@/components/crm/CrmShell'
import AnalyzeView from '@/components/crm/AnalyzeView'

export const metadata = { title: '내 주거기회 분석 — 집인사이트' }

export default function AnalyzePage() {
  return (
    <CrmShell>
      <AnalyzeView />
    </CrmShell>
  )
}
