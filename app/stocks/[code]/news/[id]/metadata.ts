import { Metadata } from 'next';
import { Database } from '@/lib/database/Mysql';
import { RowDataPacket } from 'mysql2';

// ページメタデータ設定
const PAGE_METADATA = {
  titleTemplate: '{articleTitle} | {companyName}({code})',
  descriptionTemplate: '{companyName}(証券コード:{code})のニュース「{articleTitle}」の詳細。最新の企業動向・市場分析をAIが要約してお届けします。',
  fallbackTitle: '記事詳細 | 証券コード{code}',
  fallbackDescription: '証券コード{code}に関する株式ニュースの詳細ページ。最新の企業情報・市場分析をAIが要約してお届けします。',
};

type Props = {
  params: Promise<{
    code: string;
    id: string;
  }>;
};

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const { code, id } = await params;

  try {
    const database = Database.getInstance();

    const query = `
      SELECT
        p.id,
        p.title,
        pc.code,
        c.name as company_name
      FROM post p
      JOIN post_code pc ON p.id = pc.post_id
      JOIN company c ON pc.code = c.code
      WHERE p.id = ? AND pc.code = ? AND p.accept = 1
    `;

    const results = await database.select(query, [id, code]) as RowDataPacket[];

    if (results && results.length > 0) {
      const article = results[0];

      const title = PAGE_METADATA.titleTemplate
        .replace('{articleTitle}', article.title)
        .replace('{companyName}', article.company_name)
        .replace('{code}', code);
      const description = PAGE_METADATA.descriptionTemplate
        .replace('{companyName}', article.company_name)
        .replace('{code}', code)
        .replace('{articleTitle}', article.title);

      return {
        title,
        description,
        openGraph: {
          title: title + ' | 株AI',
          description,
          type: 'article',
          url: `https://kabu-ai.jp/stocks/${code}/news/${id}`,
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