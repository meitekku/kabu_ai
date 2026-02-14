'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import Link from 'next/link';
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

const AllArticleAdminPage = () => {
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
    console.log('fetchNews called with days:', daysRef.current);
    try {
      setLoading(true);
      const response = await fetch('/api/stocks/all/news', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: 'all', limit: 100, days: daysRef.current }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch news');
      }
      const data = await response.json();
      
      // 当日15:30以降の記事のみフィルタリング
      const today = new Date();
      const cutoffTime = new Date(today);
      cutoffTime.setHours(15, 30, 0, 0);
      
      const filteredNews = (data.data || []).filter((item: NewsItem) => {
        const createdAt = new Date(item.created_at);
        return createdAt >= cutoffTime;
      });
      
      setNews(filteredNews);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  // 初回マウント時に実行
  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

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

  if (loading) return <div className="p-4">読み込み中...</div>;
  if (error) {
    return <div className="text-red-500 p-4">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">全記事管理 - 当日15:30以降</h1>
      
      <div className="flex justify-end mb-4">
        <TodayArticleCopyButton 
          articles={news} 
          onDaysChange={handleDaysChange} 
        />
      </div>
      
      {!news || news.length === 0 ? (
        <div className="text-gray-500 p-4">当日15:30以降のニュースがありません。</div>
      ) : (
        <div className="divide-y divide-gray-100">
          {news.map((item) => (
            <Link 
              href={`/stocks/all/news/${item.id}`}
              key={item.id}
              className="block"
            >
              <Card className="rounded-lg bg-card text-card-foreground hover:bg-gray-50 transition-colors cursor-pointer border-0 shadow-none">
                <CardContent className="py-1 px-0 sm:py-3 sm:px-2">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-gray-500">
                        {item.created_at}
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
      )}
    </div>
  );
};

export default AllArticleAdminPage;