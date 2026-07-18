#!/usr/bin/env node
// /admin/accept_ai の承認キューにダミーのテスト投稿を追加する（連続投稿/一括投稿の動作確認用）。
// 実行例: node .claude/skills/kabu-renzokutoukou-test/references/insert_dummy_posts.js 3
//   引数: 追加するダミー投稿の件数（省略時は 1件）
//
// 前提: リポジトリ直下に .env.local（DB_HOST/DB_USER/DB_PASSWORD/DB_NAME/DB_PORT）が必要。
// 本番DBに直接 INSERT するため、実行前に必ずユーザーへ確認すること。
const fs = require('fs');
const path = require('path');
const mysql = require(path.join(process.cwd(), 'node_modules', 'mysql2', 'promise'));

function loadEnvLocal(file) {
  const content = fs.readFileSync(file, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

// company テーブルに実在する銘柄コードを使うこと（post_code の紐付け先として必要）。
const CODES = ['7203', '6758', '9984', '8306', '4063'];

async function main() {
  loadEnvLocal(path.join(process.cwd(), '.env.local'));

  const count = Math.max(1, parseInt(process.argv[2] || '1', 10));
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '3306'),
    timezone: '+09:00',
  });

  const site = 70; // accept_ai キューに乗る通常記事のsite値（72/80/81は除外対象なので使わない）
  const accept = 0;
  const inserted = [];

  for (let i = 0; i < count; i += 1) {
    const n = i + 1;
    const code = CODES[i % CODES.length];
    const title = `【テスト投稿${n}】連続投稿機能テスト（ダミーデータ）`;
    // 本文にハッシュタグを含めると候補ドロップダウンの残留バグを誘発しやすいので
    // 動作確認用途以外では付けない（post_via_session.py 側で Escape 対応済み）。
    const content = `これは連続投稿(batch posting)機能の動作確認用テスト投稿${n}です。実データではありません。`;

    const [postResult] = await pool.execute(
      'INSERT INTO post (title, content, site, accept, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
      [title, content, site, accept]
    );
    const postId = postResult.insertId;
    await pool.execute('INSERT INTO post_code (post_id, code) VALUES (?, ?)', [postId, code]);
    inserted.push({ postId, title, code });
  }

  console.log(JSON.stringify({ success: true, inserted }, null, 2));
  await pool.end();
}

main().catch((err) => {
  console.error(JSON.stringify({ success: false, error: err.message }));
  process.exit(1);
});
