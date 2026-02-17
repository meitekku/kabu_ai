import { Database } from '../lib/database/Mysql';

interface CountRow {
  count: number;
}

async function createChatUsageLogTable() {
  const db = Database.getInstance();

  try {
    console.log('Creating chat_usage_log table...');

    await db.insert(`
      CREATE TABLE IF NOT EXISTS chat_usage_log (
        id VARCHAR(36) PRIMARY KEY,
        fingerprint VARCHAR(64) NULL,
        ip_address VARCHAR(45) NOT NULL,
        user_id VARCHAR(36) NULL,
        chat_id VARCHAR(36) NULL,
        question TEXT NOT NULL,
        is_premium BOOLEAN DEFAULT FALSE,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_fingerprint (fingerprint),
        INDEX idx_ip_address (ip_address),
        INDEX idx_user_id (user_id),
        INDEX idx_chat_id (chat_id),
        INDEX idx_created_at (created_at),
        INDEX idx_ip_created (ip_address, created_at),
        INDEX idx_fp_created (fingerprint, created_at)
      )
    `, []);

    const [fingerprintColumn] = await db.select<CountRow>(
      `SELECT COUNT(*) AS count
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'chat_usage_log'
       AND COLUMN_NAME = 'fingerprint'`
    );

    if ((fingerprintColumn?.count || 0) === 0) {
      await db.insert(
        'ALTER TABLE chat_usage_log ADD COLUMN fingerprint VARCHAR(64) NULL AFTER id',
        []
      );
    }

    const [fingerprintIndex] = await db.select<CountRow>(
      `SELECT COUNT(*) AS count
       FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'chat_usage_log'
       AND INDEX_NAME = 'idx_fingerprint'`
    );

    if ((fingerprintIndex?.count || 0) === 0) {
      await db.insert(
        'CREATE INDEX idx_fingerprint ON chat_usage_log (fingerprint)',
        []
      );
    }

    const [fingerprintDateIndex] = await db.select<CountRow>(
      `SELECT COUNT(*) AS count
       FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'chat_usage_log'
       AND INDEX_NAME = 'idx_fp_created'`
    );

    if ((fingerprintDateIndex?.count || 0) === 0) {
      await db.insert(
        'CREATE INDEX idx_fp_created ON chat_usage_log (fingerprint, created_at)',
        []
      );
    }

    console.log('chat_usage_log table created successfully!');
  } catch (error) {
    console.error('Error creating table:', error);
  } finally {
    process.exit(0);
  }
}

createChatUsageLogTable();
