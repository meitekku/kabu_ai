// --- 市場時間判定 共通ヘルパー ---
// サーバー側キャッシュ（lib/cache.ts）とクライアント側ポーリング
// （CurrentPriceInfo / CompanyBasicInfo）で同一の市場時間判定を共有する
// （判定の乖離によるキャッシュTTL・ポーリングのズレを防ぐ）

function getZonedDate(timeZone: string): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone }));
}

// 日本市場時間: 平日 9:00-11:30 / 12:30-15:30 JST（土日・昼休みを除外）
export function isJPMarketHours(): boolean {
  const jst = getZonedDate('Asia/Tokyo');
  const day = jst.getDay();
  if (day === 0 || day === 6) return false;
  const minutes = jst.getHours() * 60 + jst.getMinutes();
  return (minutes >= 540 && minutes <= 690) || (minutes >= 750 && minutes <= 930);
}

// 米国市場時間: 平日 9:30-16:00 ET（DSTはタイムゾーン変換で自動対応）
export function isUSMarketHours(): boolean {
  const et = getZonedDate('America/New_York');
  const day = et.getDay();
  if (day === 0 || day === 6) return false;
  const minutes = et.getHours() * 60 + et.getMinutes();
  return minutes >= 570 && minutes <= 960;
}

// 米国株コード（英字のみ）かどうか
export function isUSStockCode(code?: string): boolean {
  return !!code && /^[A-Z]+$/.test(code);
}

// 銘柄コードに応じた市場時間判定（US銘柄はET、それ以外はJST基準）
export function isMarketHoursForCode(code?: string): boolean {
  return isUSStockCode(code) ? isUSMarketHours() : isJPMarketHours();
}
