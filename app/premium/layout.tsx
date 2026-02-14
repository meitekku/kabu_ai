import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'プレミアムプラン',
  description: '株AIプレミアムプラン（月額3,000円）。AIへの無制限質問・高精度な株価予測・リアルタイム市場分析・決算説明会の要約など、充実の投資支援機能をご利用いただけます。',
};

export default function PremiumLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
