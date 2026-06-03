-- Agent Chat テーブル
-- エージェントチームによるAIチャット用

CREATE TABLE IF NOT EXISTS agent_chat (
  id VARCHAR(36) PRIMARY KEY,
  userId VARCHAR(36) NOT NULL,
  title TEXT NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_userId (userId),
  INDEX idx_createdAt (createdAt)
);

CREATE TABLE IF NOT EXISTS agent_chat_message (
  id VARCHAR(36) PRIMARY KEY,
  chatId VARCHAR(36) NOT NULL,
  role VARCHAR(20) NOT NULL COMMENT 'user or assistant',
  content MEDIUMTEXT NOT NULL,
  metadata JSON NULL COMMENT 'エージェント処理メタデータ（使用ツール等）',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_chatId (chatId),
  INDEX idx_createdAt (createdAt),
  FOREIGN KEY (chatId) REFERENCES agent_chat(id) ON DELETE CASCADE
);
