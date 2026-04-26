import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessageStreamWriter,
  type UIMessage,
} from 'ai';
import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk';

type AgentStatusPayload = {
  phase: 'init' | 'thinking' | 'tool' | 'compaction' | 'status' | 'done';
  message: string;
  sessionId?: string;
  model?: string;
};

type AgentStatusData = {
  agentStatus: AgentStatusPayload;
};

type PortfolioUIMessage = UIMessage<unknown, AgentStatusData>;

export type ClaudeBridgeFinishReason =
  | { kind: 'success'; result: string; sessionId: string; costUsd: number; numTurns: number; durationMs: number }
  | { kind: 'error'; subtype: string; sessionId: string; errors: string[] }
  | { kind: 'aborted'; sessionId?: string };

export interface ClaudeBridgeOptions {
  query: AsyncIterable<SDKMessage>;
  onFinish?: (reason: ClaudeBridgeFinishReason) => void | Promise<void>;
  signal?: AbortSignal;
}

interface ToolCallState {
  toolName: string;
  buffer: string;
  finalized: boolean;
}

interface BlockState {
  kind: 'text' | 'tool';
  textId?: string;
  toolCallId?: string;
}

function writeAgentStatus(
  writer: UIMessageStreamWriter<PortfolioUIMessage>,
  status: AgentStatusPayload,
) {
  writer.write({
    type: 'data-agentStatus',
    data: status,
    transient: true,
  });
}

function asString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value == null) return '';
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * Claude Agent SDK の SDKMessage ストリームを Vercel AI SDK の UI Message Stream Protocol v1 に
 * 変換し Response として返す。フロント側 `useChat` がそのまま購読可能。
 */
export function claudeAgentToUIMessageStreamResponse(
  opts: ClaudeBridgeOptions,
): Response {
  const { query: q, onFinish, signal } = opts;

  const stream = createUIMessageStream<PortfolioUIMessage>({
    execute: async ({ writer }) => {
      const blocks = new Map<number, BlockState>();
      const toolCalls = new Map<string, ToolCallState>();
      let lastSessionId: string | undefined;
      let finishReason: ClaudeBridgeFinishReason | null = null;

      try {
        for await (const msg of q) {
          if (signal?.aborted) {
            finishReason = { kind: 'aborted', sessionId: lastSessionId };
            writer.write({ type: 'abort' });
            break;
          }

          switch (msg.type) {
            case 'system': {
              lastSessionId = msg.session_id;
              if (msg.subtype === 'init') {
                writeAgentStatus(writer, {
                  phase: 'init',
                  message: 'エージェント起動中...',
                  sessionId: msg.session_id,
                  model: msg.model,
                });
              } else if (msg.subtype === 'compact_boundary') {
                writeAgentStatus(writer, {
                  phase: 'compaction',
                  message: 'コンテキスト圧縮中...',
                  sessionId: msg.session_id,
                });
              } else if (msg.subtype === 'status') {
                writeAgentStatus(writer, {
                  phase: 'status',
                  message: msg.status ?? 'status update',
                  sessionId: msg.session_id,
                });
              }
              break;
            }

            case 'stream_event': {
              lastSessionId = msg.session_id;
              const event = msg.event;

              if (event.type === 'content_block_start') {
                const block = event.content_block;
                if (block.type === 'text') {
                  const textId = `text-${msg.uuid}-${event.index}`;
                  blocks.set(event.index, { kind: 'text', textId });
                  writer.write({ type: 'text-start', id: textId });
                } else if (block.type === 'tool_use') {
                  blocks.set(event.index, {
                    kind: 'tool',
                    toolCallId: block.id,
                  });
                  toolCalls.set(block.id, {
                    toolName: block.name,
                    buffer: '',
                    finalized: false,
                  });
                  writer.write({
                    type: 'tool-input-start',
                    toolCallId: block.id,
                    toolName: block.name,
                  });
                  writeAgentStatus(writer, {
                    phase: 'tool',
                    message: `ツール実行: ${block.name}`,
                  });
                }
              } else if (event.type === 'content_block_delta') {
                const block = blocks.get(event.index);
                if (!block) break;
                if (event.delta.type === 'text_delta' && block.textId) {
                  writer.write({
                    type: 'text-delta',
                    id: block.textId,
                    delta: event.delta.text,
                  });
                } else if (event.delta.type === 'input_json_delta' && block.toolCallId) {
                  const tc = toolCalls.get(block.toolCallId);
                  if (tc) tc.buffer += event.delta.partial_json;
                  writer.write({
                    type: 'tool-input-delta',
                    toolCallId: block.toolCallId,
                    inputTextDelta: event.delta.partial_json,
                  });
                }
              } else if (event.type === 'content_block_stop') {
                const block = blocks.get(event.index);
                if (!block) break;
                if (block.kind === 'text' && block.textId) {
                  writer.write({ type: 'text-end', id: block.textId });
                }
                blocks.delete(event.index);
              }
              break;
            }

            case 'assistant': {
              lastSessionId = msg.session_id;
              // assistant が確定した時点で各 tool_use の input を最終確定値として送る
              const content = msg.message.content;
              if (Array.isArray(content)) {
                for (const block of content) {
                  if (block.type === 'tool_use') {
                    const tc = toolCalls.get(block.id);
                    if (tc && !tc.finalized) {
                      tc.finalized = true;
                      writer.write({
                        type: 'tool-input-available',
                        toolCallId: block.id,
                        toolName: block.name,
                        input: block.input,
                      });
                    }
                  }
                }
              }
              break;
            }

            case 'user': {
              lastSessionId = msg.session_id;
              // tool_result を含む user メッセージを tool-output-available にマップ
              const content = msg.message.content;
              if (Array.isArray(content)) {
                for (const block of content) {
                  if (
                    typeof block === 'object' &&
                    block !== null &&
                    'type' in block &&
                    block.type === 'tool_result'
                  ) {
                    const toolUseId =
                      'tool_use_id' in block && typeof block.tool_use_id === 'string'
                        ? block.tool_use_id
                        : '';
                    if (!toolUseId) continue;

                    let outputText = '';
                    const resultContent =
                      'content' in block ? block.content : undefined;
                    if (typeof resultContent === 'string') {
                      outputText = resultContent;
                    } else if (Array.isArray(resultContent)) {
                      outputText = resultContent
                        .map((c) =>
                          typeof c === 'object' && c !== null && 'type' in c && c.type === 'text' && 'text' in c
                            ? asString(c.text)
                            : asString(c),
                        )
                        .join('\n');
                    }

                    writer.write({
                      type: 'tool-output-available',
                      toolCallId: toolUseId,
                      output: outputText,
                    });
                  }
                }
              }
              break;
            }

            case 'result': {
              lastSessionId = msg.session_id;
              console.log(
                `[CLAUDE_USAGE] session=${msg.session_id} subtype=${msg.subtype} cost_usd=${msg.total_cost_usd} turns=${msg.num_turns} duration_ms=${msg.duration_ms} input_tokens=${msg.usage.input_tokens ?? 0} output_tokens=${msg.usage.output_tokens ?? 0}`,
              );
              if (msg.subtype === 'success') {
                finishReason = {
                  kind: 'success',
                  result: msg.result,
                  sessionId: msg.session_id,
                  costUsd: msg.total_cost_usd,
                  numTurns: msg.num_turns,
                  durationMs: msg.duration_ms,
                };
                writeAgentStatus(writer, {
                  phase: 'done',
                  message: '完了',
                  sessionId: msg.session_id,
                });
              } else {
                finishReason = {
                  kind: 'error',
                  subtype: msg.subtype,
                  sessionId: msg.session_id,
                  errors: msg.errors ?? [],
                };
                writer.write({
                  type: 'error',
                  errorText: `Agent execution error: ${msg.subtype}${msg.errors?.length ? ` - ${msg.errors.join('; ')}` : ''}`,
                });
              }
              break;
            }

            default:
              break;
          }
        }
      } catch (err) {
        const errorText = err instanceof Error ? err.message : 'Unknown agent error';
        writer.write({ type: 'error', errorText });
        finishReason = {
          kind: 'error',
          subtype: 'exception',
          sessionId: lastSessionId ?? '',
          errors: [errorText],
        };
      } finally {
        if (!finishReason) {
          finishReason = signal?.aborted
            ? { kind: 'aborted', sessionId: lastSessionId }
            : {
                kind: 'error',
                subtype: 'no_result',
                sessionId: lastSessionId ?? '',
                errors: ['stream ended without result'],
              };
        }
        if (onFinish) {
          await onFinish(finishReason);
        }
      }
    },
    onError: (err) => (err instanceof Error ? err.message : 'agent stream error'),
  });

  return createUIMessageStreamResponse({ stream });
}
