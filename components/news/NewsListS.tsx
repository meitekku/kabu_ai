'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ServerToDate } from '@/utils/format/ServerToDate';

interface NewsItem {
  id: number;
  code: string | null;
  title: string | null;
  content: string | null;
  created_at: string;
  company_name: string | null;
  site: number | null;
  pickup: number;
}

interface NewsListSProps {
  limit?: number;
  site?: number;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1秒

const NewsListS = ({ limit = 4, site = 0 }: NewsListSProps) => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNews = async (retryCount = 0) => {
      try {
        const response = await fetch(`/api/news/search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            site_type: Number(site),  // 明示的に数値型に変換
            limit: Number(limit)      // 明示的に数値型に変換
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch news');
        }
        const data = await response.json();
        setNews(data.data || []);
        setError(null);
        setLoading(false);
      } catch (err) {
        if (retryCount < MAX_RETRIES) {
          // リトライ
          setTimeout(() => fetchNews(retryCount + 1), RETRY_DELAY);
          return;
        }
        setError(err instanceof Error ? err.message : 'ニュースの取得に失敗しました。しばらくしてから再度お試しください。');
        setLoading(false);
      }
    };

    fetchNews();
  }, [limit, site]);

  if (loading) {
    return (
      <div className="flex justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 rounded-lg">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!news || news.length === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-gray-500">現在、ニュースはありません。</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900 mb-4">最新ニュース</h2>
      <div className="space-y-4">
        {news.map((item) => (
          <div key={item.id} className="border-b border-gray-100 pb-4">
            <div className="text-sm text-gray-500 mb-1">
              {ServerToDate(item.created_at)}
            </div>
            <Link 
              href={`/all/news/article/${item.id}`}
              className="block font-bold text-gray-900 hover:text-blue-600 mb-2"
            >
              {item.title}
            </Link>
            <p className="text-sm text-gray-600 line-clamp-2">
              {item.content}
            </p>
          </div>
        ))}
      </div>
      <div className="text-right">
        <Link 
          href="/news"
          className="text-red-600 hover:text-red-700 text-sm font-medium"
        >
          もっと見る ›
        </Link>
      </div>
    </div>
  );
};

export default NewsListS; 