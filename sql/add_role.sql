-- userテーブルにroleカラム追加
ALTER TABLE user ADD COLUMN IF NOT EXISTS role ENUM('user', 'admin') NOT NULL DEFAULT 'user';
CREATE INDEX IF NOT EXISTS idx_user_role ON user (role);
