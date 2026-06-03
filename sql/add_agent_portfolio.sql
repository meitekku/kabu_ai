-- ポートフォリオ組成AIエージェント 利用ログ
-- 1日3回制限（standard/agent プラン以外）の判定と多重起動防止に使う

CREATE TABLE IF NOT EXISTS agent_portfolio_usage_log (
  id           VARCHAR(36) PRIMARY KEY,
  user_id      VARCHAR(36) NOT NULL,
  session_id   VARCHAR(36) NOT NULL UNIQUE,
  started_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME NULL,
  status       ENUM('in_progress','completed','cancelled','error') NOT NULL,
  error_reason VARCHAR(255) NULL,
  INDEX idx_user_started (user_id, started_at),
  INDEX idx_status (status),
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);
