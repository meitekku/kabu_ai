import { ChatInterface } from '@/components/chat/ChatInterface';
import { notFound } from 'next/navigation';

type ChatPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

function normalizeStockCode(raw: string | string[] | undefined): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  if (!/^[A-Z0-9.-]{1,10}$/.test(normalized)) {
    return null;
  }

  return normalized;
}

export default async function ChatPage({ searchParams }: ChatPageProps) {
  const params = await searchParams;
  const stockCode = normalizeStockCode(params.code);

  // /chat 単体アクセスは無効化し、銘柄コード付きURLのみ許可
  if (!stockCode) {
    notFound();
  }

  return (
    <div className="h-[calc(100vh-64px)]">
      <ChatInterface stockCode={stockCode} />
    </div>
  );
}
