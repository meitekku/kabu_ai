import { RowDataPacket } from 'mysql2'
import { Database } from '@/lib/database/Mysql'
import { getCacheTTL, cacheGet, cacheSet, makeCacheKey } from '@/lib/cache'

interface PostRow extends RowDataPacket {
  id: number
  code: string | null
  title: string | null
  content: string | null
  site: number | null
  accept: number
  pickup: number
  created_at: Date
  updated_at: Date
  company_name: string | null
  image_path: string | null
}

interface CountResult extends RowDataPacket {
  total: number
}

export interface NewsSearchParams {
  pickup?: number
  company_code?: string
  keyword?: string
  from_date?: string
  to_date?: string
  limit?: number
  page?: number
  site_type?: number | number[]
}

export interface NewsSearchItem {
  id: number
  code: string | null
  title: string | null
  content: string | null
  site: number | null
  pickup: number
  created_at: string
  updated_at: string
  company_name: string | null
  image_path: string | null
}

export interface NewsSearchResponse {
  success: boolean
  data: NewsSearchItem[]
  total: number
  totalPages: number
  currentPage: number
}

export interface NewsSearchResult {
  response: NewsSearchResponse
  cacheHit: boolean
  ttl: number
}

function formatToJSTString(date: Date): string {
  return new Date(date).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).replace(/\//g, '-').replace(/,/g, '')
}

function normalizeSiteType(siteType: number | number[] | undefined): number | number[] {
  if (Array.isArray(siteType)) {
    return siteType.map((value) => Number(value))
  }

  if (siteType === undefined || siteType === null) {
    return 0
  }

  return Number(siteType)
}

export async function searchNews(params: NewsSearchParams): Promise<NewsSearchResult> {
  const {
    pickup,
    company_code,
    keyword,
    from_date,
    to_date,
    limit = 10,
    page = 1,
  } = params
  const site_type = normalizeSiteType(params.site_type)
  const safeLimit = Math.max(1, Number(limit) || 10)
  const safePage = Math.max(1, Number(page) || 1)

  const cacheKey = makeCacheKey('news-search', {
    pickup,
    company_code,
    keyword,
    from_date,
    to_date,
    limit: safeLimit,
    page: safePage,
    site_type
  })
  const ttl = getCacheTTL('news')
  const cached = cacheGet(cacheKey, ttl)
  if (cached) {
    return {
      response: cached as NewsSearchResponse,
      cacheHit: true,
      ttl,
    }
  }

  const db = Database.getInstance()
  const conditions: string[] = []
  const values: Array<string | number | boolean | null> = []
  const needsJoin = Boolean(company_code)

  if (site_type !== undefined) {
    if (Array.isArray(site_type)) {
      const placeholders = site_type.map(() => '?').join(',')
      conditions.push(`p.site IN (${placeholders})`)
      values.push(...site_type)
    } else {
      conditions.push('p.site = ?')
      values.push(site_type)
    }
  }

  if (pickup) {
    conditions.push('p.pickup = ?')
    values.push(pickup)
  }

  if (company_code) {
    conditions.push('pc.code = ?')
    values.push(String(company_code))
  }

  if (keyword) {
    conditions.push('(p.title LIKE ? OR p.content LIKE ?)')
    values.push(`%${keyword}%`)
    values.push(`%${keyword}%`)
  }

  if (from_date) {
    conditions.push('p.created_at >= ?')
    values.push(from_date)
  }

  if (to_date) {
    conditions.push('p.created_at <= ?')
    values.push(to_date)
  }

  const whereClause = conditions.length > 0
    ? ` AND ${conditions.join(' AND ')}`
    : ''

  const imageExtract = `CASE
    WHEN LOCATE('src=\\'', p.content) > 0 THEN SUBSTRING_INDEX(SUBSTRING(p.content, LOCATE('src=\\'', p.content) + 5), '\\'', 1)
    WHEN LOCATE('src="', p.content) > 0 THEN SUBSTRING_INDEX(SUBSTRING(p.content, LOCATE('src="', p.content) + 5), '"', 1)
    ELSE NULL END`

  let countQuery = ''
  let query = ''

  if (needsJoin) {
    countQuery = `
      SELECT COUNT(DISTINCT p.id) as total
      FROM post p
      INNER JOIN post_code pc ON p.id = pc.post_id
      WHERE p.accept = 1${whereClause}
    `
    query = `
      SELECT p.id, pc.code, p.title, SUBSTRING(p.content, 1, 500) as content,
        p.site, p.pickup, p.created_at, p.updated_at,
        c.name as company_name,
        ${imageExtract} as image_path
      FROM post p
      INNER JOIN post_code pc ON p.id = pc.post_id
      LEFT JOIN company c ON pc.code = c.code
      WHERE p.accept = 1${whereClause}
      ORDER BY p.created_at DESC
    `
  } else {
    countQuery = `
      SELECT COUNT(*) as total
      FROM post p
      WHERE p.accept = 1${whereClause}
    `
    query = `
      SELECT p.id, p.title, SUBSTRING(p.content, 1, 500) as content,
        p.site, p.pickup, p.created_at, p.updated_at,
        (SELECT pc.code FROM post_code pc WHERE pc.post_id = p.id LIMIT 1) as code,
        (SELECT c.name FROM post_code pc2 JOIN company c ON pc2.code = c.code WHERE pc2.post_id = p.id LIMIT 1) as company_name,
        ${imageExtract} as image_path
      FROM post p
      WHERE p.accept = 1${whereClause}
      ORDER BY p.created_at DESC
    `
  }

  const offset = (safePage - 1) * safeLimit
  query += ` LIMIT ? OFFSET ?`

  const countValues = [...values]
  values.push(safeLimit)
  values.push(offset)

  const [totalResult] = await db.select<CountResult>(countQuery, countValues)
  const total = totalResult?.total ?? 0
  const posts = await db.select<PostRow>(query, values)

  const formattedPosts: NewsSearchItem[] = posts.map((post) => ({
    ...post,
    created_at: formatToJSTString(post.created_at),
    updated_at: formatToJSTString(post.updated_at),
  }))

  const responseData: NewsSearchResponse = {
    success: true,
    data: formattedPosts,
    total,
    totalPages: Math.ceil(total / safeLimit),
    currentPage: safePage
  }

  cacheSet(cacheKey, responseData)

  return {
    response: responseData,
    cacheHit: false,
    ttl,
  }
}
