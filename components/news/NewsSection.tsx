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
            limit: 3
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
            <Link href={`/${item.code}/news/article/${item.id}`} key={item.id} className="block">
              <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow overflow-hidden">
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
                <div className="p-2">
                  <h3 className="font-medium text-gray-900 line-clamp-3">{item.title}</h3>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      {new Date(item.created_at).toLocaleDateString('ja-JP')}
                    </span>
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

  return (
    <div className="max-w-7xl mx-auto">
      <NewsBlock title="ピックアップニュース" news={pickupNews} />
      <NewsBlock title="市場ニュース" news={marketNews} />
    </div>
  );
} 