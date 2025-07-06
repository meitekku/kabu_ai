import { NextResponse } from 'next/server';
import { Database } from '@/lib/database/Mysql';

export async function POST(request: Request) {
  try {
    const { title, content, postCode } = await request.json();

    if (!title || !content || !postCode) {
      return NextResponse.json({
        success: false,
        message: 'タイトル、コンテンツ、投稿コードは必須です'
      }, { status: 400 });
    }

    const db = Database.getInstance();
    
    // ニュース要約記事をサイトに登録（site=72）
    const insertQuery = `
      INSERT INTO post (
        title,
        content,
        site,
        accept,
        pickup,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())
    `;

    const insertParams = [
      title,
      content,
      72, // ニュース要約専用サイト番号
      1, // 承認済み
      0 // 通常投稿
    ];

    const insertId = await db.insert(insertQuery, insertParams);

    // ニュース要約は特定の企業に紐づかないため、post_codeテーブルへの登録はスキップ
    // ニュース要約は site=72 で識別される

    // 生成コードを別テーブルに保存（テーブルが存在する場合）
    try {
      await db.insert(
        'INSERT INTO post_generation_code (post_id, code) VALUES (?, ?)',
        [insertId, postCode]
      );
    } catch {
      // テーブルが存在しない場合はスキップ
      console.log('post_generation_code table does not exist, skipping code storage');
    }

    return NextResponse.json({
      success: true,
      message: 'ニュースが正常に登録されました',
    });

  } catch (error) {
    console.error('Save news error:', error);
    return NextResponse.json({
      success: false,
      message: 'サーバーエラーが発生しました',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}