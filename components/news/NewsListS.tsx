'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import SparklineChart from './SparklineChart';

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
  logo_url?: string | null;
}

interface NewsListSProps {
  limit?: number;
  site?: number | number[];
  more?: boolean;
  initialData?: {
    news: NewsItem[];
    total: number;
    page?: number;
  };
}

function NewsThumbnail({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = useState(false);
  if (error) return null;
  return (
    <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 relative">
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover rounded"
        sizes="(max-width: 640px) 64px, 80px"
        unoptimized
        onError={() => setError(true)}
      />
    </div>
  );
}

function CompanyVisual({
  code,
  logoUrl,
  companyName,
  sparklineData,
}: {
  code: string;
  logoUrl: string | null | undefined;
  companyName: string | null | undefined;
  sparklineData?: { prices: number[]; change: number | null } | null;
}) {
  const [logoError, setLogoError] = useState(false);

  return (
    <div className="flex-shrink-0 flex flex-col items-center gap-1 w-16 sm:w-20">
      {/* ロゴ（ある場合のみ表示） */}
      {logoUrl && !logoError && (
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded overflow-hidden bg-gray-100 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl}
            alt={companyName || code}
            className="w-full h-full object-contain"
            onError={() => setLogoError(true)}
          />
        </div>
      )}
      {/* スパークライン */}
      <SparklineChart code={code} width={64} height={28} data={sparklineData} />
    </div>
  );
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1秒

const NewsListS = ({ limit = 4, site = 0, more = false, initialData }: NewsListSProps) => {
  const initialPage = initialData?.page ?? 1;
  const hasInitialData = initialData !== undefined;
  const skipInitialFetchRef = useRef(hasInitialData);
  const [news, setNews] = useState<NewsItem[]>(initialData?.news ?? []);
  const [loading, setLoading] = useState(!hasInitialData);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(
    hasInitialData ? Math.max(1, Math.ceil(initialData.total / limit)) : 1
  );
  const [sparklines, setSparklines] = useState<Record<string, { prices: number[]; change: number | null }>>({});

  useEffect(() => {
    if (skipInitialFetchRef.current) {
      skipInitialFetchRef.current = false;
      setLoading(false);
      setError(null);
      return;
    }

    const fetchNews = async (retryCount = 0) => {
      try {
        const response = await fetch(`/api/news/search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            site_type: Array.isArray(site) ? site : Number(site),
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

  useEffect(() => {
    const codes = news
      .map((n) => n.code?.trim())
      .filter((c): c is string => !!c && /^[0-9A-Z]{4}$/.test(c));
    const unique = [...new Set(codes)];
    if (unique.length === 0) return;
    fetch(`/api/stocks/sparklines?codes=${unique.join(',')}`)
      .then((r) => (r.ok ? r.json() : {}))
      .then(setSparklines)
      .catch(() => {});
  }, [news]);

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
    
    // まず通常のsrc属性を確認
    const srcMatch = content.match(/<img[^>]+src=['"]([^'"]+)['"][^>]*>/);
    if (srcMatch) {
      const srcUrl = srcMatch[1];
      
      // Next.js最適化URLの場合、元のURLを抽出
      if (srcUrl.includes('/_next/image?url=')) {
        const urlMatch = srcUrl.match(/url=([^&]+)/);
        if (urlMatch) {
          const decodedUrl = decodeURIComponent(urlMatch[1]);
          return decodedUrl;
        }
      }
      
      return srcUrl;
    }
    
    // srcsetからも抽出を試みる
    const srcsetMatch = content.match(/srcset=['"]([^'"]+)['"][^>]*>/);
    if (srcsetMatch) {
      const srcsetValue = srcsetMatch[1];
      const firstUrl = srcsetValue.split(' ')[0];
      
      if (firstUrl.includes('/_next/image?url=')) {
        const urlMatch = firstUrl.match(/url=([^&]+)/);
        if (urlMatch) {
          const decodedUrl = decodeURIComponent(urlMatch[1]);
          return decodedUrl;
        }
      }
      
      return firstUrl;
    }
    
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="border-t border-shikiho-bg-border">
        {news.map((item) => {
          const imageUrl = item.image_path || extractImageFromContent(item.content);
          const articleCode = item.code?.trim();
          const articleHref = articleCode
            ? `/stocks/${articleCode}/news/${item.id}`
            : `/stocks/all/news/${item.id}`;
          
          return (
            <div key={item.id} className="border-b border-shikiho-bg-border-light pb-4 pt-3 hover:bg-shikiho-bg-gray-light transition-colors px-2">
              <div className="text-[11px] text-shikiho-text-tertiary mb-2">
                {item.created_at}
              </div>

              <div className="flex gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <Link
                    href={articleHref}
                    className="block text-[15px] sm:text-[16px] font-bold text-shikiho-text-primary hover:text-shikiho-link-primary mb-2 overflow-hidden"
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
                  <p className="text-[12px] text-shikiho-text-secondary line-clamp-2">
                    {item.content?.replace(/<[^>]*>/g, '')}
                  </p>
                </div>

                {articleCode ? (
                  <CompanyVisual
                    code={articleCode}
                    logoUrl={item.logo_url}
                    companyName={item.company_name}
                    sparklineData={sparklines[articleCode] ?? null}
                  />
                ) : imageUrl ? (
                  <NewsThumbnail src={imageUrl} alt={item.title || ''} />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      {more ? (
        <div className="text-right mt-4">
          <Link 
            href="/news/latest"
            className="font-bold text-shikiho-link-primary hover:text-shikiho-link-secondary text-[14px]"
          >
            もっと見る ›
          </Link>
        </div>
      ) : totalPages > 1 && (
        <div className="flex justify-center items-center gap-1 sm:space-x-2 mt-8">
          <button
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-2 rounded-md disabled:opacity-50 border border-shikiho-bg-border text-shikiho-text-primary hover:bg-shikiho-bg-gray"
          >
            &lt;
          </button>

          {currentPage > 2 && (
            <button
              onClick={() => setCurrentPage(1)}
              className="px-3 py-2 rounded-md border border-shikiho-bg-border text-shikiho-text-primary hover:bg-shikiho-bg-gray"
            >
              1
            </button>
          )}

          {currentPage > 3 && <span className="px-2 text-shikiho-text-tertiary">...</span>}

          {Array.from(
            { length: Math.min(3, totalPages) },
            (_, i) => {
              const page = Math.max(1, Math.min(currentPage - 1, totalPages - 2)) + i;
              return (
               <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-4 py-2 rounded-md font-medium ${
                    currentPage === page
                      ? 'bg-shikiho-accent-red-light text-white border border-shikiho-accent-red-light'
                      : 'border border-shikiho-bg-border text-shikiho-text-primary hover:bg-shikiho-bg-gray'
                  }`}
                >
                  {page}
                </button>
              );
            }
          )}

          {currentPage < totalPages - 2 && <span className="px-2 text-shikiho-text-tertiary">...</span>}

          {currentPage < totalPages - 1 && (
            <button
              onClick={() => setCurrentPage(totalPages)}
              className="px-3 py-2 rounded-md border border-shikiho-bg-border text-shikiho-text-primary hover:bg-shikiho-bg-gray"
            >
              {totalPages}
            </button>
          )}

          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-2 rounded-md disabled:opacity-50 border border-shikiho-bg-border text-shikiho-text-primary hover:bg-shikiho-bg-gray"
          >
            &gt;
          </button>
        </div>
      )}
    </div>
  );
};

export default NewsListS;
