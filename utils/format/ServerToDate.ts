// utils/dateUtils.ts

/**
 * UTCのISO8601文字列を "YYYY-MM-DD HH:mm" 形式にフォーマット
 * @param isoString - UTCのISO8601文字列 (例: "2025-01-20T18:44:09.000Z")
 * @returns "YYYY-MM-DD HH:mm" 形式の文字列 (UTC時刻のまま)
 */
export const ServerToDate = (isoString: string): string => {
    const date = new Date(isoString);
  
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hour = String(date.getUTCHours()).padStart(2, '0');
    const minute = String(date.getUTCMinutes()).padStart(2, '0');
  
    return `${year}-${month}-${day} ${hour}:${minute}`;
  };