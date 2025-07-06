import { NextResponse, NextRequest } from 'next/server';
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string; id: string }> }
): Promise<NextResponse> {
  try {
    const db = Database.getInstance();
    const { id } = await params;

    const query = `
      SELECT 
        n.id,
        n.code,
        n.title,
        REPLACE(n.content, '\n', '\\n') as content,
        n.created_at,
        c.name as company_name
      FROM post n
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

    // Keep the date as ISO string for consistent formatting
    article.created_at = new Date(article.created_at).toISOString();

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