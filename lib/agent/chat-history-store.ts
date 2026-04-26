// WHY: Portfolio agent chat history persistence (localStorage MVP).
// Will be migrated to DB once the schema is finalised.

import type { UIMessage } from "ai";

export type StoredChat = {
  id: string;
  title: string;
  updatedAt: number;
  messages: UIMessage[];
};

const STORAGE_KEY = "kabu_ai:portfolio-chats";
const TITLE_MAX_LENGTH = 30;
const DEFAULT_TITLE = "新しいチャット";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readAll(): StoredChat[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isStoredChat);
  } catch (err) {
    console.error("[chat-history-store] readAll failed:", err);
    return [];
  }
}

function writeAll(chats: StoredChat[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
  } catch (err) {
    // WHY: localStorage may be full / disabled; degrade silently but log.
    console.error("[chat-history-store] writeAll failed:", err);
  }
}

function isStoredChat(value: unknown): value is StoredChat {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.title === "string" &&
    typeof v.updatedAt === "number" &&
    Array.isArray(v.messages)
  );
}

export function listChats(): StoredChat[] {
  return readAll().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getChat(id: string): StoredChat | null {
  return readAll().find((c) => c.id === id) ?? null;
}

export function saveChat(chat: StoredChat): void {
  const all = readAll();
  const idx = all.findIndex((c) => c.id === chat.id);
  if (idx >= 0) {
    all[idx] = chat;
  } else {
    all.push(chat);
  }
  writeAll(all);
}

export function deleteChat(id: string): void {
  const all = readAll().filter((c) => c.id !== id);
  writeAll(all);
}

export function clearAll(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error("[chat-history-store] clearAll failed:", err);
  }
}

export function generateChatId(): string {
  if (isBrowser() && typeof window.crypto?.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  // WHY: SSR / older browser fallback (still cryptographically irrelevant for chat ids).
  return `chat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function extractText(message: UIMessage): string {
  if (!Array.isArray(message.parts)) return "";
  return message.parts
    .filter(
      (p): p is { type: "text"; text: string } =>
        typeof p === "object" &&
        p !== null &&
        (p as { type?: unknown }).type === "text" &&
        typeof (p as { text?: unknown }).text === "string",
    )
    .map((p) => p.text)
    .join("")
    .trim();
}

export function deriveTitle(messages: UIMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser) return DEFAULT_TITLE;
  const text = extractText(firstUser).replace(/\s+/g, " ").trim();
  if (!text) return DEFAULT_TITLE;
  return text.length > TITLE_MAX_LENGTH ? `${text.slice(0, TITLE_MAX_LENGTH)}…` : text;
}
