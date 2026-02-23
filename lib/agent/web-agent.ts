import Anthropic from '@anthropic-ai/sdk';
import { WEB_AGENT_SYSTEM_PROMPT } from './system-prompts';
import { SUB_AGENT_CONFIG, type Tool, type MessageParam, type ToolUseBlock, type TextBlock, type ToolResultBlockParam } from './types';

const WEB_TOOLS: Tool[] = [
  {
    name: 'web_search',
    description: 'ウェブ検索を実行して最新情報を取得する。日本語・英語どちらでも検索可能。',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: '検索クエリ',
        },
      },
      required: ['query'],
    },
  },
];

interface BraveResult {
  title?: string;
  description?: string;
  url?: string;
}

interface BraveResponse {
  web?: {
    results?: BraveResult[];
  };
}

interface DDGTopic {
  Text?: string;
  FirstURL?: string;
  Topics?: DDGTopic[];
}

interface DDGResponse {
  AbstractText?: string;
  AbstractURL?: string;
  Heading?: string;
  RelatedTopics?: DDGTopic[];
}

async function braveSearch(query: string): Promise<string> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) return '';

  try {
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`;
    const response = await fetch(url, {
      headers: { 'X-Subscription-Token': apiKey, Accept: 'application/json' },
    });

    if (!response.ok) return '';

    const data = (await response.json()) as BraveResponse;
    const results = data.web?.results || [];

    if (results.length === 0) return '';

    return results
      .map((r: BraveResult) => `【${r.title || ''}】\n${r.description || ''}\n${r.url || ''}`)
      .join('\n\n');
  } catch {
    return '';
  }
}

async function duckDuckGoSearch(query: string): Promise<string> {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'KabuAI/1.0' },
    });

    if (!response.ok) return '';

    const data = (await response.json()) as DDGResponse;
    const results: string[] = [];

    if (data.AbstractText) {
      results.push(`【${data.Heading || query}】\n${data.AbstractText}\n${data.AbstractURL || ''}`);
    }

    for (const topic of (data.RelatedTopics || []).slice(0, 5)) {
      if (topic.Text) {
        results.push(`${topic.Text}\n${topic.FirstURL || ''}`);
      }
      if (topic.Topics) {
        for (const sub of topic.Topics.slice(0, 2)) {
          if (sub.Text) {
            results.push(`${sub.Text}\n${sub.FirstURL || ''}`);
          }
        }
      }
    }

    return results.length > 0 ? results.join('\n\n') : '';
  } catch {
    return '';
  }
}

async function performWebSearch(query: string): Promise<string> {
  // Brave Search（APIキーがあれば優先）
  const braveResult = await braveSearch(query);
  if (braveResult) {
    return `「${query}」の検索結果:\n\n${braveResult}`;
  }

  // DuckDuckGo Instant Answer API（フォールバック）
  const ddgResult = await duckDuckGoSearch(query);
  if (ddgResult) {
    return `「${query}」の検索結果:\n\n${ddgResult}`;
  }

  return `「${query}」の検索結果: 外部検索APIからの結果が取得できませんでした。あなたの知識に基づいて回答してください。`;
}

export async function runWebAgent(query: string): Promise<string> {
  const anthropic = new Anthropic();
  const messages: MessageParam[] = [{ role: 'user', content: query }];
  let iterations = 0;

  while (iterations < SUB_AGENT_CONFIG.maxIterations) {
    iterations++;

    const response = await anthropic.messages.create({
      model: SUB_AGENT_CONFIG.model,
      system: WEB_AGENT_SYSTEM_PROMPT,
      messages,
      tools: WEB_TOOLS,
      max_tokens: 4096,
    });

    const toolUseBlocks = response.content.filter(
      (b): b is ToolUseBlock => b.type === 'tool_use'
    );

    if (toolUseBlocks.length === 0 || response.stop_reason === 'end_turn') {
      const textBlocks = response.content.filter(
        (b): b is TextBlock => b.type === 'text'
      );
      return textBlocks.map((b) => b.text).join('') || '（Web Agentから応答なし）';
    }

    const toolResults: ToolResultBlockParam[] = [];
    for (const toolUse of toolUseBlocks) {
      if (toolUse.name === 'web_search') {
        const input = toolUse.input as { query: string };
        const result = await performWebSearch(input.query);
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

  return '（Web Agent: 処理回数上限に達しました）';
}
