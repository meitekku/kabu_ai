'use client';

import { useState, useCallback } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AgentChatInterface } from '@/components/agent-chat/AgentChatInterface';
import { ChatHistoryDrawer } from '@/components/common/ChatHistoryDrawer';
import { useAuth } from '@/components/auth/AuthProvider';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Bot, Crown, Loader2 } from 'lucide-react';
import Link from 'next/link';

const ADMIN_EMAIL = 'smartaiinvest@gmail.com';

function AgentPlanRequired() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0a0a0f]">
      <div className="max-w-md mx-auto px-6 py-12 text-center">
        <div className="inline-flex p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-6">
          <Bot className="w-10 h-10 text-amber-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">AI Agent はエージェントプラン限定です</h1>
        <p className="text-slate-400 mb-8 leading-relaxed">
          AI Agentによる高度な投資分析を利用するには、エージェントプラン（月額5,000円）へのご登録が必要です。
        </p>
        <div className="flex flex-col gap-3">
          <Link href="/settings/billing?plan=agent">
            <Button className="w-full h-12 font-bold bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl">
              <Crown className="w-4 h-4 mr-2" />
              エージェントプランに登録する
            </Button>
          </Link>
          <Link href="/premium">
            <Button variant="outline" className="w-full h-10 text-slate-400 border-slate-700 hover:bg-slate-800">
              プランの詳細を見る
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AgentChatPage() {
  const [chatId, setChatId] = useState<string | undefined>();
  const [chatKey, setChatKey] = useState(0);
  const [initialMessages, setInitialMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const { user } = useAuth();
  const { plan, isLoading: subLoading } = useSubscription();

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

  return (
    <ProtectedRoute>
      {subLoading ? (
        <div className="flex items-center justify-center min-h-screen bg-[#0a0a0f]">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      ) : !hasAgentAccess ? (
        <AgentPlanRequired />
      ) : (
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
      )}
    </ProtectedRoute>
  );
}
