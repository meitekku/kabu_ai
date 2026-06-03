import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI株式相談チャット',
  description: 'AIに株式投資について質問できるチャット機能。銘柄分析・市場動向・企業業績・投資戦略など、株式投資に関するあらゆる質問にAIがお答えします。',
  robots: { index: false, follow: true },
};

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
