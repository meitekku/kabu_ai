'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ServerToDate } from '@/utils/format/ServerToDate';
import TodayArticleCopyButton from '@/components/parts/admin/TodayArticleCopyButton';
import { Badge } from "@/components/ui/badge";

interface NewsItem {
  id: number;
  code: string;
  title: string;
  content: string;
  created_at: string;
  company_name: string;
  status?: string;
}

interface StatusLabels {
  [key: string]: {
    label: string;
    color: string;
  }
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

  // ステータスラベルの定義
  const statusLabels: StatusLabels = {
    price_up: { label: '株価上昇', color: 'bg-red-500 text-white' },
    price_down: { label: '株価下落', color: 'bg-blue-500 text-white' },
    volume_up: { label: '出来高増加', color: 'bg-red-500 text-white' },
    news: { label: 'ニュース', color: 'bg-purple-500 text-white' },
    human: { label: 'ピックアップ', color: 'bg-yellow-500 text-black' },
    settlement: { label: '決算', color: 'bg-orange-500 text-white' }
  };

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

  // ステータスからラベルを生成する関数
  const renderStatusLabels = (statusJson?: string) => {
    if (!statusJson) return null;
    
    try {
      const statusObj = JSON.parse(statusJson);
      return (
        <div className="flex flex-wrap gap-1">
          {Object.keys(statusObj).map(key => {
            if (statusLabels[key]) {
              // 決算の場合は日数を表示
              let label = statusLabels[key].label;
              if (key === 'settlement' && typeof statusObj[key] === 'number') {
                const days = statusObj[key];
                if (days > 0) {
                  label = `決算後${days}日`;
                } else if (days < 0) {
                  label = `決算${Math.abs(days)}日前`;
                } else {
                  label = '決算日';
                }
              }
              
              return (
                <Badge 
                  key={key} 
                  className={`text-xs px-2 ${statusLabels[key].color}`}
                >
                  {label}
                </Badge>
              );
            }
            return null;
          })}
        </div>
      );
    } catch (e) {
      console.error('Error parsing status JSON:', e);
      return null;
    }
  };

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
    <div className="space-y-4">
      {code === 'all' && (
        <div className="flex justify-end mb-4">
          <TodayArticleCopyButton articles={news} />
        </div>
      )}
      
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
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-gray-500">
                      {ServerToDate(item.created_at)}
                    </span>
                    {renderStatusLabels(item.status)}
                  </div>
                  <div className="font-bold text-base text-gray-900 mt-0.5">{item.title}</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default NewsList;