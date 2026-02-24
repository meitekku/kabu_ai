import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'プレミアムプラン',
  description: '月額3,000円からの株AI プレミアムプラン。AIチャット無制限、株価予測、AI Agent等、充実の投資支援機能。',
};

export default function PremiumLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
