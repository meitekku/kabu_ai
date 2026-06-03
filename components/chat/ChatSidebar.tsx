'use client';

import { useState, useEffect } from 'react';
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

interface ChatSidebarProps {
  selectedChatId?: string;
  onSelectChat: (chatId: string | null) => void;
  onNewChat: () => void;
}

export function ChatSidebar({ selectedChatId, onSelectChat, onNewChat }: ChatSidebarProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchChats = async () => {
    try {
      const response = await fetch('/api/chat/history');
      const data = await response.json();
      setChats(data.chats || []);
    } catch (error) {
      console.error('Failed to fetch chats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChats();
  }, []);

  const handleDelete = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('このチャットを削除しますか？')) return;

    try {
      await fetch(`/api/chat/history?chatId=${chatId}`, { method: 'DELETE' });
      setChats(chats.filter((chat) => chat.id !== chatId));
      if (selectedChatId === chatId) {
        onNewChat();
      }
    } catch (error) {
      console.error('Failed to delete chat:', error);
    }
  };

  return (
    <div className="w-64 border-r bg-muted/30 flex flex-col h-full">
      <div className="p-4 border-b">
        <Button onClick={onNewChat} className="w-full" variant="outline">
          <MessageSquarePlus className="w-4 h-4 mr-2" />
          新しいチャット
        </Button>
      </div>

      <ScrollArea className="flex-1">
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
                onClick={() => onSelectChat(chat.id)}
                className={cn(
                  'group flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-muted transition-colors',
                  selectedChatId === chat.id && 'bg-muted'
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
    </div>
  );
}
