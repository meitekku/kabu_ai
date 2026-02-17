-- チャット利用ログテーブル
-- 非プレミアムユーザーの利用制限管理と質問内容の記録用

CREATE TABLE IF NOT EXISTS chat_usage_log (
  id VARCHAR(36) PRIMARY KEY,
  fingerprint VARCHAR(64) NULL,              -- ブラウザフィンガープリント
  ip_address VARCHAR(45) NOT NULL,           -- IPv4/IPv6対応
  user_id VARCHAR(36) NULL,                   -- ログインユーザーの場合はuser.id
  chat_id VARCHAR(36) NULL,                   -- chatbot_chat.id への参照
  question TEXT NOT NULL,                     -- 質問内容
  is_premium BOOLEAN DEFAULT FALSE,           -- プレミアム会員かどうか
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_fingerprint (fingerprint),
  INDEX idx_ip_address (ip_address),
  INDEX idx_user_id (user_id),
  INDEX idx_chat_id (chat_id),
  INDEX idx_created_at (created_at),
  INDEX idx_ip_created (ip_address, created_at),      -- IP別の利用回数カウント用
  INDEX idx_fp_created (fingerprint, created_at)      -- フィンガープリント別の利用回数カウント用
);

-- 日別のIP利用回数を効率的に取得するためのビュー（オプション）
-- CREATE VIEW chat_usage_daily AS
-- SELECT
--   ip_address,
--   DATE(created_at) as usage_date,
--   COUNT(*) as usage_count
-- FROM chat_usage_log
-- WHERE is_premium = FALSE
-- GROUP BY ip_address, DATE(created_at);
