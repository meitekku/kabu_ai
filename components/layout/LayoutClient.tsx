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
  const mainClassName = isAdminPage ? 'w-full' : 'w-full md:w-[670px]'

  return (
    <div className="min-h-screen flex flex-col">
      <GlobalNavigation />
      <Header />
      <div className="flex-grow max-w-[1000px] w-full mx-auto px-4 my-6 sm:px-6 overflow-x-auto">
        <div className="flex flex-col md:flex-row gap-10 min-w-0">
          <main className={`${mainClassName} min-w-0 overflow-x-auto`}>
            {children}
          </main>
          {!isAdminPage && (
            <aside className="w-full md:w-[300px] flex-shrink-0">
              <Sidebar />
            </aside>
          )}
        </div>
      </div>
      <Footer />
    </div>
  )
}