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
      <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow overflow-hidden h-full flex flex-col">
        <div className="relative w-full aspect-[2/1]">
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
            <div className="w-full h-full bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-3 sm:p-4">
              <span className="text-red-400 text-xs sm:text-sm font-medium text-center line-clamp-3">{safeTitle}</span>
            </div>
          )}
        </div>
        <div className="p-2 flex flex-col flex-grow">
          <h3 className="text-sm sm:text-base font-medium text-gray-900 line-clamp-2 flex-grow">{safeTitle}</h3>
          <div className="mt-1 sm:mt-2 flex items-center justify-end">
            {item.company_name && (
              <span className="text-xs sm:text-sm text-gray-600 line-clamp-1">{item.company_name}</span>
            )}
          </div>
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
    <div className="mb-5 sm:mb-8">
      <h2 className="text-lg sm:text-xl font-bold mb-2">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
        {news.map((item) => (
          <NewsCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-5 sm:mb-8">
          <div className="h-5 sm:h-6 bg-gray-200 rounded w-1/3 sm:w-1/4 mb-3 sm:mb-4 animate-pulse"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
            {[...Array(2)].map((_, index) => (
              <div key={`skeleton-${index}`} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="w-full aspect-[2/1] bg-gray-200 animate-pulse"></div>
                <div className="p-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mb-5 sm:mb-8">
          <div className="h-5 sm:h-6 bg-gray-200 rounded w-1/3 sm:w-1/4 mb-3 sm:mb-4 animate-pulse"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
            {[...Array(2)].map((_, index) => (
              <div key={`skeleton-${index}`} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="w-full aspect-[2/1] bg-gray-200 animate-pulse"></div>
                <div className="p-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
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
