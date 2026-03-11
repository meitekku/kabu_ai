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
    <Link href={articleHref} className="block h-full group">
      <div className="bg-white border border-gray-100 rounded-xl shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 overflow-hidden h-full flex flex-col">
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
            <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
              <span className="text-gray-500 text-sm font-medium text-center line-clamp-3">{safeTitle}</span>
            </div>
          )}
        </div>
        <div className="p-4 flex flex-col flex-grow">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] text-gray-400">
              {item.created_at ? new Date(item.created_at).toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
            </span>
            {item.company_name && (
              <span className="px-2 py-0.5 bg-gray-50 text-[10px] text-gray-500 rounded-md font-medium">
                {item.company_name}
              </span>
            )}
          </div>
          <h3 className="text-[15px] font-semibold text-gray-900 line-clamp-2 flex-grow group-hover:text-blue-600 transition-colors">
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
    <div className="mb-8 sm:mb-10">
      <h2 className="text-lg font-semibold text-gray-900 mb-5 pb-3 border-b border-gray-100">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
        {news.map((item) => (
          <NewsCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 sm:mb-10">
          <div className="h-6 bg-gray-100 rounded w-1/4 mb-5 animate-pulse"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {[...Array(4)].map((_, index) => (
              <div key={`skeleton-${index}`} className="bg-white border border-gray-100 rounded-xl overflow-hidden flex flex-col h-full">
                <div className="w-full h-40 sm:h-48 bg-gray-100 animate-pulse"></div>
                <div className="p-4 flex flex-col flex-grow">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-3 bg-gray-100 rounded w-16 animate-pulse"></div>
                    <div className="h-4 bg-gray-100 rounded w-20 animate-pulse"></div>
                  </div>
                  <div className="h-4 bg-gray-100 rounded w-full mb-2 animate-pulse"></div>
                  <div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mb-8 sm:mb-10">
          <div className="h-6 bg-gray-100 rounded w-1/4 mb-5 animate-pulse"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {[...Array(4)].map((_, index) => (
              <div key={`skeleton-${index}`} className="bg-white border border-gray-100 rounded-xl overflow-hidden flex flex-col h-full">
                <div className="w-full h-40 sm:h-48 bg-gray-100 animate-pulse"></div>
                <div className="p-4 flex flex-col flex-grow">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-3 bg-gray-100 rounded w-16 animate-pulse"></div>
                    <div className="h-4 bg-gray-100 rounded w-20 animate-pulse"></div>
                  </div>
                  <div className="h-4 bg-gray-100 rounded w-full mb-2 animate-pulse"></div>
                  <div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse"></div>
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
