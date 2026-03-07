CREATE TABLE IF NOT EXISTS pts_line_notify_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(10) NOT NULL,
  post_id INT NOT NULL,
  notify_date DATE NOT NULL,
  notified_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_count INT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_code_date (code, notify_date),
  INDEX idx_notify_date (notify_date)
);
