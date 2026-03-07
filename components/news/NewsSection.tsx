"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface Post {
  id: number;
  code: string | null;
  title: string | null;
  content: string | null;
  created_at: string;
  company_name: string | null;
  site: number | null;
  image_url?: string;
  image_path?: string | null;
}

interface NewsSectionProps {
  initialPickupNews?: Post[];
  initialMarketNews?: Post[];
}

function NewsCard({ item }: { item: Post }) {
  const [imgError, setImgError] = useState(false);
  const safeTitle = item.title ?? 'タイトルなし';
  const imageMatch = item.content?.match(/<img[^>]+src=['"]([^'">]+)['"]/);
  const imageUrl = item.image_path || item.image_url || (imageMatch ? imageMatch[1] : null);
  const articleCode = item.code?.trim();
  const articleHref = articleCode ? `/stocks/${articleCode}/news/${item.id}` : `/stocks/all/news/${item.id}`;

  return (
    <Link href={articleHref} className="block h-full">
      <div className="bg-shikiho-bg-body border border-shikiho-bg-border-light rounded-md shadow-shikiho-sm hover:shadow-shikiho-md transition-shadow overflow-hidden h-full flex flex-col">
        <div className="relative w-full h-40 sm:h-48">
          {imageUrl && !imgError ? (
            <Image
              src={imageUrl}
              alt={safeTitle}
              fill
              className="object-cover object-top"
              sizes="(max-width: 768px) 100vw, 50vw"
              unoptimized
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
              <span className="text-shikiho-accent-red text-sm font-bold text-center line-clamp-3">{safeTitle}</span>
            </div>
          )}
        </div>
        <div className="p-4 flex flex-col flex-grow">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] text-shikiho-text-tertiary">
              {item.created_at ? new Date(item.created_at).toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
            </span>
            {item.company_name && (
              <span className="px-2 py-1 bg-shikiho-bg-gray-light text-[10px] text-shikiho-text-secondary rounded font-medium">
                {item.company_name}
              </span>
            )}
          </div>
          <h3 className="text-[16px] font-bold text-shikiho-text-primary line-clamp-2 flex-grow hover:text-shikiho-link-primary">
            {safeTitle}
          </h3>
        </div>
      </div>
    </Link>
  );
}

export default function NewsSection({ initialPickupNews, initialMarketNews }: NewsSectionProps) {
  const hasInitialData = initialPickupNews !== undefined && initialMarketNews !== undefined;
  const [pickupNews, setPickupNews] = useState<Post[]>(initialPickupNews ?? []);
  const [marketNews, setMarketNews] = useState<Post[]>(initialMarketNews ?? []);
  const [loading, setLoading] = useState(!hasInitialData);

  useEffect(() => {
    if (hasInitialData) {
      setPickupNews(initialPickupNews ?? []);
      setMarketNews(initialMarketNews ?? []);
      setLoading(false);
      return;
    }

    const fetchNews = async (pickup: number) => {
      try {
        const response = await fetch('/api/news/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            pickup: pickup,
            limit: 2
          }),
        });
        const data = await response.json();
        return data.success ? data.data : [];
      } catch (error) {
        console.error('Error fetching news:', error);
        return [];
      }
    };

    const loadAllNews = async () => {
      const [pickup, market] = await Promise.all([
        fetchNews(1),
        fetchNews(2)
      ]);
      setPickupNews(pickup);
      setMarketNews(market);
      setLoading(false);
    };

    loadAllNews();
  }, [hasInitialData, initialPickupNews, initialMarketNews]);

  const NewsBlock = ({ title, news }: { title: string; news: Post[] }) => (
    <div className="mb-6 sm:mb-10">
      <h2 className="text-[20px] sm:text-[22px] font-bold text-shikiho-text-primary mb-5 pb-2 border-b border-shikiho-bg-border relative before:absolute before:bottom-[-1px] before:left-0 before:w-12 before:h-[2px] before:bg-shikiho-accent-red">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {news.map((item) => (
          <NewsCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 sm:mb-10">
          <div className="h-8 bg-[#e8e8e8] rounded w-1/3 sm:w-1/4 mb-4 animate-pulse"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {[...Array(4)].map((_, index) => (
              <div key={`skeleton-${index}`} className="bg-shikiho-bg-body border border-shikiho-bg-border-light rounded-md shadow-shikiho-sm overflow-hidden flex flex-col h-full">
                <div className="w-full h-40 sm:h-48 bg-[#e8e8e8] animate-pulse"></div>
                <div className="p-4 flex flex-col flex-grow">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-3 bg-[#e8e8e8] rounded w-16 animate-pulse"></div>
                    <div className="h-4 bg-[#e8e8e8] rounded w-20 animate-pulse"></div>
                  </div>
                  <div className="h-5 bg-[#e8e8e8] rounded w-full mb-2 animate-pulse"></div>
                  <div className="h-5 bg-[#e8e8e8] rounded w-3/4 animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mb-6 sm:mb-10">
          <div className="h-8 bg-[#e8e8e8] rounded w-1/3 sm:w-1/4 mb-4 animate-pulse"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {[...Array(4)].map((_, index) => (
              <div key={`skeleton-${index}`} className="bg-shikiho-bg-body border border-shikiho-bg-border-light rounded-md shadow-shikiho-sm overflow-hidden flex flex-col h-full">
                <div className="w-full h-40 sm:h-48 bg-[#e8e8e8] animate-pulse"></div>
                <div className="p-4 flex flex-col flex-grow">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-3 bg-[#e8e8e8] rounded w-16 animate-pulse"></div>
                    <div className="h-4 bg-[#e8e8e8] rounded w-20 animate-pulse"></div>
                  </div>
                  <div className="h-5 bg-[#e8e8e8] rounded w-full mb-2 animate-pulse"></div>
                  <div className="h-5 bg-[#e8e8e8] rounded w-3/4 animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <NewsBlock title="ピックアップニュース" news={pickupNews} />
      <NewsBlock title="市場ニュース" news={marketNews} />
    </div>
  );
} 
