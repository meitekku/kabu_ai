-- サブスクリプション管理テーブル
-- usersテーブルに stripe_customer_id カラムを追加
ALTER TABLE users ADD COLUMN stripe_customer_id VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN subscription_status ENUM('none', 'active', 'canceled', 'past_due') DEFAULT 'none';
ALTER TABLE users ADD COLUMN subscription_id VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN subscription_current_period_end DATETIME NULL;

-- インデックス追加
CREATE INDEX idx_users_stripe_customer_id ON users(stripe_customer_id);
CREATE INDEX idx_users_subscription_status ON users(subscription_status);
