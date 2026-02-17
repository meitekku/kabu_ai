'use client';

import { ChatInterface } from '@/components/chat/ChatInterface';
import { useSearchParams, notFound } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';

function ChatPageContent() {
  const searchParams = useSearchParams();
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);
  const rawStockCode = searchParams.get('code');
  const stockCode =
    rawStockCode && /^[A-Za-z0-9.-]{1,10}$/.test(rawStockCode.trim())
      ? rawStockCode.trim().toUpperCase()
      : undefined;

  useEffect(() => {
    const hostname = window.location.hostname;
    const defaultAllowedHosts = new Set([
      'localhost',
      '127.0.0.1',
      'kabu-ai.jp',
      'www.kabu-ai.jp',
    ]);
    const envAllowedHosts =
      process.env.NEXT_PUBLIC_CHAT_ALLOWED_HOSTS?.split(',')
        .map((host) => host.trim())
        .filter(Boolean) ?? [];
    const isAllowedHost =
      defaultAllowedHosts.has(hostname) || envAllowedHosts.includes(hostname);
    const hasTestParam = searchParams.get('test') === '1';
    setIsAllowed(isAllowedHost || hasTestParam);
  }, [searchParams]);

  // 判定中はローディング表示
  if (isAllowed === null) {
    return (
      <div className="h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-emerald-500 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  // 許可ホストでも test=1 でもない場合は404
  if (!isAllowed) {
    notFound();
  }

  return (
    <div className="h-[calc(100vh-64px)]">
      <ChatInterface stockCode={stockCode} />
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-emerald-500 rounded-full border-t-transparent"></div>
      </div>
    }>
      <ChatPageContent />
    </Suspense>
  );
}
