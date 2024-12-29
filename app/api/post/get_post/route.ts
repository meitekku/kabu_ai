import { NextResponse, NextRequest } from 'next/server';
import { Database } from '@/lib/database/Mysql';
import { RowDataPacket } from 'mysql2';

interface PostRow extends RowDataPacket {
  id: number;
  title: string;
  content: string;
  created_at: string;
}

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // リクエストボディからpost_idを取得
    const { post_id } = await request.json();

    if (!post_id) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Post ID is required'
        },
        { status: 400 }
      );
    }

    const db = Database.getInstance();
    const query = `
      SELECT 
        id,
        code,
        title,
        content,
        created_at
      FROM post
      WHERE id = ?
    `;

    const posts = await db.select<PostRow>(query, [post_id]);

    if (posts.length === 0) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Post not found'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: 'success',
      data: posts[0]
    });

  } catch (error) {
    console.error('Error fetching post:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to fetch post'
      },
      { status: 500 }
    );
  }
}