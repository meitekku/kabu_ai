-- Stripe → fincode マイグレーション
-- stripe_customer_id を fincode_customer_id にリネーム
ALTER TABLE user CHANGE COLUMN stripe_customer_id fincode_customer_id VARCHAR(255) NULL;

-- カード登録とサブスクリプション作成の間に保持する仮プランカラムを追加
ALTER TABLE user ADD COLUMN subscription_plan_pending VARCHAR(10) NULL;

-- インデックス更新
DROP INDEX IF EXISTS idx_users_stripe_customer_id ON user;
CREATE INDEX idx_users_fincode_customer_id ON user(fincode_customer_id);
