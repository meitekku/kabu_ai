'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Badge } from "@/components/ui/badge";
import { NewsListSkeleton } from '@/components/stocks/news/NewsPageSkeleton';

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
  excludeId?: string;
  h3Title?: string;
  showMoreButton?: boolean;
  code?: string;
}

const NewsList = React.memo(({ num = '10', title, excludeId, h3Title, showMoreButton = false, code: codeProp }: NewsListProps) => {
  const params = useParams();
  const code = codeProp || (params.code as string);
  const limit = parseInt(num);

  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    
    console.log('fetchNews called with:', { code, limit, excludeId });
    try {
      setLoading(true);
      const response = await fetch(`/api/stocks/${code}/news`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, limit, excludeId }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch news');
      }
      const data = await response.json();
      setNews(data.data || []);
      // データ取得後にcreated_atを表示
      (data.data || []).forEach((item: NewsItem) => {
        console.log('created_at:', item.created_at);
      });
      setError(null);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [code, limit, excludeId]);

  // 初回マウント時とcode/limitが変更された時のみ実行
  useEffect(() => {
    console.log('useEffect triggered with:', { code, limit });
    fetchNews();
  }, [fetchNews, code, limit]);

  // ニュースデータが更新されたときにcreated_atを表示
  useEffect(() => {
    news.forEach(item => {
      console.log('created_at:', item.created_at);
    });
  }, [news]);


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

  if (loading) {
    const skeletonRows = Number.isFinite(limit)
      ? Math.min(12, Math.max(1, limit))
      : 10;

    return (
      <NewsListSkeleton
        title={title}
        h3Title={h3Title}
        rowCount={skeletonRows}
        showMoreButton={showMoreButton}
      />
    );
  }
  if (error) {
    return <div className="text-shikiho-negative p-4">Error: {error}</div>;
  }

  if (!news || news.length === 0) {
    return <div className="text-muted-foreground p-4">まだニュースがありません。</div>;
  }

  return (
    <div data-testid="news-list" className="bg-white animate-in fade-in duration-200">
      {h3Title && (
        <h3 className="text-[18px] font-bold text-shikiho-text-primary mb-4 pb-2 border-b border-shikiho-bg-border relative before:absolute before:bottom-[-1px] before:left-0 before:w-10 before:h-[2px] before:bg-[#1a1a1a]">{h3Title}</h3>
      )}
      {title && (
        <h2 className="text-[20px] font-bold text-shikiho-text-primary mt-4 mb-5 pb-2 border-b border-shikiho-bg-border relative before:absolute before:bottom-[-1px] before:left-0 before:w-12 before:h-[2px] before:bg-[#1a1a1a]">{title}</h2>
      )}
      
      <div className="border-t border-shikiho-bg-border">
        {news.map((item) => (
          <Link 
            href={`/stocks/${code}/news/${item.id}`}
            key={item.id}
            className="block"
          >
            <div className="py-3.5 border-b border-shikiho-bg-gray-light hover:bg-shikiho-bg-gray-light transition-colors cursor-pointer">
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-[11px] text-shikiho-text-tertiary">
                    {item.created_at}
                  </span>
                  {renderStatusLabels(item.status)}
                </div>
                <div className="font-bold text-[15px] text-shikiho-text-primary mt-0.5 hover:text-shikiho-link-primary">{item.title.replace(/【[^】]*】/g, '')}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
      
      {showMoreButton && code && (
        <div className="text-right mt-4">
          <Link 
            href={`/stocks/${code}/news/list`}
            className="font-bold text-shikiho-link-primary hover:text-shikiho-link-secondary text-[14px]"
          >
            もっとみる ›
          </Link>
        </div>
      )}
    </div>
  );
});

NewsList.displayName = 'NewsList';

export default NewsList;
