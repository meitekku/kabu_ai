import { Database } from '@/lib/database/Mysql';
import { DB_AGENT_SYSTEM_PROMPT } from './system-prompts';
import { SUB_AGENT_CONFIG, type Tool, type MessageParam, type ToolUseBlock, type TextBlock, type ToolResultBlockParam } from './types';
import { getAnthropicClient } from './claude-auth';

const SQL_TIMEOUT_MS = 10000;

const DB_TOOLS: Tool[] = [
  {
    name: 'execute_sql',
    description: 'MariaDBにSELECTクエリを実行してデータを取得する。INSERT/UPDATE/DELETEは禁止。',
    input_schema: {
      type: 'object' as const,
      properties: {
        sql: {
          type: 'string',
          description: 'SELECTクエリ（パラメータはプレースホルダ不要、値を直接埋め込む）',
        },
      },
      required: ['sql'],
    },
  },
];

function validateSql(sql: string): boolean {
  const normalized = sql.trim().toLowerCase();
  if (!normalized.startsWith('select') && !normalized.startsWith('show') && !normalized.startsWith('describe')) {
    return false;
  }
  const forbidden = ['insert ', 'update ', 'delete ', 'drop ', 'alter ', 'create ', 'truncate ', 'grant ', 'revoke '];
  for (const keyword of forbidden) {
    if (normalized.includes(keyword)) {
      return false;
    }
  }
  return true;
}

async function executeSql(db: Database, sql: string): Promise<string> {
  if (!validateSql(sql)) {
    return 'エラー: SELECT/SHOW/DESCRIBE以外のクエリは実行できません。';
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SQL_TIMEOUT_MS);

    const rows = await db.select<Record<string, unknown>>(sql);
    clearTimeout(timeout);

    if (rows.length === 0) {
      return '結果: 0件（データが見つかりませんでした）';
    }

    if (rows.length > 50) {
      const truncated = rows.slice(0, 50);
      return `結果: ${rows.length}件中50件表示\n${JSON.stringify(truncated, null, 2)}`;
    }

    return `結果: ${rows.length}件\n${JSON.stringify(rows, null, 2)}`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `SQLエラー: ${message}`;
  }
}

export async function runDbAgent(instruction: string, db: Database): Promise<string> {
  const anthropic = await getAnthropicClient();
  const messages: MessageParam[] = [{ role: 'user', content: instruction }];
  let iterations = 0;

  while (iterations < SUB_AGENT_CONFIG.maxIterations) {
    iterations++;

    const response = await anthropic.messages.create({
      model: SUB_AGENT_CONFIG.model,
      system: DB_AGENT_SYSTEM_PROMPT,
      messages,
      tools: DB_TOOLS,
      max_tokens: 4096,
    });

    const toolUseBlocks = response.content.filter(
      (b): b is ToolUseBlock => b.type === 'tool_use'
    );

    if (toolUseBlocks.length === 0 || response.stop_reason === 'end_turn') {
      const textBlocks = response.content.filter(
        (b): b is TextBlock => b.type === 'text'
      );
      return textBlocks.map((b) => b.text).join('') || '（DB Agentから応答なし）';
    }

    const toolResults: ToolResultBlockParam[] = [];
    for (const toolUse of toolUseBlocks) {
      if (toolUse.name === 'execute_sql') {
        const input = toolUse.input as { sql: string };
        const result = await executeSql(db, input.sql);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: result,
        });
      }
    }

    messages.push({ role: 'assistant', content: response.content });
    messages.push({ role: 'user', content: toolResults });
  }

  return '（DB Agent: 処理回数上限に達しました）';
}
