import '@/app/globals.css'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-grow max-w-1200 m-6 ">
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  )
}