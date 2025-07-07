'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface NewsItem {
  id: number;
  code: string | null;
  title: string | null;
  content: string | null;
  created_at: string;
  company_name: string | null;
  site: number | null;
  pickup: number;
  image_path?: string | null;
}

interface NewsListSProps {
  limit?: number;
  site?: number;
  more?: boolean;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1秒

const NewsListS = ({ limit = 4, site = 0, more = false }: NewsListSProps) => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchNews = async (retryCount = 0) => {
      try {
        const response = await fetch(`/api/news/search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            site_type: Number(site),
            limit: Number(limit),
            page: currentPage
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch news');
        }
        const data = await response.json();
        setNews(data.data || []);
        setTotalPages(Math.ceil(data.total / limit));
        setError(null);
        setLoading(false);
      } catch (err) {
        if (retryCount < MAX_RETRIES) {
          setTimeout(() => fetchNews(retryCount + 1), RETRY_DELAY);
          return;
        }
        setError(err instanceof Error ? err.message : 'ニュースの取得に失敗しました。しばらくしてから再度お試しください。');
        setLoading(false);
      }
    };

    fetchNews();
  }, [limit, site, currentPage]);

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

  const extractImageFromContent = (content: string | null): string | null => {
    if (!content) return null;
    const imgMatch = content.match(/<img[^>]+src=['"]([^'"]+)['"][^>]*>/);
    return imgMatch ? imgMatch[1] : null;
  };

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {news.map((item) => {
          const imageUrl = item.image_path || extractImageFromContent(item.content);
          
          return (
            <div key={item.id} className="border-b border-gray-100 pb-4">
              <div className="text-sm text-gray-500 mb-1">
                {item.created_at}
              </div>
              
              <div className="flex gap-3">
                <div className="flex-1">
                  <Link 
                    href={`/all/news/article/${item.id}`}
                    className="block font-bold text-gray-900 hover:text-blue-600 mb-2 overflow-hidden"
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {item.title}
                  </Link>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {item.content?.replace(/<[^>]*>/g, '')}
                  </p>
                </div>
                
                {imageUrl && (
                  <div className="flex-shrink-0 w-20 h-20">
                    <img 
                      src={imageUrl} 
                      alt={item.title || ''}
                      className="w-full h-full object-cover rounded"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {more ? (
        <div className="text-right">
          <Link 
            href="/news/list/latest"
            className="font-bold hover:text-red-700 text-sm"
          >
            もっと見る ›
          </Link>
        </div>
      ) : totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2 mt-4">
          <button
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-2 py-1 rounded disabled:opacity-50"
          >
            &lt;
          </button>
          
          {currentPage > 2 && (
            <button
              onClick={() => setCurrentPage(1)}
              className="px-3 py-1 rounded"
            >
              1
            </button>
          )}
          
          {currentPage > 3 && <span className="px-1">...</span>}
          
          {Array.from(
            { length: Math.min(3, totalPages) },
            (_, i) => {
              const page = Math.max(1, Math.min(currentPage - 1, totalPages - 2)) + i;
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 rounded ${
                    currentPage === page
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {page}
                </button>
              );
            }
          )}
          
          {currentPage < totalPages - 2 && <span className="px-1">...</span>}
          
          {currentPage < totalPages - 1 && (
            <button
              onClick={() => setCurrentPage(totalPages)}
              className="px-3 py-1 rounded"
            >
              {totalPages}
            </button>
          )}
          
          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-2 py-1 rounded disabled:opacity-50"
          >
            &gt;
          </button>
        </div>
      )}
    </div>
  );
};

export default NewsListS;