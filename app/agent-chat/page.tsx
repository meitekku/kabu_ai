'use client';

import { useState, useCallback } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AgentChatInterface } from '@/components/agent-chat/AgentChatInterface';
import { ChatHistoryDrawer } from '@/components/common/ChatHistoryDrawer';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Bot, Crown, Loader2 } from 'lucide-react';
import Link from 'next/link';

const ADMIN_EMAIL = 'smartaiinvest@gmail.com';

function AgentPlanRequired() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="max-w-md text-center space-y-6 p-8">
        <div className="inline-flex p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
          <Bot className="w-10 h-10 text-amber-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">エージェントプラン限定</h2>
        <p className="text-slate-500">
          AI Agentは、エージェントプラン（月額5,000円）にご加入いただくとご利用いただけます。
        </p>
        <Link href="/premium#plans">
          <Button className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold">
            <Crown className="w-4 h-4 mr-2" />
            プランを確認する
          </Button>
        </Link>
      </div>
    </div>
  );
}

function AgentChatContent() {
  const [chatId, setChatId] = useState<string | undefined>();
  const [chatKey, setChatKey] = useState(0);
  const [initialMessages, setInitialMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const { plan, isLoading: subLoading } = useSubscription();
  const { user } = useAuth();

  const isAdmin = user?.email === ADMIN_EMAIL;
  const hasAgentAccess = plan === 'agent' || isAdmin;

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

  if (subLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!hasAgentAccess) {
    return <AgentPlanRequired />;
  }

  return (
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
  );
}

export default function AgentChatPage() {
  return (
    <ProtectedRoute>
      <AgentChatContent />
    </ProtectedRoute>
  );
}
