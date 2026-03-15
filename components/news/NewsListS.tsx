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
        className="object-cover rounded-lg"
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
      {logoUrl && !logoError && (
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl}
            alt={companyName || code}
            className="w-full h-full object-contain"
            onError={() => setLogoError(true)}
          />
        </div>
      )}
      <SparklineChart code={code} width={64} height={28} data={sparklineData} />
    </div>
  );
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

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
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-2 border-border border-t-foreground rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-shikiho-negative/10 rounded-xl border border-shikiho-negative/20">
        <p className="text-shikiho-negative text-sm">{error}</p>
      </div>
    );
  }

  if (!news || news.length === 0) {
    return (
      <div className="p-6 bg-muted rounded-xl border border-border text-center">
        <p className="text-muted-foreground text-sm">現在、ニュースはありません。</p>
      </div>
    );
  }

  const extractImageFromContent = (content: string | null): string | null => {
    if (!content) return null;

    const srcMatch = content.match(/<img[^>]+src=['"]([^'"]+)['"][^>]*>/);
    if (srcMatch) {
      const srcUrl = srcMatch[1];

      if (srcUrl.includes('/_next/image?url=')) {
        const urlMatch = srcUrl.match(/url=([^&]+)/);
        if (urlMatch) {
          const decodedUrl = decodeURIComponent(urlMatch[1]);
          return decodedUrl;
        }
      }

      return srcUrl;
    }

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
    <div className="space-y-0">
      <div className="divide-y divide-border">
        {news.map((item) => {
          const imageUrl = item.image_path || extractImageFromContent(item.content);
          const articleCode = item.code?.trim();
          const articleHref = articleCode
            ? `/stocks/${articleCode}/news/${item.id}`
            : `/stocks/all/news/${item.id}`;

          return (
            <div key={item.id} className="py-4 first:pt-0 hover:bg-accent/50 transition-colors px-2 -mx-2 rounded-lg">
              <div className="text-[11px] text-muted-foreground mb-2">
                {item.created_at}
              </div>

              <div className="flex gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <Link
                    href={articleHref}
                    className="block text-[15px] sm:text-[16px] font-semibold text-foreground hover:text-primary mb-1.5 overflow-hidden transition-colors"
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
                  <p className="text-[12px] text-muted-foreground line-clamp-2 leading-relaxed">
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
        <div className="text-right pt-4">
          <Link
            href="/news/latest"
            className="inline-flex items-center gap-1 font-medium text-primary hover:text-primary/80 text-[14px] transition-colors"
          >
            もっと見る
            <span className="text-xs">→</span>
          </Link>
        </div>
      ) : totalPages > 1 && (
        <div className="flex justify-center items-center gap-1 mt-10">
          <button
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-2 rounded-lg disabled:opacity-30 text-muted-foreground hover:bg-accent transition-colors"
          >
            &lt;
          </button>

          {currentPage > 2 && (
            <button
              onClick={() => setCurrentPage(1)}
              className="px-3 py-2 rounded-lg text-muted-foreground hover:bg-accent transition-colors"
            >
              1
            </button>
          )}

          {currentPage > 3 && <span className="px-2 text-muted-foreground/50">...</span>}

          {Array.from(
            { length: Math.min(3, totalPages) },
            (_, i) => {
              const page = Math.max(1, Math.min(currentPage - 1, totalPages - 2)) + i;
              return (
               <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    currentPage === page
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {page}
                </button>
              );
            }
          )}

          {currentPage < totalPages - 2 && <span className="px-2 text-muted-foreground/50">...</span>}

          {currentPage < totalPages - 1 && (
            <button
              onClick={() => setCurrentPage(totalPages)}
              className="px-3 py-2 rounded-lg text-muted-foreground hover:bg-accent transition-colors"
            >
              {totalPages}
            </button>
          )}

          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-2 rounded-lg disabled:opacity-30 text-muted-foreground hover:bg-accent transition-colors"
          >
            &gt;
          </button>
        </div>
      )}
    </div>
  );
};

export default NewsListS;
