import { NextResponse } from 'next/server';
import { Database } from '@/lib/database/Mysql';
import { RowDataPacket } from 'mysql2';

interface ArticleRow extends RowDataPacket {
  id: number;
  code: string;
  title: string;
  content: string;
  created_at: string;
  company_name: string;
}

// The route segment config tells Next.js this is a dynamic route
export const dynamic = 'force-dynamic';
export async function GET(
  request: Request,
  { params }: { params: { code: string; id: string } }
) {
  try {
    const db = Database.getInstance();
    const { id } = params;

    const query = `
      SELECT 
        n.id,
        n.code,
        n.title,
        REPLACE(n.content, '\n', '\\n') as content,
        n.created_at,
        c.name as company_name
      FROM news_ai n
      LEFT JOIN company c ON n.code = c.code
      WHERE n.id = ?
    `;

    const articles = await db.select<ArticleRow>(query, [id]);

    if (articles.length === 0) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Article not found'
        },
        { status: 404 }
      );
    }

    // Restore newlines in the content
    const article = articles[0];
    article.content = article.content.replace(/\\n/g, '\n');

    return NextResponse.json({
      status: 'success',
      data: article
    });
  } catch (error) {
    console.error('Error fetching article:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to fetch article'
      },
      { status: 500 }
    );
  }
}