"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { UIMessage } from "ai";
import {
  type StoredChat,
  deleteChat,
  deriveTitle,
  generateChatId,
  listChats,
  migrateAnonToUser,
  readCurrentChatId,
  saveChat,
  scopeForUser,
  writeCurrentChatId,
} from "@/lib/agent/chat-history-store";

export interface UsePortfolioChatHistoryResult {
  chats: StoredChat[];
  currentChatId: string | null;
  selectChat: (id: string) => void;
  createNewChat: () => string;
  persistCurrent: (messages: UIMessage[]) => void;
  removeChat: (id: string) => void;
  // 匿名 → ログイン時に引き継いだチャット件数(0 なら通知しない)
  migratedCount: number | null;
  acknowledgeMigrated: () => void;
}

export function usePortfolioChatHistory(
  userId: string | null,
  isAuthLoading: boolean,
): UsePortfolioChatHistoryResult {
  const [scope, setScope] = useState<string | null>(null);
  const [chats, setChats] = useState<StoredChat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [migratedCount, setMigratedCount] = useState<number | null>(null);
  const prevUserIdRef = useRef<string | null>(null);

  // userId が変わったら scope を切替。匿名→ログインの遷移時に anon を移植
  useEffect(() => {
    if (isAuthLoading) return;
    const nextScope = scopeForUser(userId);

    // 匿名 → ログインへ遷移した瞬間だけ移植を試みる
    if (userId && prevUserIdRef.current !== userId) {
      const result = migrateAnonToUser(userId);
      if (result.merged > 0) {
        setMigratedCount(result.merged);
      }
    }
    prevUserIdRef.current = userId;

    setScope(nextScope);
    setChats(listChats(nextScope));
    setCurrentChatId(readCurrentChatId(nextScope));
  }, [userId, isAuthLoading]);

  const refresh = useCallback(() => {
    if (!scope) return;
    setChats(listChats(scope));
  }, [scope]);

  const selectChat = useCallback(
    (id: string) => {
      if (!scope) return;
      setCurrentChatId(id);
      writeCurrentChatId(scope, id);
    },
    [scope],
  );

  const createNewChat = useCallback(() => {
    const id = generateChatId();
    if (scope) {
      setCurrentChatId(id);
      writeCurrentChatId(scope, id);
    }
    return id;
  }, [scope]);

  const persistCurrent = useCallback(
    (messages: UIMessage[]) => {
      if (!scope) return;
      if (!messages || messages.length === 0) return;
      const id = currentChatId ?? generateChatId();
      const chat: StoredChat = {
        id,
        title: deriveTitle(messages),
        updatedAt: Date.now(),
        messages,
      };
      saveChat(scope, chat);
      if (!currentChatId) {
        setCurrentChatId(id);
        writeCurrentChatId(scope, id);
      }
      refresh();
    },
    [scope, currentChatId, refresh],
  );

  const removeChat = useCallback(
    (id: string) => {
      if (!scope) return;
      deleteChat(scope, id);
      if (currentChatId === id) {
        setCurrentChatId(null);
        writeCurrentChatId(scope, null);
      }
      refresh();
    },
    [scope, currentChatId, refresh],
  );

  const acknowledgeMigrated = useCallback(() => {
    setMigratedCount(null);
  }, []);

  return {
    chats,
    currentChatId,
    selectChat,
    createNewChat,
    persistCurrent,
    removeChat,
    migratedCount,
    acknowledgeMigrated,
  };
}
