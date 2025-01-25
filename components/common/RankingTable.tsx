"use client";

import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRouter } from 'next/navigation';

interface BaseRankingData {
  code: string;
  name: string;
  diff_percent: number | null;
  current_price: number | null;
  created_at: string;
  updated_at: string;
}

interface ApiResponse {
  success: boolean;
  data?: BaseRankingData[];
  message?: string;
}

type RankingTableProps = {
  title: string;
  tableName: string;
  limit?: number;
};

const DEFAULT_LIMIT = 10;

const RankingTable = ({ title, tableName, limit = DEFAULT_LIMIT }: RankingTableProps) => {
  const router = useRouter();
  const [data, setData] = useState<BaseRankingData[]>([]);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
        
        const response = await fetch('/api/common/get-all', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            tableName,
            limit 
          }),
        });

        const result: ApiResponse = await response.json();

        if (!response.ok) {
          throw new Error(result.message || 'データの取得に失敗しました');
        }

        setData(result.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'エラーが発生しました');
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tableName, limit]);

  const getDiffPercentColor = (diffPercent: number | null) => {
    if (!diffPercent) return 'text-gray-600';
    if (diffPercent > 0) return 'text-red-600';
    if (diffPercent < 0) return 'text-blue-600';
    return 'text-gray-600';
  };

  const formatDiffPercent = (diffPercent: number | null): string => {
    if (diffPercent === null) return '-';
    const value: number = parseFloat(String(diffPercent));
    const sign = value > 0 ? '+' : '';
    return `${sign}${value}%`;
  };

  const handleItemClick = (code: string) => {
    router.push(`/${code}/news`);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="w-full max-w-2xl p-6 bg-white rounded-lg border border-gray-100 shadow-sm">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-3">
              {[...Array(limit)].map((_, index) => (
                <div key={`skeleton-${tableName}-${index}`} className="h-8 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full max-w-2xl bg-white rounded-lg border border-gray-100 shadow-sm">
        <div className="px-6 py-2 border-b border-gray-100">
          <div className="text-lg font-bold">{title}</div>
        </div>
        <div className="divide-y divide-gray-100">
          {error ? (
            <div key="error" className="px-6 py-8">
              <Alert>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
          ) : data.length === 0 ? (
            <div key="no-data" className="px-6 py-8 text-center text-gray-500">
              本日のデータはありません
            </div>
          ) : (
            data.map((item, index) => (
              <div 
                key={`${tableName}-${item.code}-${index}`}
                className="px-6 py-2 hover:bg-gray-50 transition-colors duration-150 cursor-pointer flex items-center"
                onClick={() => handleItemClick(item.code)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleItemClick(item.code);
                  }
                }}
              >
                <span className="text-2xl text-blue-600 min-w-12 mr-4 text-center flex justify-center items-center">
                  {index + 1}
                </span>
                <div className="flex-1 flex items-start justify-between">
                  <div className="flex flex-col">
                    <div className="text-gray-900">
                        <span className={`${getDiffPercentColor(item.diff_percent)}`}>
                        {formatDiffPercent(item.diff_percent)}
                      </span>
                    </div>
                    <div className="font-bold text-gray-600 text-sm mt-1">
                      {item.name}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return renderContent();
};

export default RankingTable;