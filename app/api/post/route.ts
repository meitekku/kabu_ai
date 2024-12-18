import { NextResponse } from 'next/server';
import { type NextRequest } from 'next/server';
import { Database } from '@/lib/database/Mysql';

interface PostRequest {
  id?: number;
  code: string;
  title: string;
  content: string;
  site?: number;
  accept?: number;
}

interface ApiResponse {
  success: boolean;
  message: string;
  data?: {
    id: number;
  };
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const body = await request.json() as PostRequest;
    const { id, code, title, content, site = 0, accept = 0 } = body;

    // 必須フィールドの検証
    if (!code || !title || !content) {
      return NextResponse.json(
        {
          success: false,
          message: 'Code, title and content are required',
        },
        { status: 400 }
      );
    }

    const db = Database.getInstance();

    if (id) {
      // Update existing record
      await db.update(
        'UPDATE post SET code = ?, title = ?, content = ?, site = ?, accept = ? WHERE id = ?',
        [code, title, content, site, accept, id]
      );

      return NextResponse.json(
        {
          success: true,
          message: 'Post updated successfully',
          data: {
            id: id
          }
        },
        { status: 200 }
      );
    } else {
      // Insert new record
      const insertId = await db.insert(
        'INSERT INTO post (code, title, content, site, accept) VALUES (?, ?, ?, ?, ?)',
        [code, title, content, site, accept]
      );

      return NextResponse.json(
        {
          success: true,
          message: 'Post created successfully',
          data: {
            id: insertId
          }
        },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error('Error saving post:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}