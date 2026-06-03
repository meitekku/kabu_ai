-- Yahoo掲示板 1時間ごとの投稿数集計テーブル
-- スパイク検知のための時系列データを保存する

CREATE TABLE IF NOT EXISTS yahoo_post_count_hourly (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(10) NOT NULL,
  hour_key VARCHAR(13) NOT NULL,        -- 'YYYY-MM-DD HH' 形式 例: '2025-02-27 14'
  post_count INT DEFAULT 0,             -- 当該1時間の投稿数
  prev_avg_count DECIMAL(10,2) DEFAULT 0, -- 直近3時間の平均投稿数
  change_rate DECIMAL(10,2) DEFAULT 0,  -- 変化率 (%) 前比
  spike_detected TINYINT DEFAULT 0,     -- スパイク検知フラグ (1=スパイクあり)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_code (code),
  INDEX idx_hour_key (hour_key),
  INDEX idx_spike (spike_detected),
  UNIQUE KEY uk_code_hour (code, hour_key)
);
