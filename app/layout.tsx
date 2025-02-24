import '@/app/globals.css'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import GlobalNavigation from '@/components/navigation/GlobalNavigation'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex flex-col">
          <GlobalNavigation />
          <Header />
          <main className="flex-grow max-w-[1020px] w-full mx-auto px-2 my-6 sm:px-6">
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  )
}