'use client';

import { useState, useCallback } from 'react';
import { AdminProtectedRoute } from '@/components/auth/AdminProtectedRoute';
import { AgentChatInterface } from '@/components/agent-chat/AgentChatInterface';
import { AgentChatSidebar } from '@/components/agent-chat/AgentChatSidebar';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface MessageRow {
  role: string;
  content: string;
}

export default function AgentChatPage() {
  const [selectedChatId, setSelectedChatId] = useState<string | undefined>();
  const [initialMessages, setInitialMessages] = useState<ChatMessage[]>([]);
  const [chatKey, setChatKey] = useState(0);
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);

  const handleSelectChat = useCallback(async (chatId: string | null) => {
    if (!chatId) {
      setSelectedChatId(undefined);
      setInitialMessages([]);
      setChatKey((k) => k + 1);
      return;
    }

    try {
      const response = await fetch(`/api/agent-chat/history?chatId=${chatId}`);
      if (!response.ok) return;
      const data = (await response.json()) as { messages?: MessageRow[] };
      const messages: ChatMessage[] = (data.messages || [])
        .filter((m: MessageRow) => m.role === 'user' || m.role === 'assistant')
        .map((m: MessageRow) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

      setSelectedChatId(chatId);
      setInitialMessages(messages);
      setChatKey((k) => k + 1);
    } catch (error) {
      console.error('Failed to load chat:', error);
    }
  }, []);

  const handleNewChat = useCallback(() => {
    setSelectedChatId(undefined);
    setInitialMessages([]);
    setChatKey((k) => k + 1);
  }, []);

  const handleChatCreated = useCallback(() => {
    setSidebarRefreshKey((k) => k + 1);
  }, []);

  return (
    <AdminProtectedRoute>
      <div className="flex h-[calc(100vh-64px)]">
        <AgentChatSidebar
          selectedChatId={selectedChatId}
          onSelectChat={handleSelectChat}
          onNewChat={handleNewChat}
          refreshKey={sidebarRefreshKey}
        />
        <div className="flex-1">
          <AgentChatInterface
            key={chatKey}
            chatId={selectedChatId}
            initialMessages={initialMessages}
            onChatCreated={handleChatCreated}
          />
        </div>
      </div>
    </AdminProtectedRoute>
  );
}
