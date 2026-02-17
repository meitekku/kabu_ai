import { generateMetadata } from './metadata';
import ArticleDetailClient from './ArticleDetailClient';
import { Database } from '@/lib/database/Mysql';
import { RowDataPacket } from 'mysql2';
import { redirect } from 'next/navigation';

export { generateMetadata };

type Props = {
  params: Promise<{
    code: string;
    id: string;
  }>;
};

interface ArticleCodeRow extends RowDataPacket {
  code: string;
}

const ArticleDetailPage = async ({ params }: Props) => {
  const { code, id } = await params;
  let canonicalCode: string | null = null;

  try {
    const db = Database.getInstance();
    const [article] = await db.select<ArticleCodeRow>(
      `
      SELECT pc.code
      FROM post p
      INNER JOIN post_code pc ON p.id = pc.post_id
      WHERE p.id = ? AND p.accept > 0
      LIMIT 1
      `,
      [id]
    );

    canonicalCode = article?.code || null;
  } catch (error) {
    console.error('Failed to normalize article route:', error);
  }

  if (canonicalCode && canonicalCode !== code) {
    redirect(`/stocks/${encodeURIComponent(canonicalCode)}/news/${encodeURIComponent(id)}`);
  }

  return <ArticleDetailClient code={code} id={id} />;
};

export default ArticleDetailPage;
