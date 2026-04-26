"use client";

import { useCallback, useEffect, useState } from "react";
import type { UIMessage } from "ai";
import {
  type StoredChat,
  deleteChat,
  deriveTitle,
  generateChatId,
  listChats,
  saveChat,
} from "@/lib/agent/chat-history-store";

const CURRENT_CHAT_KEY = "kabu_ai:portfolio-current-chat";

function readCurrentChatId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(CURRENT_CHAT_KEY);
  } catch {
    return null;
  }
}

function writeCurrentChatId(id: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (id) {
      window.localStorage.setItem(CURRENT_CHAT_KEY, id);
    } else {
      window.localStorage.removeItem(CURRENT_CHAT_KEY);
    }
  } catch (err) {
    console.error("[usePortfolioChatHistory] persist current id failed:", err);
  }
}

export interface UsePortfolioChatHistoryResult {
  chats: StoredChat[];
  currentChatId: string | null;
  selectChat: (id: string) => void;
  createNewChat: () => string;
  persistCurrent: (messages: UIMessage[]) => void;
  removeChat: (id: string) => void;
}

export function usePortfolioChatHistory(): UsePortfolioChatHistoryResult {
  const [chats, setChats] = useState<StoredChat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

  // WHY: hydrate from localStorage after mount to avoid SSR mismatch.
  useEffect(() => {
    setChats(listChats());
    setCurrentChatId(readCurrentChatId());
  }, []);

  const refresh = useCallback(() => {
    setChats(listChats());
  }, []);

  const selectChat = useCallback((id: string) => {
    setCurrentChatId(id);
    writeCurrentChatId(id);
  }, []);

  const createNewChat = useCallback(() => {
    const id = generateChatId();
    setCurrentChatId(id);
    writeCurrentChatId(id);
    return id;
  }, []);

  const persistCurrent = useCallback(
    (messages: UIMessage[]) => {
      if (!messages || messages.length === 0) return;
      const id = currentChatId ?? generateChatId();
      const chat: StoredChat = {
        id,
        title: deriveTitle(messages),
        updatedAt: Date.now(),
        messages,
      };
      saveChat(chat);
      if (!currentChatId) {
        setCurrentChatId(id);
        writeCurrentChatId(id);
      }
      refresh();
    },
    [currentChatId, refresh],
  );

  const removeChat = useCallback(
    (id: string) => {
      deleteChat(id);
      if (currentChatId === id) {
        setCurrentChatId(null);
        writeCurrentChatId(null);
      }
      refresh();
    },
    [currentChatId, refresh],
  );

  return {
    chats,
    currentChatId,
    selectChat,
    createNewChat,
    persistCurrent,
    removeChat,
  };
}
