'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ServerToDate } from '@/utils/format/ServerToDate';

interface NewsItem {
  id: number;
  code: string;
  title: string;
  created_at: string;
  company_name: string;
}

interface NewsListProps {
  num?: string;
}

const NewsList = ({ num = '10' }: NewsListProps) => {
  const params = useParams();
  const code = params.code as string;
  const limit = parseInt(num);

  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await fetch(`/api/${code}/news`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code, limit }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch news');
        }
        const data = await response.json();
        console.log(data);
        setNews(data.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (code) {
      fetchNews();
    }
  }, [code, limit]);

  if (loading) {
    return <div className="flex justify-center p-8">Loading news...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-4">Error: {error}</div>;
  }

  if (!news || news.length === 0) {
    return <div className="text-gray-500 p-4">No news available.</div>;
  }

  return (
    <div className="space-y-0 divide-y divide-gray-100">
      {news.map((item) => (
        <Link 
          href={`/${code}/news/article/${item.id}`}
          key={item.id}
          className="block"
        >
          <Card className="hover:bg-gray-50 transition-colors cursor-pointer border-0 shadow-none">
            <CardContent className="py-2 px-2">
              <div className="flex flex-col">
                <div className="text-sm text-gray-500">
                  {ServerToDate(item.created_at)}
                </div>
                <div className="text-base text-gray-900 mt-0.5">{item.title}</div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
};

export default NewsList;