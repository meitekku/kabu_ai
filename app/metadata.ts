import { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    default: '株AI - AI株式分析・株価予測・投資情報',
    template: '%s | 株AI'
  },
  description: '株AIはAIを活用した株式投資の総合情報サイトです。最新ニュース・株価チャート・AI銘柄分析・株価予測・ランキングを無料で提供。4,000社以上の上場企業情報をAIが分析し、投資判断をサポートします。',
  keywords: ['株式', '投資', 'AI', '株価予測', '株価チャート', '銘柄分析', 'ランキング', '株式ニュース', '株AI', '上場企業'],
  icons: {
    icon: '/only_icon.png',
    apple: '/only_icon.png',
  },
  openGraph: {
    title: '株AI - AI株式分析・株価予測・投資情報',
    description: '株AIはAIを活用した株式投資の総合情報サイトです。最新ニュース・株価チャート・AI銘柄分析・株価予測・ランキングを無料で提供。4,000社以上の上場企業情報をAIが分析し、投資判断をサポートします。',
    type: 'website',
    url: 'https://kabu-ai.jp',
    siteName: '株AI',
    locale: 'ja_JP',
    images: [
      {
        url: 'https://kabu-ai.jp/only_icon.png?v=4',
        width: 365,
        height: 365,
        alt: '株AI',
        type: 'image/png',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '株AI - AI株式分析・株価予測・投資情報',
    description: '株AIはAIを活用した株式投資の総合情報サイトです。最新ニュース・株価チャート・AI銘柄分析・株価予測・ランキングを無料で提供。4,000社以上の上場企業情報をAIが分析し、投資判断をサポートします。',
    images: ['https://kabu-ai.jp/only_icon.png?v=4'],
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