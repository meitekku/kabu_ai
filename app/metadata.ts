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
    description: '株式投資に関する情報を提供するサイトです',
    type: 'website',
    url: 'https://kabu-ai.jp',
    images: [
      {
        url: 'https://kabu-ai.jp/only_icon.png',
        width: 365,
        height: 365,
        alt: '株AI',
      }
    ],
  },
  twitter: {
    card: 'summary',
    title: '株AI',
    description: '株式投資に関する情報を提供するサイトです',
    images: ['https://kabu-ai.jp/only_icon.png'],
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