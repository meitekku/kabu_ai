// Portfolio agent chat history persistence (localStorage, スコープ別).
// スコープは userId(ログイン済) もしくは "anon"(未ログイン)。
// localStorage の制約: 5MB / 同期書込み。チャット数は MAX_CHATS で LRU。

import type { UIMessage } from "ai";

export type StoredChat = {
  id: string;
  title: string;
  updatedAt: number;
  messages: UIMessage[];
};

const KEY_PREFIX = "kabu_ai:portfolio-chats";
const CURRENT_KEY_PREFIX = "kabu_ai:portfolio-current-chat";
const ANON_SCOPE = "anon";
const TITLE_MAX_LENGTH = 30;
const DEFAULT_TITLE = "新しいチャット";

export const MAX_CHATS = 50;

function isBrowser(): boolean {
  return (
    typeof window !== "undefined" && typeof window.localStorage !== "undefined"
  );
}

export function chatsKey(scope: string): string {
  return `${KEY_PREFIX}:${scope}`;
}

export function currentChatKey(scope: string): string {
  return `${CURRENT_KEY_PREFIX}:${scope}`;
}

export function scopeForUser(userId: string | null | undefined): string {
  return userId && userId.length > 0 ? userId : ANON_SCOPE;
}

function readAllRaw(scope: string): StoredChat[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(chatsKey(scope));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isStoredChat);
  } catch (err) {
    console.error("[chat-history-store] readAllRaw failed:", err);
    return [];
  }
}

function writeAll(scope: string, chats: StoredChat[]): void {
  if (!isBrowser()) return;
  // LRU: 50件超なら最近更新されたものから優先で残す
  const trimmed =
    chats.length > MAX_CHATS
      ? [...chats]
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .slice(0, MAX_CHATS)
      : chats;
  try {
    window.localStorage.setItem(chatsKey(scope), JSON.stringify(trimmed));
  } catch (err) {
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

export function listChats(scope: string): StoredChat[] {
  return readAllRaw(scope).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getChat(scope: string, id: string): StoredChat | null {
  return readAllRaw(scope).find((c) => c.id === id) ?? null;
}

export function saveChat(scope: string, chat: StoredChat): void {
  const all = readAllRaw(scope);
  const idx = all.findIndex((c) => c.id === chat.id);
  if (idx >= 0) {
    all[idx] = chat;
  } else {
    all.push(chat);
  }
  writeAll(scope, all);
}

export function deleteChat(scope: string, id: string): void {
  const all = readAllRaw(scope).filter((c) => c.id !== id);
  writeAll(scope, all);
}

export function clearScope(scope: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(chatsKey(scope));
    window.localStorage.removeItem(currentChatKey(scope));
  } catch (err) {
    console.error("[chat-history-store] clearScope failed:", err);
  }
}

export function readCurrentChatId(scope: string): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(currentChatKey(scope));
  } catch {
    return null;
  }
}

export function writeCurrentChatId(scope: string, id: string | null): void {
  if (!isBrowser()) return;
  try {
    if (id) {
      window.localStorage.setItem(currentChatKey(scope), id);
    } else {
      window.localStorage.removeItem(currentChatKey(scope));
    }
  } catch (err) {
    console.error("[chat-history-store] writeCurrentChatId failed:", err);
  }
}

// 匿名 → ログイン時のチャット移植。
// 既存の userId スコープに anon のチャットをマージし、id 重複時は updatedAt が
// 新しい方を残す。完了後に anon スコープは削除。戻り値は移植件数。
export function migrateAnonToUser(userId: string): { merged: number } {
  if (!isBrowser()) return { merged: 0 };
  if (!userId) return { merged: 0 };

  const anonChats = readAllRaw(ANON_SCOPE);
  if (anonChats.length === 0) {
    // anon current id だけ残っていることがあるので念のため掃除
    try {
      window.localStorage.removeItem(currentChatKey(ANON_SCOPE));
    } catch {
      /* noop */
    }
    return { merged: 0 };
  }

  const userChats = readAllRaw(userId);
  const map = new Map<string, StoredChat>();
  for (const c of userChats) map.set(c.id, c);
  for (const c of anonChats) {
    const existing = map.get(c.id);
    if (!existing || c.updatedAt > existing.updatedAt) {
      map.set(c.id, c);
    }
  }
  writeAll(userId, Array.from(map.values()));
  clearScope(ANON_SCOPE);
  return { merged: anonChats.length };
}

export function generateChatId(): string {
  if (isBrowser() && typeof window.crypto?.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
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
  return text.length > TITLE_MAX_LENGTH
    ? `${text.slice(0, TITLE_MAX_LENGTH)}…`
    : text;
}
