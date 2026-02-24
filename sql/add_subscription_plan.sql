ALTER TABLE user ADD COLUMN subscription_plan ENUM('none', 'standard', 'agent') NOT NULL DEFAULT 'none' AFTER subscription_status;
