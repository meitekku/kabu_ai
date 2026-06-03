import { headers, cookies } from 'next/headers';
import { randomUUID } from 'crypto';
import type { RowDataPacket } from 'mysql2';
import { auth } from '@/lib/auth/auth';
import { isAdminRole } from '@/lib/auth/admin';
import { Database } from '@/lib/database/Mysql';
import { createPortfolioStream } from '@/lib/agent/portfolio-orchestrator';
import {
  claudeAgentToUIMessageStreamResponse,
  type ClaudeBridgeFinishReason,
} from '@/lib/agent/ai-sdk-bridge';
import {
  isTurnstileEnabled,
  TURNSTILE_COOKIE_NAME,
} from '@/lib/security/turnstile';
import { verifyTurnstileCookie } from '@/lib/security/turnstile-cookie';
import {
  ANON_DAILY_LIMIT,
  extractAnonIdentity,
  tryConsumeAnonQuota,
} from '@/lib/quota/anonymous-quota';

export const maxDuration = 300;

const UNLIMITED_PLANS = new Set(['standard', 'agent']);
const DAILY_LIMIT = 3;
const STALE_IN_PROGRESS_MINUTES = 5;

interface PortfolioRequestBody {
  messages?: Array<{
    role?: string;
    content?: unknown;
    parts?: unknown;
  }>;
}

interface UserSubscriptionRow extends RowDataPacket {
  subscription_status: string | null;
  subscription_plan: string | null;
  role: string | null;
}

interface CountRow extends RowDataPacket {
  cnt: number;
}

interface InProgressRow extends RowDataPacket {
  id: string;
  session_id: string;
  started_at: Date;
}

function isUnlimitedUser(row: UserSubscriptionRow | undefined): boolean {
  if (!row) return false;
  if (isAdminRole(row.role)) return true;
  if (row.subscription_status !== 'active') return false;
  return !!row.subscription_plan && UNLIMITED_PLANS.has(row.subscription_plan);
}

async function fetchTodayUsageCount(db: Database, userId: string): Promise<number> {
  const rows = await db.select<CountRow>(
    `SELECT COUNT(*) AS cnt FROM agent_portfolio_usage_log
     WHERE user_id = ?
       AND started_at >= CONVERT_TZ(CONCAT(CURDATE(), ' 00:00:00'), '+09:00', '+00:00')
       AND status IN ('completed','cancelled')`,
    [userId],
  );
  return rows[0]?.cnt ?? 0;
}

function extractLastUserMessage(body: PortfolioRequestBody): string {
  const messages = Array.isArray(body.messages) ? body.messages : [];
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (!m || m.role !== 'user') continue;
    if (typeof m.content === 'string' && m.content.trim()) {
      return m.content.trim();
    }
    if (Array.isArray(m.parts)) {
      const text = m.parts
        .map((p) => {
          if (
            typeof p === 'object' &&
            p !== null &&
            'type' in p &&
            (p as { type: unknown }).type === 'text' &&
            'text' in p &&
            typeof (p as { text: unknown }).text === 'string'
          ) {
            return (p as { text: string }).text;
          }
          return '';
        })
        .join('')
        .trim();
      if (text) return text;
    }
    if (Array.isArray(m.content)) {
      const text = m.content
        .map((c) =>
          typeof c === 'object' && c !== null && 'type' in c && (c as { type: unknown }).type === 'text' && 'text' in c
            ? String((c as { text: unknown }).text ?? '')
            : '',
        )
        .join('')
        .trim();
      if (text) return text;
    }
  }
  return '';
}

export async function POST(req: Request) {
  try {
    const headersList = await headers();
    const cookieStore = await cookies();
    const session = await auth.api.getSession({ headers: headersList });
    const userId = session?.user?.id ?? null;

    if (userId) {
      return handleAuthenticated(req, userId);
    }
    return handleAnonymous(req, headersList, cookieStore);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'internal_error';
    console.error('agent-portfolio POST error:', err);
    return jsonResponse(500, { error: message });
  }
}

async function handleAuthenticated(req: Request, userId: string): Promise<Response> {
  const db = Database.getInstance();

  const userRows = await db.select<UserSubscriptionRow>(
    'SELECT subscription_status, subscription_plan, role FROM user WHERE id = ?',
    [userId],
  );
  const isUnlimited = isUnlimitedUser(userRows[0]);

  if (!isUnlimited) {
    const used = await fetchTodayUsageCount(db, userId);
    if (used >= DAILY_LIMIT) {
      return jsonResponse(403, {
        error: 'daily_limit_exceeded',
        remaining: 0,
      });
    }
  }

  // 多重起動防止: 進行中レコードがあれば 409。古いものは error に倒して継続
  const inProgress = await db.select<InProgressRow>(
    `SELECT id, session_id, started_at FROM agent_portfolio_usage_log
     WHERE user_id = ? AND status = 'in_progress'
     ORDER BY started_at DESC LIMIT 1`,
    [userId],
  );
  if (inProgress.length > 0) {
    const startedMs = new Date(inProgress[0].started_at).getTime();
    const ageMin = (Date.now() - startedMs) / 60000;
    if (ageMin < STALE_IN_PROGRESS_MINUTES) {
      return jsonResponse(409, {
        error: 'already_running',
        sessionId: inProgress[0].session_id,
      });
    }
    await db.update(
      `UPDATE agent_portfolio_usage_log
       SET status = 'error', error_reason = 'stale_in_progress', completed_at = NOW()
       WHERE id = ?`,
      [inProgress[0].id],
    );
  }

  const body = (await req.json()) as PortfolioRequestBody;
  const userMessage = extractLastUserMessage(body);
  if (!userMessage) {
    return jsonResponse(400, { error: 'empty_message' });
  }

  const sessionId = randomUUID();
  const logId = randomUUID();
  await db.insert(
    `INSERT INTO agent_portfolio_usage_log (id, user_id, session_id, started_at, status)
     VALUES (?, ?, ?, NOW(), 'in_progress')`,
    [logId, userId, sessionId],
  );

  const q = createPortfolioStream(userMessage, sessionId);
  const signal = req.signal;

  return claudeAgentToUIMessageStreamResponse({
    query: q,
    signal,
    onFinish: async (reason: ClaudeBridgeFinishReason) => {
      try {
        if (reason.kind === 'success') {
          await db.update(
            `UPDATE agent_portfolio_usage_log
             SET status = 'completed', completed_at = NOW()
             WHERE id = ?`,
            [logId],
          );
        } else if (reason.kind === 'aborted') {
          await db.update(
            `UPDATE agent_portfolio_usage_log
             SET status = 'cancelled', completed_at = NOW()
             WHERE id = ?`,
            [logId],
          );
        } else {
          const errorReason = `${reason.subtype}: ${reason.errors.join('; ')}`.slice(0, 250);
          await db.update(
            `UPDATE agent_portfolio_usage_log
             SET status = 'error', completed_at = NOW(), error_reason = ?
             WHERE id = ?`,
            [errorReason, logId],
          );
        }
      } catch (err) {
        console.error('Failed to update agent_portfolio_usage_log:', err);
      }
    },
  });
}

async function handleAnonymous(
  req: Request,
  headersList: Headers,
  cookieStore: Awaited<ReturnType<typeof cookies>>,
): Promise<Response> {
  // 1. Turnstile 必須(本番): cookie は HMAC 署名済トークン。値の偽装は不可。
  if (isTurnstileEnabled()) {
    const cookieValue = cookieStore.get(TURNSTILE_COOKIE_NAME)?.value;
    if (!verifyTurnstileCookie(cookieValue)) {
      return jsonResponse(401, { error: 'turnstile_required' });
    }
  }

  // 2. CF-Connecting-IP 必須(Cloudflare 経由のみ受け付ける = 偽装防止)
  const identity = extractAnonIdentity(headersList);
  if (!identity.cfConnectingIp) {
    return jsonResponse(400, { error: 'missing_cf_ip' });
  }

  // 3. メッセージ抽出(クオータ消費前に行う。空メッセージで残数を消費させない)
  const body = (await req.json()) as PortfolioRequestBody;
  const userMessage = extractLastUserMessage(body);
  if (!userMessage) {
    return jsonResponse(400, { error: 'empty_message' });
  }

  // 4. atomic クオータ判定 + 利用記録(1ステートメントで race-free)
  const quota = await tryConsumeAnonQuota(identity);
  if (quota.kind === 'missing_cf_ip') {
    return jsonResponse(400, { error: 'missing_cf_ip' });
  }
  if (quota.kind === 'burst') {
    return jsonResponse(429, { error: 'too_many_requests' });
  }
  if (quota.kind === 'limit') {
    return jsonResponse(403, {
      error: 'anon_daily_limit_exceeded',
      remaining: 0,
      limit: ANON_DAILY_LIMIT,
    });
  }

  // 5. ストリーム返却(匿名なので usage_log は付けない)
  const sessionId = randomUUID();
  const q = createPortfolioStream(userMessage, sessionId);
  const signal = req.signal;

  return claudeAgentToUIMessageStreamResponse({
    query: q,
    signal,
    onFinish: async () => {
      // 匿名フローでは finish 時の usage_log 更新は無し
    },
  });
}

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
