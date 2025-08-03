import '@/app/globals.css'
import LayoutClient from '@/components/layout/LayoutClient'
import MobileTopAd from '@/components/common/MobileTopAd'

export const metadata = {
  title: {
    default: '株AI',
    template: '%s | 株AI'
  },
  description: '株式投資に関する情報を提供するサイトです。ランキングや分析データを確認できます。',
  keywords: ['株式', '投資', 'ランキング', '株価', 'AI'],
  icons: {
    icon: '/only_icon.png',
    apple: '/only_icon.png',
  },
  openGraph: {
    title: '株AI',
    description: '株式投資に関する情報を提供するサイトです',
    type: 'website',
    images: '/only_icon.png',
  },
  twitter: {
    card: 'summary',
    title: '株AI',
    description: '株式投資に関する情報を提供するサイトです',
    images: '/only_icon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>
        <MobileTopAd />
        <LayoutClient>
          {children}
        </LayoutClient>
      </body>
    </html>
  )
}