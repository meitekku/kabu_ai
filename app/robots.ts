import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/settings/', '/chat/', '/agent-chat/', '/test/', '/ultrathink/'],
      },
    ],
    sitemap: 'https://kabu-ai.jp/sitemap.xml',
  }
}
