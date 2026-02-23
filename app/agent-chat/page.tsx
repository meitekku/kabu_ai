'use client';

import { useState, useCallback } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AgentChatInterface } from '@/components/agent-chat/AgentChatInterface';
import { ChatHistoryDrawer } from '@/components/common/ChatHistoryDrawer';

export default function AgentChatPage() {
  const [chatId, setChatId] = useState<string | undefined>();
  const [chatKey, setChatKey] = useState(0);
  const [initialMessages, setInitialMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  const handleChatCreated = useCallback((newChatId: string) => {
    setChatId(newChatId);
  }, []);

  const handleNewChat = useCallback(() => {
    setChatId(undefined);
    setInitialMessages([]);
    setChatKey((k) => k + 1);
    setHistoryOpen(false);
  }, []);

  const handleSelectChat = useCallback(
    (selectedChatId: string, messages: Array<{ role: 'user' | 'assistant'; content: string }>) => {
      setChatId(selectedChatId);
      setInitialMessages(messages);
      setChatKey((k) => k + 1);
      setHistoryOpen(false);
    },
    [],
  );

  return (
    <ProtectedRoute>
      <div className="h-full">
        <AgentChatInterface
          key={chatKey}
          chatId={chatId}
          initialMessages={initialMessages}
          onChatCreated={handleChatCreated}
          onNewChat={handleNewChat}
          onOpenHistory={() => setHistoryOpen(true)}
        />
        <ChatHistoryDrawer
          apiBasePath="/api/agent-chat"
          selectedChatId={chatId}
          onSelectChat={handleSelectChat}
          onNewChat={handleNewChat}
          open={historyOpen}
          onOpenChange={setHistoryOpen}
          refreshKey={chatKey}
        />
      </div>
    </ProtectedRoute>
  );
}
