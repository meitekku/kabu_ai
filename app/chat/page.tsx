'use client';

import { ChatInterface } from '@/components/chat/ChatInterface';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';

export default function ChatPage() {
  const searchParams = useSearchParams();
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    const hasTestParam = searchParams.get('test') === '1';
    setIsAllowed(isLocalhost || hasTestParam);
  }, [searchParams]);

  // 判定中はローディング表示
  if (isAllowed === null) {
    return (
      <div className="h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-emerald-500 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  // 本番環境でtest=1がない場合は404
  if (!isAllowed) {
    notFound();
  }

  return (
    <div className="h-[calc(100vh-64px)]">
      <ChatInterface />
    </div>
  );
}
