CREATE TABLE IF NOT EXISTS top_carousel (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slot TINYINT NOT NULL,
  title VARCHAR(255) NOT NULL,
  subtitle TEXT,
  badge_label VARCHAR(50),
  theme ENUM('bull','bear','neutral','flash') NOT NULL DEFAULT 'neutral',
  link_url VARCHAR(500),
  stock_code VARCHAR(10),
  report_type ENUM('midday','closing') NOT NULL,
  generated_at DATETIME NOT NULL,
  INDEX idx_generated_at (generated_at)
);
