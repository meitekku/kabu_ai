export interface ParsedIntent {
  action: 'add' | 'remove' | 'list' | 'info' | 'help' | 'unknown';
  stockCodes?: string[];
  stockNames?: string[];
  rawQuery?: string;
}

const LOCAL_LLM_URL = process.env.LOCAL_LLM_URL || 'https://ollama.kabu-ai.jp/v1/chat/completions';
const LOCAL_LLM_MODEL = 'JunHowie/Qwen3-14B-GPTQ-Int4';

/**
 * ルールベースのフォールバック意図解析
 */
export function ruleBasedParse(message: string): ParsedIntent {
  const stockCodes = message.match(/\b(\d{4})\b/g) || [];

  // アクション判定
  let action: ParsedIntent['action'] = 'unknown';
  if (message.includes('追加') || message.includes('登録')) {
    action = 'add';
  } else if (message.includes('削除') || message.includes('解除')) {
    action = 'remove';
  } else if (/^(一覧|リスト|お気に入り|確認)$/.test(message)) {
    action = 'list';
  } else if (/^(ヘルプ|使い方|何ができる)/.test(message)) {
    action = 'help';
  } else if (message.includes('情報') || message.includes('について') || /は[？?]$/.test(message)) {
    action = 'info';
  }

  // add/remove/info の場合、銘柄名を抽出
  const stockNames: string[] = [];
  if (['add', 'remove', 'info'].includes(action)) {
    const cleaned = message
      .replace(/\b\d{4}\b/g, '')
      .replace(/(追加|登録|削除|解除|情報|について|を|の|に|は[？?]?$)/g, '')
      .trim();
    if (cleaned) {
      stockNames.push(cleaned);
    }
  }

  return {
    action,
    ...(stockCodes.length > 0 ? { stockCodes } : {}),
    ...(stockNames.length > 0 ? { stockNames } : {}),
    rawQuery: message,
  };
}

/**
 * Local LLMでユーザーメッセージの意図を解析（失敗時はルールベースにフォールバック）
 */
export async function parseUserIntent(message: string): Promise<ParsedIntent> {
  const systemPrompt = `あなたはLINEボットの意図解析エンジンです。ユーザーのメッセージから以下の操作意図を判別してください。

## 操作一覧
- add: 銘柄をお気に入りに追加（例: "トヨタを追加", "7203を登録", "ソニーをお気に入りに"）
- remove: 銘柄をお気に入りから削除（例: "トヨタを削除", "7203を解除"）
- list: 現在のお気に入り一覧表示（例: "一覧", "お気に入り", "リスト", "確認"）
- info: 特定銘柄の情報取得（例: "トヨタの情報", "7203について"）
- help: 使い方説明（例: "ヘルプ", "使い方", "何ができる"）

## 出力形式（JSON）
{"action":"add","stockCodes":["7203"],"stockNames":["トヨタ自動車"]}

ルール:
- actionは必ず上記5つのいずれか。判別不能ならunknown
- 銘柄コード（4桁数字）があればstockCodesに入れる
- 会社名があればstockNamesに入れる
- JSONのみ返すこと。説明文は不要`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(LOCAL_LLM_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: LOCAL_LLM_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        temperature: 0.1,
        max_tokens: 200,
        chat_template_kwargs: { enable_thinking: false },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.error('LLM intent parse error:', res.status, await res.text());
      return ruleBasedParse(message);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim() || '';

    // JSONを抽出（マークダウンのコードブロック対応）
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return ruleBasedParse(message);
    }

    const parsed = JSON.parse(jsonMatch[0]) as ParsedIntent;
    if (!['add', 'remove', 'list', 'info', 'help', 'unknown'].includes(parsed.action)) {
      return ruleBasedParse(message);
    }

    return { ...parsed, rawQuery: message };
  } catch (error) {
    console.error('LLM intent parse exception:', error);
    return ruleBasedParse(message);
  }
}
