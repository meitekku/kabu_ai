import { generateMetadata } from './metadata';
import ArticleDetailClient from './ArticleDetailClient';
import { Database } from '@/lib/database/Mysql';
import { RowDataPacket } from 'mysql2';
import { redirect } from 'next/navigation';
import { NewsArticleJsonLd } from '@/components/seo/JsonLd';

export { generateMetadata };

type Props = {
  params: Promise<{
    code: string;
    id: string;
  }>;
};

interface ArticleRow extends RowDataPacket {
  code: string;
  title: string;
  created_at: string;
  company_name: string;
}

const ArticleDetailPage = async ({ params }: Props) => {
  const { code, id } = await params;
  let article: ArticleRow | null = null;

  try {
    const db = Database.getInstance();
    const [row] = await db.select<ArticleRow>(
      `
      SELECT pc.code, p.title, p.created_at, c.name AS company_name
      FROM post p
      INNER JOIN post_code pc ON p.id = pc.post_id
      LEFT JOIN company c ON pc.code = c.code
      WHERE p.id = ? AND p.accept > 0
      LIMIT 1
      `,
      [id]
    );

    article = row || null;
  } catch (error) {
    console.error('Failed to normalize article route:', error);
  }

  const canonicalCode = article?.code || null;

  if (canonicalCode && canonicalCode !== code) {
    redirect(`/stocks/${encodeURIComponent(canonicalCode)}/news/${encodeURIComponent(id)}`);
  }

  return (
    <>
      {article?.title && (
        <NewsArticleJsonLd
          headline={article.title}
          datePublished={new Date(article.created_at).toISOString()}
          url={`https://kabu-ai.jp/stocks/${code}/news/${id}`}
          companyName={article.company_name || ''}
        />
      )}
      <ArticleDetailClient code={code} id={id} />
    </>
  );
};

export default ArticleDetailPage;
