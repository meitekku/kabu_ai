import { Database } from '../lib/database/Mysql';

async function createChatUsageLogTable() {
  const db = Database.getInstance();

  try {
    console.log('Creating chat_usage_log table...');

    await db.insert(`
      CREATE TABLE IF NOT EXISTS chat_usage_log (
        id VARCHAR(36) PRIMARY KEY,
        ip_address VARCHAR(45) NOT NULL,
        user_id VARCHAR(36) NULL,
        chat_id VARCHAR(36) NULL,
        question TEXT NOT NULL,
        is_premium BOOLEAN DEFAULT FALSE,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_ip_address (ip_address),
        INDEX idx_user_id (user_id),
        INDEX idx_chat_id (chat_id),
        INDEX idx_created_at (created_at),
        INDEX idx_ip_created (ip_address, created_at)
      )
    `, []);

    console.log('chat_usage_log table created successfully!');
  } catch (error) {
    console.error('Error creating table:', error);
  } finally {
    process.exit(0);
  }
}

createChatUsageLogTable();
