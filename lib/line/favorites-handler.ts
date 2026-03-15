import { Database } from '@/lib/database/Mysql';
import { parseUserIntent } from './parseIntent';
import { handleAdd, handleRemove, handleList, handleInfo } from './favoritesService';
import { HELP_MESSAGE } from './messageFormatter';

// Re-export for backward compatibility
export type { ParsedIntent } from './parseIntent';
export { ruleBasedParse } from './parseIntent';

/**
 * LINEメッセージを処理して応答テキストを返す
 */
export async function handleLineMessage(
  lineUserId: string,
  message: string
): Promise<string> {
  const db = Database.getInstance();

  // LINE user_idからkabu_aiユーザーを特定
  const links = await db.select<{ user_id: string }>(
    'SELECT user_id FROM user_line_link WHERE line_user_id = ?',
    [lineUserId]
  );

  if (links.length === 0) {
    return '株AIアカウントと連携されていません。\nhttps://kabu-ai.jp/favorites からLINE連携を設定してください。';
  }

  const userId = links[0].user_id;

  // アクセス権チェック
  const users = await db.select<{
    subscription_status: string | null;
    createdAt: Date;
  }>(
    'SELECT subscription_status, createdAt FROM user WHERE id = ?',
    [userId]
  );

  if (users.length === 0) {
    return 'ユーザー情報が見つかりません。';
  }

  const user = users[0];
  const isPremium = user.subscription_status === 'active';
  const createdAt = new Date(user.createdAt);
  const trialEnd = new Date(createdAt.getTime() + 48 * 60 * 60 * 1000);
  const isTrial = new Date() < trialEnd;

  if (!isPremium && !isTrial) {
    return 'お気に入り機能はプレミアム会員限定です。\nhttps://kabu-ai.jp/premium からプレミアムプランをご確認ください。';
  }

  // Local LLMで意図解析
  const intent = await parseUserIntent(message);

  switch (intent.action) {
    case 'add':
      return handleAdd(userId, intent);
    case 'remove':
      return handleRemove(userId, intent);
    case 'list':
      return handleList(userId);
    case 'info':
      return handleInfo(intent);
    case 'help':
      return HELP_MESSAGE;
    default:
      // 意図が不明な場合はヘルプを表示
      return `メッセージを理解できませんでした。\n\n${HELP_MESSAGE}`;
  }
}
