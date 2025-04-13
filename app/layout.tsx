"use client"

import '@/app/globals.css'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import GlobalNavigation from '@/components/navigation/GlobalNavigation'
import RankingTable from '@/components/common/RankingTable'
import { usePathname } from 'next/navigation'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isAdminPage = pathname?.startsWith('/admin')
  const mainClassName = isAdminPage ? 'w-full' : 'w-full md:w-[670px]'

  return (
    <html>
      <body>
        <div className="min-h-screen flex flex-col">
          <GlobalNavigation />
          <Header />
          <div className="flex-grow max-w-[1000px] w-full mx-auto px-2 my-6 sm:px-6">
            <div className="flex flex-col md:flex-row gap-8">
              <main className={mainClassName}>
                {children}
              </main>
              {!isAdminPage && (
                <aside className="w-full md:w-[300px] space-y-6">
                  <RankingTable 
                    title="アクセスランキング"
                    tableName="ranking_access"
                    limit={5}
                  />
                  <RankingTable 
                    title="値上がり率ランキング"
                    tableName="ranking_up"
                    limit={5}
                  />
                  <RankingTable 
                    title="値下がり率ランキング"
                    tableName="ranking_low"
                    limit={5}
                  />
                  <RankingTable 
                    title="ストップ高ランキング"
                    tableName="ranking_stop_high"
                    limit={5}
                  />
                  <RankingTable 
                    title="ストップ安ランキング"
                    tableName="ranking_stop_low"
                    limit={5}
                  />
                  <RankingTable 
                    title="出来高ランキング"
                    tableName="ranking_trading_value"
                    limit={5}
                  />
                </aside>
              )}
            </div>
          </div>
          <Footer />
        </div>
      </body>
    </html>
  )
}