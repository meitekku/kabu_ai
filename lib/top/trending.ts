import { Database } from '@/lib/database/Mysql'
import { cacheGet, cacheSet, makeCacheKey } from '@/lib/cache'

export type ContentType =
  | 'market_up'
  | 'trading_value'
  | 'stop_high'
  | 'pts'
  | 'yahoo_buzz'
  | 'latest_ai'

export type TimeContext =
  | 'pre_market'
  | 'morning_session'
  | 'lunch'
  | 'afternoon_session'
  | 'pts_session'
  | 'overnight'

export interface TrendingItem {
  post_id: number
  code: string | null
  company_name: string
  title: string
  excerpt: string
  content_type: ContentType
  change_rate: number | null
  created_at: string
  post_url: string
}

export interface TrendingSectionData {
  type: ContentType
  label: string
  time_label: string
  items: TrendingItem[]
}

export interface TrendingContent {
  section1: TrendingSectionData
  section2: TrendingSectionData
  time_context: TimeContext
  generated_at: string
}

const SECTION_LABELS: Record<ContentType, string> = {
  market_up:     '値上がり注目銘柄',
  trading_value: '売買代金上位銘柄',
  stop_high:     'ストップ高銘柄',
  pts:           'PTS変動注目銘柄',
  yahoo_buzz:    '掲示板盛り上がり銘柄',
  latest_ai:     '最新AI分析記事',
}

const TIME_LABELS: Record<TimeContext, string> = {
  pre_market:        '場前',
  morning_session:   '前場',
  lunch:             '昼休み',
  afternoon_session: '後場',
  pts_session:       'PTS中',
  overnight:         '時間外',
}

export function getTimeContext(): TimeContext {
  const jst = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }))
  const day = jst.getDay()
  const isWeekday = day >= 1 && day <= 5
  const m = jst.getHours() * 60 + jst.getMinutes()

  if (!isWeekday) return 'overnight'
  if (m >= 480 && m < 540)  return 'pre_market'
  if (m >= 540 && m < 690)  return 'morning_session'
  if (m >= 690 && m < 750)  return 'lunch'
  if (m >= 750 && m < 930)  return 'afternoon_session'
  if (m >= 930 && m < 1410) return 'pts_session'
  return 'overnight'
}

function getSectionTypes(ctx: TimeContext): [ContentType, ContentType] {
  switch (ctx) {
    case 'pre_market':        return ['pts',       'latest_ai']
    case 'morning_session':   return ['market_up', 'trading_value']
    case 'lunch':             return ['stop_high', 'yahoo_buzz']
    case 'afternoon_session': return ['market_up', 'trading_value']
    case 'pts_session':       return ['pts',       'yahoo_buzz']
    case 'overnight':         return ['latest_ai', 'yahoo_buzz']
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

function makeExcerpt(content: string | null, maxLen = 75): string {
  if (!content) return ''
  const text = stripHtml(content).slice(0, maxLen)
  return text.length >= maxLen ? text + '…' : text
}

interface RankingRow {
  code: string
  company_name: string
  logo_url: string | null
  post_id: number
  title: string
  content: string
  created_at: string
  site: number
  diff_percent: number | null
}

interface PtsRow {
  code: string
  company_name: string
  logo_url: string | null
  post_id: number
  title: string
  content: string
  created_at: string
  site: number
  pts_pct: number | null
}

interface LatestAiRow {
  post_id: number
  title: string
  content: string
  created_at: string
  site: number
  company_name: string
  code: string | null
  logo_url: string | null
  diff_percent: number | null
}

const RANKING_TABLE_MAP: Partial<Record<ContentType, string>> = {
  market_up:     'ranking_up',
  trading_value: 'ranking_trading_value',
  stop_high:     'ranking_stop_high',
  yahoo_buzz:    'ranking_yahoo_post',
}

async function fetchRanking(db: Database, table: string, type: ContentType): Promise<TrendingItem[]> {
  const rows = await db.select<RankingRow>(`
    SELECT r.code, c.name AS company_name,
           lp.id AS post_id, lp.title, lp.content, lp.created_at, lp.site,
           ci.diff_percent, ci.logo_url
    FROM \`${table}\` r
    JOIN company c ON r.code = c.code
    INNER JOIN (
      SELECT pc.code, p.id, p.title, p.content, p.created_at, p.site,
             ROW_NUMBER() OVER (PARTITION BY pc.code ORDER BY p.created_at DESC) AS rn
      FROM post p
      JOIN post_code pc ON p.id = pc.post_id
      WHERE p.accept = 1 AND p.site = 70
        AND p.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    ) lp ON r.code = lp.code AND lp.rn = 1
    LEFT JOIN company_info ci ON r.code = ci.code
    LIMIT 4
  `)
  return rows.map(r => ({
    post_id: r.post_id,
    code: r.code,
    company_name: r.company_name,
    logo_url: r.logo_url ?? null,
    title: r.title ?? '',
    excerpt: makeExcerpt(r.content),
    content_type: type,
    change_rate: r.diff_percent ?? null,
    created_at: String(r.created_at),
    post_url: `/stocks/${r.code}/news/${r.post_id}`,
  }))
}

async function fetchPts(db: Database): Promise<TrendingItem[]> {
  const rows = await db.select<PtsRow>(`
    SELECT pal.code, c.name AS company_name,
           p.id AS post_id, p.title, p.content, p.created_at, p.site,
           pal.pts_pct, ci.logo_url
    FROM pts_article_log pal
    JOIN company c ON pal.code = c.code
    JOIN post p ON pal.post_id = p.id AND p.accept = 1
    LEFT JOIN company_info ci ON pal.code = ci.code
    WHERE pal.article_date >= DATE_SUB(CURDATE(), INTERVAL 3 DAY)
    ORDER BY pal.article_date DESC, ABS(pal.pts_pct) DESC
    LIMIT 4
  `)
  return rows.map(r => ({
    post_id: r.post_id,
    code: r.code,
    company_name: r.company_name,
    logo_url: r.logo_url ?? null,
    title: r.title ?? '',
    excerpt: makeExcerpt(r.content),
    content_type: 'pts' as ContentType,
    change_rate: r.pts_pct ?? null,
    created_at: String(r.created_at),
    post_url: `/stocks/${r.code}/news/${r.post_id}`,
  }))
}

async function fetchLatestAi(db: Database): Promise<TrendingItem[]> {
  const rows = await db.select<LatestAiRow>(`
    SELECT p.id AS post_id, p.title, p.content, p.created_at, p.site,
           COALESCE(c.name, '') AS company_name,
           pc.code,
           ci.diff_percent, ci.logo_url
    FROM post p
    LEFT JOIN (
      SELECT post_id, MIN(code) AS code
      FROM post_code
      GROUP BY post_id
    ) pc ON p.id = pc.post_id
    LEFT JOIN company c ON pc.code = c.code
    LEFT JOIN company_info ci ON pc.code = ci.code
    WHERE p.accept = 1 AND p.site = 70
    ORDER BY p.created_at DESC
    LIMIT 4
  `)
  return rows.map(r => ({
    post_id: r.post_id,
    code: r.code ?? null,
    company_name: r.company_name ?? '',
    logo_url: r.logo_url ?? null,
    title: r.title ?? '',
    excerpt: makeExcerpt(r.content),
    content_type: 'latest_ai' as ContentType,
    change_rate: r.diff_percent ?? null,
    created_at: String(r.created_at),
    post_url: r.code
      ? `/stocks/${r.code}/news/${r.post_id}`
      : `/stocks/all/news/${r.post_id}`,
  }))
}

function fetchByType(db: Database, type: ContentType): Promise<TrendingItem[]> {
  if (RANKING_TABLE_MAP[type]) {
    return fetchRanking(db, RANKING_TABLE_MAP[type]!, type)
  }
  if (type === 'pts') return fetchPts(db)
  return fetchLatestAi(db)
}

export async function getTrendingContent(): Promise<TrendingContent> {
  const timeCtx = getTimeContext()
  const bucket = Math.floor(Date.now() / 300_000)
  const cacheKey = makeCacheKey('top-trending', { timeCtx, bucket })
  const cached = cacheGet(cacheKey, 300)
  if (cached) return cached as TrendingContent

  const [type1, type2] = getSectionTypes(timeCtx)
  const db = Database.getInstance()
  const timeLabel = TIME_LABELS[timeCtx]

  const [items1, items2] = await Promise.all([
    fetchByType(db, type1).catch(() => [] as TrendingItem[]),
    fetchByType(db, type2).catch(() => [] as TrendingItem[]),
  ])

  const result: TrendingContent = {
    section1: { type: type1, label: SECTION_LABELS[type1], time_label: timeLabel, items: items1 },
    section2: { type: type2, label: SECTION_LABELS[type2], time_label: timeLabel, items: items2 },
    time_context: timeCtx,
    generated_at: new Date().toISOString(),
  }

  cacheSet(cacheKey, result)
  return result
}
