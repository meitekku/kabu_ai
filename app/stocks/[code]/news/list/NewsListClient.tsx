'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from "@/components/ui/card";
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

interface PaginationData {
  currentPage: number;
  totalPages: number;
  totalItems: number;
}

export default function NewsListClient() {
  const params = useParams();
  const searchParams = useSearchParams();
  const code = params.code as string;
  const currentPage = parseInt(searchParams.get('page') || '1');

  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationData>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0
  });

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

    try {
      setLoading(true);
      const response = await fetch(`/api/stocks/${code}/news`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          limit: 20,
          page: currentPage
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch news');
      }
      const data = await response.json();
      setNews(data.data || []);
      setPagination(data.pagination || {
        currentPage: 1,
        totalPages: 1,
        totalItems: 0
      });
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [code, currentPage]);

  useEffect(() => {
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

  // ページネーションのリンクを生成
  const generatePaginationLinks = () => {
    const links = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(pagination.totalPages, startPage + maxVisiblePages - 1);

    // 調整: 最後のページ付近の場合
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // 前のページ
    if (currentPage > 1) {
      links.push(
        <Link
          key="prev"
          href={`/stocks/${code}/news/list?page=${currentPage - 1}`}
          className="px-3 py-2 text-sm border border-gray-300 bg-white hover:bg-gray-50 rounded-md"
        >
          前へ
        </Link>
      );
    }

    // ページ番号
    for (let i = startPage; i <= endPage; i++) {
      links.push(
        <Link
          key={i}
          href={`/stocks/${code}/news/list?page=${i}`}
          className={`px-3 py-2 text-sm border border-gray-300 rounded-md ${
            i === currentPage
              ? 'bg-blue-500 text-white border-blue-500'
              : 'bg-white hover:bg-gray-50'
          }`}
        >
          {i}
        </Link>
      );
    }

    // 次のページ
    if (currentPage < pagination.totalPages) {
      links.push(
        <Link
          key="next"
          href={`/stocks/${code}/news/list?page=${currentPage + 1}`}
          className="px-3 py-2 text-sm border border-gray-300 bg-white hover:bg-gray-50 rounded-md"
        >
          次へ
        </Link>
      );
    }

    return links;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 p-4">Error: {error}</div>;
  }

  if (!news || news.length === 0) {
    return <div className="text-gray-500 p-4">まだニュースがありません。</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        ニュース一覧 (全{pagination.totalItems}件)
      </h1>

      <div className="divide-y divide-gray-100">
        {news.map((item) => (
          <Link
            href={`/stocks/${code}/news/${item.id}`}
            key={item.id}
            className="block"
          >
            <Card className="rounded-lg bg-card text-card-foreground hover:bg-gray-50 transition-colors cursor-pointer border-0 shadow-none">
              <CardContent className="py-3 px-2">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-gray-500">
                      {item.created_at}
                    </span>
                    {renderStatusLabels(item.status)}
                  </div>
                  <div className="font-bold text-base text-gray-900 mt-1">{item.title}</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* ページネーション */}
      {pagination.totalPages > 1 && (
        <div className="mt-8 flex justify-center">
          <div className="flex gap-2">
            {generatePaginationLinks()}
          </div>
        </div>
      )}
    </div>
  );
}
