'use client'

import { Sparkles } from 'lucide-react'
import { PortfolioChatPanel } from '@/components/agent-portfolio/PortfolioChatPanel'

export default function AgentPortfolioPanel() {
  return (
    <section className="w-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-zinc-700" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-zinc-900">
            AIポートフォリオエージェント
          </h2>
        </div>
        <span className="text-[11px] font-medium text-zinc-500 px-2 py-0.5 rounded-full bg-zinc-100">
          BETA
        </span>
      </div>

      <div className="relative w-full h-[640px] rounded-2xl border border-zinc-200 bg-white overflow-hidden">
        <PortfolioChatPanel />
      </div>
    </section>
  )
}
