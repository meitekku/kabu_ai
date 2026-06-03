import { Metadata } from 'next';

const PAGE_METADATA = {
  title: '{companyName}({code})のバリュエーション分析',
  description: '{companyName}(証券コード:{code})のバリュエーション分析。PER・PBR・配当利回りなどの指標をAIが分析。投資判断の参考に。',
  fallbackTitle: '証券コード{code}のバリュエーション分析',
  fallbackDescription: '証券コード{code}のバリュエーション分析。PER・PBR・配当利回りなどの指標をAIが分析します。',
};

type Props = {
  params: Promise<{
    code: string;
  }>;
};

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const { code } = await params;

  try {
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
          url: `https://kabu-ai.jp/stocks/${code}/valuation`,
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
