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
    const { num } = await request.json();

    if (!num || typeof num !== 'number' || num <= 0) {
      return NextResponse.json(
        { status: 'error', message: 'Valid number is required' },
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
      ORDER BY created_at DESC
      LIMIT ?
    `;

    const posts = await db.select<PostRow>(query, [num]);

    return NextResponse.json({
      status: 'success',
      data: posts
    });

  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}