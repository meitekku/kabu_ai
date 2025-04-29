"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface Post {
  id: number;
  code: string;
  title: string;
  content: string;
  created_at: string;
  company_name: string;
  site: number;
  image_url?: string;
}

export default function NewsSection() {
  const [pickupNews, setPickupNews] = useState<Post[]>([]);
  const [marketNews, setMarketNews] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, []);

  const NewsBlock = ({ title, news }: { title: string; news: Post[] }) => (
    <div className="mb-8">
      <h2 className="text-xl font-bold mb-2">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {news.map((item) => {
          const imageMatch = item.content.match(/<img[^>]+src=['"]([^'">]+)['"]/);
          const imageUrl = imageMatch ? imageMatch[1] : null;

          return (
            <Link href={`/${item.code}/news/article/${item.id}`} key={item.id} className="block h-full">
              <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow overflow-hidden h-full flex flex-col">
                <div className="relative w-full aspect-[2/1]">
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={item.title}
                      fill
                      className="object-cover object-top"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-400">No Image</span>
                    </div>
                  )}
                </div>
                <div className="p-2 flex flex-col flex-grow">
                  <h3 className="font-medium text-gray-900 line-clamp-3 flex-grow">{item.title}</h3>
                  <div className="mt-2 flex items-center justify-end">
                    {item.company_name && (
                      <span className="text-sm text-gray-600">{item.company_name}</span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4 animate-pulse"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        <div className="mb-8">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4 animate-pulse"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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