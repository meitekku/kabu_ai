'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquarePlus, Trash2, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface Chat {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface ChatHistoryDrawerProps {
  apiBasePath: string;
  selectedChatId?: string;
  onSelectChat: (chatId: string, messages: Array<{ role: 'user' | 'assistant'; content: string }>) => void;
  onNewChat: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  refreshKey?: number;
}

export function ChatHistoryDrawer({
  apiBasePath,
  selectedChatId,
  onSelectChat,
  onNewChat,
  open,
  onOpenChange,
  refreshKey,
}: ChatHistoryDrawerProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchChats = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${apiBasePath}/history`);
      const data = await response.json();
      setChats(data.chats || []);
    } catch (error) {
      console.error('Failed to fetch chats:', error);
    } finally {
      setIsLoading(false);
    }
  }, [apiBasePath]);

  useEffect(() => {
    if (open) {
      fetchChats();
    }
  }, [open, fetchChats, refreshKey]);

  const handleSelectChat = async (chatId: string) => {
    try {
      const response = await fetch(`${apiBasePath}/history?chatId=${chatId}`);
      const data = await response.json();
      const messages = (data.messages || []).map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));
      onSelectChat(chatId, messages);
    } catch (error) {
      console.error('Failed to fetch chat messages:', error);
    }
  };

  const handleDelete = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('このチャットを削除しますか？')) return;

    try {
      await fetch(`${apiBasePath}/history?chatId=${chatId}`, { method: 'DELETE' });
      setChats((prev) => prev.filter((chat) => chat.id !== chatId));
      if (selectedChatId === chatId) {
        onNewChat();
      }
    } catch (error) {
      console.error('Failed to delete chat:', error);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-80 p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle>チャット履歴</SheetTitle>
        </SheetHeader>

        <div className="p-3 border-b">
          <Button onClick={onNewChat} className="w-full" variant="outline">
            <MessageSquarePlus className="w-4 h-4 mr-2" />
            新しいチャット
          </Button>
        </div>

        <ScrollArea className="h-[calc(100vh-140px)]">
          <div className="p-2 space-y-1">
            {isLoading ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                読み込み中...
              </div>
            ) : chats.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                チャット履歴がありません
              </div>
            ) : (
              chats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => handleSelectChat(chat.id)}
                  className={cn(
                    'group flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-muted transition-colors',
                    selectedChatId === chat.id && 'bg-muted',
                  )}
                >
                  <MessageSquare className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{chat.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(chat.createdAt), 'M/d HH:mm', { locale: ja })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handleDelete(chat.id, e)}
                  >
                    <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
