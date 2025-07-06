// utils/dateUtils.ts

/**
 * UTCのISO8601文字列を "YYYY-MM-DD HH:mm" 形式にフォーマット（日本時間）
 * @param isoString - UTCのISO8601文字列 (例: "2025-01-20T18:44:09.000Z")
 * @returns "YYYY-MM-DD HH:mm" 形式の文字列 (JST時刻)
 */
export const ServerToDate = (isoString: string): string => {
    const date = new Date(isoString);
  
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
  
    return `${year}-${month}-${day} ${hour}:${minute}`;
  };