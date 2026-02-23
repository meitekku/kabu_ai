import '@/app/globals.css'
import LayoutClient from '@/components/layout/LayoutClient'
import MobileTopAd from '@/components/common/MobileTopAd'
import { metadata, gtag } from './metadata'
import Script from 'next/script'
import { AuthProvider } from '@/components/auth'
import { OrganizationJsonLd } from '@/components/seo/JsonLd'

export { metadata }

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body>
        <OrganizationJsonLd />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-JDHZGRWL1V"
          strategy="afterInteractive"
          async
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {gtag}
        </Script>
        <AuthProvider>
          <MobileTopAd />
          <LayoutClient>
            {children}
          </LayoutClient>
        </AuthProvider>
      </body>
    </html>
  )
}