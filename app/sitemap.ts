import { MetadataRoute } from 'next'
import { Database } from '@/lib/database/Mysql'

export const dynamic = 'force-dynamic'

const BASE_URL = 'https://kabu-ai.jp'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE_URL}/premium`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/news/latest`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE_URL}/terms`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/privacy-policy`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/disclaimer`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/commercial-transactions`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/contact`, changeFrequency: 'monthly', priority: 0.3 },
  ]

  try {
    const db = Database.getInstance()

    const [companies, articles] = await Promise.all([
      db.select<{ code: string }>('SELECT code FROM company'),
      db.select<{ id: number; code: string; updated_at: string }>(
        `SELECT p.id, pc.code, p.updated_at
         FROM post p
         JOIN post_code pc ON p.id = pc.post_id
         WHERE p.accept = 1
         ORDER BY p.id DESC
         LIMIT 1000`
      ),
    ])

    const companyPages: MetadataRoute.Sitemap = companies.flatMap((company) => [
      {
        url: `${BASE_URL}/stocks/${company.code}/news`,
        changeFrequency: 'daily' as const,
        priority: 0.8,
      },
      {
        url: `${BASE_URL}/stocks/${company.code}/predict`,
        changeFrequency: 'daily' as const,
        priority: 0.8,
      },
      {
        url: `${BASE_URL}/stocks/${company.code}/valuation`,
        changeFrequency: 'daily' as const,
        priority: 0.8,
      },
    ])

    const articlePages: MetadataRoute.Sitemap = articles.map((article) => ({
      url: `${BASE_URL}/stocks/${article.code}/news/${article.id}`,
      lastModified: new Date(article.updated_at),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }))

    return [...staticPages, ...companyPages, ...articlePages]
  } catch (error) {
    console.error('Sitemap: DB接続エラー、静的ページのみ返します:', error)
    return staticPages
  }
}
