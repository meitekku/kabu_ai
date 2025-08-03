import '@/app/globals.css'
import LayoutClient from '@/components/layout/LayoutClient'
import MobileTopAd from '@/components/common/MobileTopAd'
import { metadata } from './metadata'
import { gtag } from './metadata'
import Script from 'next/script'

export { metadata }

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-JDHZGRWL1V"
          strategy="afterInteractive"
          async
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {gtag}
        </Script>
        <MobileTopAd />
        <LayoutClient>
          {children}
        </LayoutClient>
      </body>
    </html>
  )
}