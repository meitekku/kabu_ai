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

// 株式関連テーブルのホワイトリスト
const ALLOWED_TABLES = new Set([
  'company', 'company_info', 'price',
  'material', 'material_summary',
  'post', 'post_code',
  'kabutan_annual_results', 'kabutan_quarterly_results', 'kabutan_peak_performance',
  'performance_annual', 'performance_quarterly',
  'valuation_report',
  'ranking_up', 'ranking_low', 'ranking_stop_high', 'ranking_stop_low',
  'ranking_trading_value', 'ranking_yahoo_post', 'ranking_access',
  'ranking_pts_up', 'ranking_pts_down',
  'pts_price',
  'relative_stock', 'ir', 'bbs_data',
  'category', 'category_score',
  'stock_split_log',
]);

// SELECT/DESCRIBE のみ許可 + テーブルホワイトリスト
function validateSql(sql) {
  const normalized = sql.trim().toLowerCase().replace(/`/g, '');
  if (
    !normalized.startsWith('select') &&
    !normalized.startsWith('describe')
  ) {
    return { valid: false, reason: 'SELECT/DESCRIBE以外のクエリは実行できません' };
  }
  const forbidden = [
    'insert ', 'update ', 'delete ', 'drop ', 'alter ',
    'create ', 'truncate ', 'grant ', 'revoke ',
  ];
  for (const kw of forbidden) {
    if (normalized.includes(kw)) {
      return { valid: false, reason: '変更系クエリは実行できません' };
    }
  }

  // DESCRIBE tablename のテーブル名チェック
  if (normalized.startsWith('describe')) {
    const tableName = normalized.split(/\s+/)[1];
    if (tableName && !ALLOWED_TABLES.has(tableName)) {
      return { valid: false, reason: `テーブル '${tableName}' へのアクセスは許可されていません（株式関連テーブルのみ参照可能）` };
    }
    return { valid: true };
  }

  // SELECT: FROM / JOIN 後のテーブル名を抽出してホワイトリストチェック
  const tablePattern = /(?:from|join)\s+(\w+)/gi;
  let match;
  while ((match = tablePattern.exec(normalized)) !== null) {
    const tableName = match[1];
    if (!ALLOWED_TABLES.has(tableName)) {
      return { valid: false, reason: `テーブル '${tableName}' へのアクセスは許可されていません（株式関連テーブルのみ参照可能）` };
    }
  }

  return { valid: true };
}

async function main() {
  const sql = process.argv.slice(2).join(' ').trim();
  if (!sql) {
    console.error('Usage: node scripts/agent-db-query.cjs "SELECT ..."');
    process.exit(1);
  }

  const validation = validateSql(sql);
  if (!validation.valid) {
    console.error(`ERROR: ${validation.reason}`);
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
