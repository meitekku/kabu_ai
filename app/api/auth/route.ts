// src/app/api/auth/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/database/Mysql';
import { RowDataPacket } from 'mysql2';

// インターフェース定義
interface BaseRecord {
  id: number;
  created_at: Date;
  updated_at?: Date;
}

interface UserRow extends BaseRecord, RowDataPacket {
  username: string;
  password: string;
}

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    
    // Database インスタンスの取得
    const db = Database.getInstance();
    console.log([username, password]);
    
    // ユーザー認証のクエリ実行
    const users = await db.select<UserRow>(
      'SELECT * FROM users WHERE username = ? AND password = ?',
      [username, password]
    );
    
    if (users.length > 0) {
      const response = NextResponse.json({ 
        success: true, 
        username 
      });
      
      // クッキーの設定
      response.cookies.set('username', username, { 
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 365 * 24 * 60 * 60 // 1年
      });
      
      return response;
    } else {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' }, 
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal Server Error' 
      }, 
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const username = req.cookies.get('username');
  
  return NextResponse.json({ 
    isAuthenticated: !!username,
    username: username?.value 
  });
}