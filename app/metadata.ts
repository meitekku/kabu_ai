import { Metadata } from 'next'

export const metadata: Metadata = {
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
    description: '株式投資に関する情報を提供するサイトです。ランキングや分析データを確認できます。',
    type: 'website',
    url: 'https://kabu-ai.jp',
    siteName: '株AI',
    locale: 'ja_JP',
    images: [
      {
        url: 'https://kabu-ai.jp/only_icon.png?v=3',
        width: 365,
        height: 365,
        alt: '株AI',
        type: 'image/png',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '株AI',
    description: '株式投資に関する情報を提供するサイトです。ランキングや分析データを確認できます。',
    images: ['https://kabu-ai.jp/only_icon.png?v=3'],
    creator: '@kabu_ai_jp',
    site: '@kabu_ai_jp',
  },
  other: {
    'google-analytics': 'G-JDHZGRWL1V',
  },
}

export const gtag = `
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-JDHZGRWL1V');
`