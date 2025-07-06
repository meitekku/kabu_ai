"use client"

import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import GlobalNavigation from '@/components/navigation/GlobalNavigation'
import Sidebar from '@/components/layout/Sidebar'
import { usePathname } from 'next/navigation'
import MobileTopAd from '../common/MobileTopAd'

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
      <MobileTopAd />
      <div className="flex-grow max-w-[1000px] w-full mx-auto px-4 my-6 sm:px-6">
        <div className="flex flex-col md:flex-row gap-10">
          <main className={mainClassName}>
            {children}
          </main>
          {!isAdminPage && <Sidebar />}
        </div>
      </div>
      <Footer />
    </div>
  )
}