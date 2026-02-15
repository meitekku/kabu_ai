"use client"

import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import GlobalNavigation from '@/components/navigation/GlobalNavigation'
import Sidebar from '@/components/layout/Sidebar'
import { usePathname } from 'next/navigation'

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
  const isFullWidthPage = isAdminPage || isPremiumPage || isSettingsPage || isChatPage
  const mainClassName = isFullWidthPage ? 'w-full' : 'w-full md:w-[670px]'

  // チャットページは専用レイアウト
  if (isChatPage) {
    return (
      <div className="min-h-screen flex flex-col">
        <GlobalNavigation />
        <Header />
        <main className="flex-grow">
          {children}
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <GlobalNavigation />
      <Header isDark={isPremiumPage} />
      <div className={`flex-grow w-full mx-auto ${isPremiumPage ? '' : 'max-w-[1000px] px-4 my-6 sm:px-6'} overflow-x-auto`}>
        <div className="flex flex-col md:flex-row gap-10 min-w-0">
          <main className={`${mainClassName} min-w-0 overflow-x-auto`}>
            {children}
          </main>
          {!isFullWidthPage && (
            <aside className="w-full md:w-[300px] flex-shrink-0">
              <Sidebar />
            </aside>
          )}
        </div>
      </div>
      <Footer isDark={isPremiumPage} />
    </div>
  )
}