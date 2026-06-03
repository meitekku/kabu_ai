-- prediction_usage_log: 予測機能の利用ログ
CREATE TABLE IF NOT EXISTS prediction_usage_log (
  id VARCHAR(36) PRIMARY KEY,
  fingerprint VARCHAR(64) NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  user_id VARCHAR(36) NULL,
  code VARCHAR(10) NOT NULL,
  is_premium BOOLEAN DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_fingerprint (fingerprint),
  INDEX idx_ip_address (ip_address),
  INDEX idx_user_id (user_id),
  INDEX idx_code (code),
  INDEX idx_created_at (created_at)
);

-- prediction_cache: 予測結果のキャッシュ（日次）
CREATE TABLE IF NOT EXISTS prediction_cache (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(10) NOT NULL,
  prediction_date DATE NOT NULL,
  report_html TEXT NOT NULL,
  prediction_data JSON NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_code_date (code, prediction_date),
  INDEX idx_code (code),
  INDEX idx_prediction_date (prediction_date)
);
