import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ログイン',
  description: '株AIにログイン。AI株式分析・株価予測・投資情報にアクセスしましょう。Google・X(Twitter)・Facebookアカウントでも簡単にログインできます。',
  robots: { index: false, follow: true },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
