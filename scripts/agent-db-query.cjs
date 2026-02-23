#!/usr/bin/env node
/**
 * Agent Chat用 DB読み取り専用ヘルパー
 * Claude Code (Agent SDK) からBashツール経由で呼び出される
 *
 * Usage: node scripts/agent-db-query.cjs "SELECT * FROM company LIMIT 5"
 */

const fs = require('fs');
const path = require('path');

// .env.local から DB接続情報を読み取り
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('ERROR: .env.local not found');
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, 'utf8');
  const vars = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    vars[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
  }
  return vars;
}

// SELECT/SHOW/DESCRIBE のみ許可
function validateSql(sql) {
  const normalized = sql.trim().toLowerCase();
  if (
    !normalized.startsWith('select') &&
    !normalized.startsWith('show') &&
    !normalized.startsWith('describe')
  ) {
    return false;
  }
  const forbidden = [
    'insert ', 'update ', 'delete ', 'drop ', 'alter ',
    'create ', 'truncate ', 'grant ', 'revoke ',
  ];
  for (const kw of forbidden) {
    if (normalized.includes(kw)) return false;
  }
  return true;
}

async function main() {
  const sql = process.argv.slice(2).join(' ').trim();
  if (!sql) {
    console.error('Usage: node scripts/agent-db-query.cjs "SELECT ..."');
    process.exit(1);
  }

  if (!validateSql(sql)) {
    console.error('ERROR: SELECT/SHOW/DESCRIBE以外のクエリは実行できません');
    process.exit(1);
  }

  const env = loadEnv();
  const mysql = require('mysql2/promise');

  const conn = await mysql.createConnection({
    host: env.DB_HOST,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    port: parseInt(env.DB_PORT || '3306', 10),
    connectTimeout: 5000,
  });

  try {
    const [rows] = await conn.execute(sql);
    const arr = Array.isArray(rows) ? rows : [];
    if (arr.length === 0) {
      console.log('結果: 0件');
    } else if (arr.length > 50) {
      console.log(`結果: ${arr.length}件中50件表示`);
      console.log(JSON.stringify(arr.slice(0, 50), null, 2));
    } else {
      console.log(`結果: ${arr.length}件`);
      console.log(JSON.stringify(arr, null, 2));
    }
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error('DB ERROR:', e.message);
  process.exit(1);
});
