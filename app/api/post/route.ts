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

// POST handler for creating new posts
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const body = await request.json() as PostRequest;
    const { code, title, content, site = 0, accept = 0 } = body;

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
  } catch (error) {
    console.error('Error creating post:', error);
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

// PUT handler for updating existing posts
export async function PUT(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const body = await request.json() as PostRequest;
    const { id, code, title, content, site = 0, accept = 0 } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: 'ID is required for updating a post',
        },
        { status: 400 }
      );
    }

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

    const affectedRows = await db.update(
      'UPDATE post SET code = ?, title = ?, content = ?, site = ?, accept = ? WHERE id = ?',
      [code, title, content, site, accept, id]
    );

    if (affectedRows === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Post not found or no changes made',
        },
        { status: 404 }
      );
    }

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
  } catch (error) {
    console.error('Error updating post:', error);
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

// DELETE handler for deleting posts
export async function DELETE(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const body = await request.json() as PostRequest;
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: 'ID is required for deleting a post',
        },
        { status: 400 }
      );
    }

    const db = Database.getInstance();

    const affectedRows = await db.delete(
      'DELETE FROM post WHERE id = ?',
      [id]
    );

    if (affectedRows === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Post not found or already deleted',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Post deleted successfully',
        data: {
          id: id
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting post:', error);
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