// --- インメモリキャッシュ ユーティリティ ---

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

const store = new Map<string, CacheEntry>();

// TTLプロファイル（秒）
type TTLProfile = 'news' | 'market' | 'ranking' | 'static';

function getJSTMinutes(): number {
  const now = new Date();
  const jst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
  return jst.getHours() * 60 + jst.getMinutes();
}

const TTL_CONFIGS: Record<TTLProfile, () => number> = {
  // ニュース: 更新時間帯(12:25-13:30, 15:25-16:30)は2分、それ以外は10分
  news: () => {
    const m = getJSTMinutes();
    if ((m >= 745 && m <= 810) || (m >= 925 && m <= 990)) return 120;
    return 600;
  },
  // 株価・企業情報: 市場時間(9:00-15:30)は3分、それ以外は30分
  market: () => {
    const m = getJSTMinutes();
    if (m >= 540 && m <= 930) return 180;
    return 1800;
  },
  // ランキング: 常に10分
  ranking: () => 600,
  // マスタデータ: 常に30分
  static: () => 1800,
};

export function getCacheTTL(profile: TTLProfile): number {
  return TTL_CONFIGS[profile]();
}

export function cacheGet(key: string, ttl: number): unknown | null {
  const entry = store.get(key);
  if (entry && (Date.now() - entry.timestamp) < ttl * 1000) {
    return entry.data;
  }
  return null;
}

export function cacheSet(key: string, data: unknown): void {
  store.set(key, { data, timestamp: Date.now() });

  // 200エントリ超で古いものを掃除
  if (store.size > 200) {
    const now = Date.now();
    for (const [k, v] of store) {
      if (now - v.timestamp > 1_800_000) store.delete(k);
    }
  }
}

export function makeCacheKey(prefix: string, params: Record<string, unknown>): string {
  return `${prefix}:${JSON.stringify(params)}`;
}
