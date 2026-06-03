import mysql from 'mysql2/promise';

async function createTables() {
  const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
  if (!DB_HOST || !DB_USER || !DB_PASSWORD || !DB_NAME) {
    throw new Error('DB_HOST / DB_USER / DB_PASSWORD / DB_NAME must be set');
  }
  const connection = await mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    port: parseInt(process.env.DB_PORT || '3306'),
  });

  try {
    // チャットセッションテーブル
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS chatbot_chat (
        id VARCHAR(36) PRIMARY KEY,
        userId VARCHAR(36) NOT NULL,
        title TEXT NOT NULL,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_userId (userId),
        INDEX idx_createdAt (createdAt)
      )
    `);
    console.log('✅ chatbot_chat table created');

    // メッセージテーブル
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS chatbot_message (
        id VARCHAR(36) PRIMARY KEY,
        chatId VARCHAR(36) NOT NULL,
        role VARCHAR(20) NOT NULL,
        content TEXT NOT NULL,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_chatId (chatId),
        INDEX idx_createdAt (createdAt),
        FOREIGN KEY (chatId) REFERENCES chatbot_chat(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ chatbot_message table created');

    console.log('✅ All tables created successfully!');
  } catch (error) {
    console.error('❌ Error creating tables:', error);
  } finally {
    await connection.end();
  }
}

createTables();
