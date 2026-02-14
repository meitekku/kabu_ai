-- PER/PBR バリュエーションレポートテーブル
CREATE TABLE IF NOT EXISTS valuation_report (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(10) NOT NULL,
  per DECIMAL(10,2) NULL,
  pbr DECIMAL(10,2) NULL,
  industry_avg_per DECIMAL(10,2) NULL,
  industry_avg_pbr DECIMAL(10,2) NULL,
  per_evaluation VARCHAR(20) NOT NULL DEFAULT 'neutral',
  pbr_evaluation VARCHAR(20) NOT NULL DEFAULT 'neutral',
  report_content TEXT NOT NULL,
  report_type ENUM('weekly', 'settlement') DEFAULT 'weekly',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_code (code),
  INDEX idx_created_at (created_at),
  INDEX idx_code_created (code, created_at)
);
