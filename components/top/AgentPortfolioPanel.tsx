'use client'

import TopChatShell from '@/components/top/TopChatShell'

// WHY: legacy entry point — kept so other imports keep working.
// New top page mounts TopChatShell directly to take the full viewport.
export default function AgentPortfolioPanel() {
  return (
    <div className="h-full w-full">
      <TopChatShell />
    </div>
  )
}
