import type { ReactNode } from 'react'
import ConsumerProvider from '@/components/consumer/ConsumerProvider'
import SignupGate from '@/components/consumer/SignupGate'
import ConsumerShell from '@/components/consumer/ConsumerShell'

export default function ConsumerLayout({ children }: { children: ReactNode }) {
  return (
    <ConsumerProvider>
      <SignupGate>
        <ConsumerShell>{children}</ConsumerShell>
      </SignupGate>
    </ConsumerProvider>
  )
}
