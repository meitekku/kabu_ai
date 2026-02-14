import { Metadata } from 'next';

// ページメタデータ設定
const PAGE_METADATA = {
  title: '{companyName}({code})の株価・チャート・ニュース',
  description: '{companyName}(証券コード:{code})の株価チャート・最新ニュース・AI分析情報を掲載。株価推移・企業業績・関連ニュースをまとめて確認できます。投資判断にお役立てください。',
  fallbackTitle: '証券コード{code}の株価・チャート・ニュース',
  fallbackDescription: '証券コード{code}の株価チャート・最新ニュース・AI分析情報を掲載。株価推移・関連ニュースをまとめて確認できます。',
};

type Props = {
  params: Promise<{
    code: string;
  }>;
};

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const { code } = await params;

  try {
    // 本番環境では内部API呼び出しを避け、直接データベースアクセス
    const { Database } = await import('@/lib/database/Mysql');
    const db = Database.getInstance();

    const [company] = await db.select<{ name: string }>('SELECT name FROM company WHERE code = ?', [code]);

    if (company && company.name) {
      const title = PAGE_METADATA.title
        .replace('{companyName}', company.name)
        .replace('{code}', code);
      const description = PAGE_METADATA.description
        .replace('{companyName}', company.name)
        .replace('{code}', code);

      return {
        title,
        description,
        openGraph: {
          title: title + ' | 株AI',
          description,
          type: 'website',
          url: `https://kabu-ai.jp/stocks/${code}/news`,
          siteName: '株AI',
          locale: 'ja_JP',
        },
        twitter: {
          card: 'summary',
          title: title + ' | 株AI',
          description,
        },
      };
    }
  } catch (error) {
    console.error('メタデータ生成エラー:', error);
  }

  return {
    title: PAGE_METADATA.fallbackTitle.replace('{code}', code),
    description: PAGE_METADATA.fallbackDescription.replace('{code}', code),
  };
};