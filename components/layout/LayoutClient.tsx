"use client"

import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import GlobalNavigation from '@/components/navigation/GlobalNavigation'
import Sidebar from '@/components/layout/Sidebar'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import type { CompanyData } from '@/components/common/CurrentPriceInfo'
import type { BaseRankingData, RankingTableName } from '@/components/common/RankingTableClient'

interface LayoutSummaryResponse {
  success: boolean
  data?: {
    market: CompanyData[]
    rankings: Partial<Record<RankingTableName, BaseRankingData[]>>
  }
}

export default function LayoutClient({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isAdminPage = pathname?.startsWith('/admin')
  const isPremiumPage = pathname?.startsWith('/premium')
  const isSettingsPage = pathname?.startsWith('/settings')
  const isChatPage = pathname?.startsWith('/chat')
  const isAgentChatPage = pathname?.startsWith('/agent-chat')
  const isFavoritesPage = pathname?.startsWith('/favorites')
  const isBbsPage = pathname?.startsWith('/bbs')
  const isAnyChatPage = isChatPage || isAgentChatPage
  const isFullWidthPage = isAdminPage || isPremiumPage || isSettingsPage || isChatPage || isAgentChatPage || isFavoritesPage || isBbsPage
  const mainClassName = isFullWidthPage ? 'w-full' : 'w-full md:w-[670px]'
  const [layoutSummary, setLayoutSummary] = useState<LayoutSummaryResponse['data']>()
  const [isLayoutSummaryLoading, setIsLayoutSummaryLoading] = useState(!isAdminPage)

  useEffect(() => {
    if (isAdminPage || isAnyChatPage) {
      setIsLayoutSummaryLoading(false)
      return
    }

    const controller = new AbortController()
    let isMounted = true
    setIsLayoutSummaryLoading(true)

    const fetchLayoutSummary = async () => {
      try {
        const response = await fetch('/api/layout/summary', {
          method: 'GET',
          signal: controller.signal,
        })

        if (!response.ok) return

        const result = await response.json() as LayoutSummaryResponse
        if (result.success && result.data && isMounted) {
          setLayoutSummary(result.data)
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError' && isMounted) {
          console.error('Failed to fetch layout summary:', error)
        }
      } finally {
        if (isMounted) {
          setIsLayoutSummaryLoading(false)
        }
      }
    }

    void fetchLayoutSummary()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [isAdminPage, isAnyChatPage])

  const marketDataByCode = useMemo(() => {
    if (!layoutSummary?.market) return undefined
    return layoutSummary.market.reduce<Record<string, CompanyData>>((acc, item) => {
      acc[item.code] = item
      return acc
    }, {})
  }, [layoutSummary])

  // チャットページは専用レイアウト（ヘッダー・サイドバーなし）
  if (isAnyChatPage) {
    return (
      <div className="h-screen flex flex-col">
        <GlobalNavigation />
        <main className="flex-1 min-h-0">
          {children}
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <GlobalNavigation />
      <Header isDark={isPremiumPage} marketData={marketDataByCode} suspendFetch={isLayoutSummaryLoading} />
      <div className={`flex-grow w-full mx-auto ${isPremiumPage ? '' : 'max-w-[1000px] px-4 my-6 sm:px-6'} overflow-x-auto`}>
        <div className="flex flex-col md:flex-row gap-10 min-w-0">
          <main className={`${mainClassName} min-w-0 overflow-x-auto`}>
            {children}
          </main>
          {!isFullWidthPage && (
            <aside className="w-full md:w-[300px] flex-shrink-0">
              <Sidebar rankingData={layoutSummary?.rankings} suspendFetch={isLayoutSummaryLoading} />
            </aside>
          )}
        </div>
      </div>
      <Footer isDark={isPremiumPage} />
    </div>
  )
}
