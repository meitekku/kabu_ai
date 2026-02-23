import { Database } from '@/lib/database/Mysql';
import { ORCHESTRATOR_SYSTEM_PROMPT } from './system-prompts';
import { ORCHESTRATOR_CONFIG, type Tool, type MessageParam, type ToolUseBlock, type TextBlock, type ToolResultBlockParam, type StatusCallback } from './types';
import { runDbAgent } from './db-agent';
import { runWebAgent } from './web-agent';
import { getAnthropicClient } from './claude-auth';

const ORCHESTRATOR_TOOLS: Tool[] = [
  {
    name: 'call_db_agent',
    description: 'データベースエージェントに指示を出し、MariaDBから株価・企業情報・決算・ニュース等のデータを取得する。具体的な指示（何のデータが必要か）を日本語で伝える。',
    input_schema: {
      type: 'object' as const,
      properties: {
        instruction: {
          type: 'string',
          description: 'DBエージェントへの指示（例: "トヨタ自動車の直近30日間の株価を取得して"）',
        },
      },
      required: ['instruction'],
    },
  },
  {
    name: 'call_web_agent',
    description: 'ウェブ検索エージェントに指示を出し、最新のニュース・市場動向・一般情報を検索する。DBにない情報や最新情報が必要な場合に使う。',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: '検索エージェントへの指示（例: "2026年の半導体市場の動向と見通し"）',
        },
      },
      required: ['query'],
    },
  },
];

export async function runOrchestrator(
  userMessages: Array<{ role: 'user' | 'assistant'; content: string }>,
  db: Database,
  onStatus: StatusCallback,
): Promise<string> {
  const anthropic = await getAnthropicClient();

  const messages: MessageParam[] = userMessages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  let iterations = 0;

  while (iterations < ORCHESTRATOR_CONFIG.maxIterations) {
    iterations++;

    const response = await anthropic.messages.create({
      model: ORCHESTRATOR_CONFIG.model,
      system: ORCHESTRATOR_SYSTEM_PROMPT,
      messages,
      tools: ORCHESTRATOR_TOOLS,
      max_tokens: 4096,
    });

    const toolUseBlocks = response.content.filter(
      (b): b is ToolUseBlock => b.type === 'tool_use'
    );

    // ツール呼び出しがない or end_turn → 最終回答
    if (toolUseBlocks.length === 0 || response.stop_reason === 'end_turn') {
      const textBlocks = response.content.filter(
        (b): b is TextBlock => b.type === 'text'
      );
      return textBlocks.map((b) => b.text).join('');
    }

    // ツール実行
    const toolResults: ToolResultBlockParam[] = [];

    for (const toolUse of toolUseBlocks) {
      if (toolUse.name === 'call_db_agent') {
        const input = toolUse.input as { instruction: string };
        onStatus('データベースを照会中...');
        try {
          const result = await runDbAgent(input.instruction, db);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: result,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: `DB Agentエラー: ${message}`,
            is_error: true,
          });
        }
      } else if (toolUse.name === 'call_web_agent') {
        const input = toolUse.input as { query: string };
        onStatus('ウェブを検索中...');
        try {
          const result = await runWebAgent(input.query);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: result,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: `Web Agentエラー: ${message}`,
            is_error: true,
          });
        }
      }
    }

    messages.push({ role: 'assistant', content: response.content });
    messages.push({ role: 'user', content: toolResults });
  }

  return 'エージェントの処理回数が上限に達しました。質問を変えてお試しください。';
}
