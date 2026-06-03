import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '新規登録（無料）',
  description: '株AIに無料で新規登録。AIによる株式分析・株価予測・最新ニュースで投資判断を効率化。メール・Google・X(Twitter)アカウントで簡単登録できます。',
  robots: { index: false, follow: true },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
