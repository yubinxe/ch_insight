import CrmShell from '@/components/crm/CrmShell'
import AnalyzeView from '@/components/crm/AnalyzeView'

export const metadata = { title: '조건진단 — 집인사이트' }

export default function AnalyzePage() {
  return (
    <CrmShell>
      <AnalyzeView />
    </CrmShell>
  )
}
