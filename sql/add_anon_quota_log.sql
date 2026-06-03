-- 匿名(未ログイン)ユーザーの AI チャット利用クオータ
-- キーは SHA256(CF-Connecting-IP + UA + Accept-Language + ANON_QUOTA_SALT) を 64hex で保存
-- 日次3メッセージ + 10秒連投ブロック判定に使う

CREATE TABLE IF NOT EXISTS anon_quota_log (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ip_hash     CHAR(64) NOT NULL,
  consumed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_iphash_consumed (ip_hash, consumed_at)
);
