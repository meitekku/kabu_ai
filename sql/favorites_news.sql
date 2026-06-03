-- お気に入り銘柄
CREATE TABLE user_favorite (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  code VARCHAR(10) NOT NULL,
  importance TINYINT NULL DEFAULT NULL,  -- 1-5, NULL=未設定
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_code (user_id, code),
  INDEX idx_user_id (user_id),
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

-- 生成されたニュースレポート
CREATE TABLE favorite_news (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  report_type ENUM('midday', 'closing') NOT NULL,
  content MEDIUMTEXT NOT NULL,
  stock_codes JSON NOT NULL,
  generation_date DATE NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_date (user_id, generation_date),
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

-- LINE連携
CREATE TABLE user_line_link (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  line_user_id VARCHAR(64) NOT NULL,
  display_name VARCHAR(255) NULL,
  linked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_id (user_id),
  UNIQUE KEY uk_line_user_id (line_user_id),
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);
