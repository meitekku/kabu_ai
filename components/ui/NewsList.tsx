'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ServerToDate } from '@/utils/format/ServerToDate';
import TodayArticleCopyButton from '@/components/parts/admin/TodayArticleCopyButton';
import { Badge } from "@/components/ui/badge";
import React from 'react';

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
  title?: string;
}

const NewsList = React.memo(({ num = '10', title }: NewsListProps) => {
  const params = useParams();
  const code = params.code as string;
  const limit = parseInt(num);

  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(1);
  const daysRef = React.useRef(days);

  // ステータスラベルの定義
  const statusLabels = React.useMemo<StatusLabels>(() => ({
    price_up: { label: '株価上昇', color: 'bg-red-500 text-white' },
    price_down: { label: '株価下落', color: 'bg-blue-500 text-white' },
    volume_up: { label: '出来高増加', color: 'bg-red-500 text-white' },
    news: { label: 'ニュース', color: 'bg-purple-500 text-white' },
    human: { label: 'ピックアップ', color: 'bg-yellow-500 text-black' },
    settlement: { label: '決算', color: 'bg-orange-500 text-white' }
  }), []);

  const fetchNews = React.useCallback(async () => {
    if (!code) return;
    
    console.log('fetchNews called with:', { code, limit, days: daysRef.current });
    try {
      setLoading(true);
      const response = await fetch(`/api/${code}/news`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, limit, days: daysRef.current }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch news');
      }
      const data = await response.json();
      setNews(data.data || []);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [code, limit]);

  // 初回マウント時とcode/limitが変更された時のみ実行
  useEffect(() => {
    console.log('useEffect triggered with:', { code, limit });
    fetchNews();
  }, [fetchNews, code, limit]);

  // 日数変更ハンドラー
  const handleDaysChange = React.useCallback((selectedDays: number) => {
    console.log('handleDaysChange called with:', selectedDays);
    if (selectedDays === daysRef.current) return;
    daysRef.current = selectedDays;
    setDays(selectedDays);
    fetchNews();
  }, [fetchNews]);

  // ステータスからラベルを生成する関数
  const renderStatusLabels = React.useCallback((statusJson?: string) => {
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
                  className={`text-[10px] px-0.5 py-0 rounded-none ${statusLabels[key].color}`}
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
  }, [statusLabels]);

  if (loading) return null;
  if (error) {
    return <div className="text-red-500 p-4">Error: {error}</div>;
  }

  if (!news || news.length === 0) {
    return <div className="text-gray-500 p-4">まだニュースがありません。</div>;
  }

  return (
    <div>
      {title && (
        <h2 className="text-xl font-bold text-gray-900 mt-4 mb-2">{title}</h2>
      )}
      {code === 'all' && (
        <div className="flex justify-end mb-4">
          <TodayArticleCopyButton 
            articles={news} 
            onDaysChange={handleDaysChange} 
          />
        </div>
      )}
      
      <div className="divide-y divide-gray-100">
        {news.map((item) => (
          <Link 
            href={`/${code}/news/article/${item.id}`}
            key={item.id}
            className="block"
          >
            <Card className="rounded-lg bg-card text-card-foreground hover:bg-gray-50 transition-colors cursor-pointer border-0 shadow-none">
              <CardContent className="py-1 px-0 sm:py-3 sm:px-2">
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
});

NewsList.displayName = 'NewsList';

export default NewsList;