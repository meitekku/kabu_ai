-- チャットボット用テーブル

-- チャットセッションテーブル
CREATE TABLE IF NOT EXISTS chatbot_chat (
  id VARCHAR(36) PRIMARY KEY,
  userId VARCHAR(36) NOT NULL,
  title TEXT NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_userId (userId),
  INDEX idx_createdAt (createdAt)
);

-- メッセージテーブル
CREATE TABLE IF NOT EXISTS chatbot_message (
  id VARCHAR(36) PRIMARY KEY,
  chatId VARCHAR(36) NOT NULL,
  role VARCHAR(20) NOT NULL,  -- 'user' or 'assistant'
  content TEXT NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_chatId (chatId),
  INDEX idx_createdAt (createdAt),
  FOREIGN KEY (chatId) REFERENCES chatbot_chat(id) ON DELETE CASCADE
);
