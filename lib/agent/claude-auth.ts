import Anthropic from '@anthropic-ai/sdk';
import { readFile, writeFile } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';

const CREDENTIALS_PATH = join(homedir(), '.claude', '.credentials.json');
const TOKEN_URL = 'https://platform.claude.com/v1/oauth/token';
const CLIENT_ID = '9d1c250a-e61b-44d9-88ed-5944d1962f5e';
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // 期限5分前にリフレッシュ

interface ClaudeCredentials {
  claudeAiOauth: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    scopes: string[];
    subscriptionType: string;
    rateLimitTier: string;
  };
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

let cachedClient: Anthropic | null = null;
let cachedExpiry = 0;

async function readCredentials(): Promise<ClaudeCredentials> {
  const raw = await readFile(CREDENTIALS_PATH, 'utf-8');
  return JSON.parse(raw) as ClaudeCredentials;
}

async function refreshToken(credentials: ClaudeCredentials): Promise<ClaudeCredentials> {
  const { claudeAiOauth } = credentials;

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: CLIENT_ID,
    refresh_token: claudeAiOauth.refreshToken,
    scope: claudeAiOauth.scopes.join(' '),
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    throw new Error(`トークンリフレッシュ失敗 (${res.status}): Claude Codeで再ログインしてください (claude login)`);
  }

  const data = (await res.json()) as TokenResponse;

  const updated: ClaudeCredentials = {
    claudeAiOauth: {
      ...claudeAiOauth,
      accessToken: data.access_token,
      refreshToken: data.refresh_token || claudeAiOauth.refreshToken,
      expiresAt: Date.now() + data.expires_in * 1000,
    },
  };

  // 更新した認証情報をファイルに保存
  await writeFile(CREDENTIALS_PATH, JSON.stringify(updated), 'utf-8');

  return updated;
}

/**
 * Claude Codeのサブスクリプション認証を使ってAnthropicクライアントを取得する。
 * 優先順位:
 *   1. ANTHROPIC_API_KEY (環境変数が設定されている場合)
 *   2. Claude Code OAuth トークン (~/.claude/.credentials.json)
 */
export async function getAnthropicClient(): Promise<Anthropic> {
  // 環境変数のAPIキーがあればそちらを優先
  if (process.env.ANTHROPIC_API_KEY) {
    return new Anthropic();
  }

  // キャッシュが有効ならそのまま返す
  if (cachedClient && Date.now() < cachedExpiry) {
    return cachedClient;
  }

  let credentials = await readCredentials();
  const now = Date.now();

  // トークン期限切れ or 期限間近ならリフレッシュ
  if (now >= credentials.claudeAiOauth.expiresAt - TOKEN_REFRESH_BUFFER_MS) {
    credentials = await refreshToken(credentials);
  }

  cachedClient = new Anthropic({
    authToken: credentials.claudeAiOauth.accessToken,
  });
  cachedExpiry = credentials.claudeAiOauth.expiresAt - TOKEN_REFRESH_BUFFER_MS;

  return cachedClient;
}

/**
 * Claude認証が利用可能かチェックする。
 * ANTHROPIC_API_KEY または Claude Code認証情報のいずれかが使用可能ならtrue。
 */
export async function isAuthAvailable(): Promise<boolean> {
  if (process.env.ANTHROPIC_API_KEY) return true;

  try {
    await readCredentials();
    return true;
  } catch {
    return false;
  }
}
