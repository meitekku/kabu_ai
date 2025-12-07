import mysql from 'mysql2/promise';

async function createTables() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '133.130.102.77',
    user: process.env.DB_USER || 'meiteko',
    password: process.env.DB_PASSWORD || '***REMOVED_DB_PASSWORD***',
    database: process.env.DB_NAME || 'kabu_ai',
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
