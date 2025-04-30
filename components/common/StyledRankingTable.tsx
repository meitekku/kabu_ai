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

const StyledRankingTable = ({ title, tableName, limit = DEFAULT_LIMIT }: RankingTableProps) => {
  const router = useRouter();
  const [data, setData] = useState<BaseRankingData[]>([]);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
        console.log('sidebar');
        
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
        console.log('sidebar2');

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
    if (diffPercent > 0) return 'text-red-500';
    if (diffPercent < 0) return 'text-blue-500';
    return 'text-gray-600';
  };

  const formatDiffPercent = (diffPercent: number | null): string => {
    if (diffPercent === null) return '-';
    const value: number = parseFloat(String(diffPercent));
    const sign = value > 0 ? '+' : '';
    return `${sign}${value}円`;
  };

  const handleItemClick = (code: string) => {
    router.push(`/${code}/news`);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="w-full max-w-2xl p-6 bg-white rounded-lg shadow-sm">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-3">
              {[...Array(limit)].map((_, index) => (
                <div key={`skeleton-${tableName}-${index}`} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center">
            <h3 className="text-xl font-bold">{title}</h3>
          </div>
        </div>
        <div>
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
                className={`px-6 py-4 hover:bg-gray-50 transition-colors duration-150 cursor-pointer flex items-center border-b border-gray-100 last:border-b-0 ${(index + 1) % 2 === 0 ? 'bg-gray-50' : ''}`}
                onClick={() => handleItemClick(item.code)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleItemClick(item.code);
                  }
                }}
              >
                <div className="w-8 text-center font-bold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="text-gray-600">
                    {item.name}
                  </div>
                  <div className="text-sm text-gray-500">
                    {item.code}
                  </div>
                </div>
                <div className="text-right text-lg font-bold text-gray-800">
                  {item.current_price ? `${item.current_price}円` : '-'}
                </div>
                <div className={`text-right text-lg font-bold ${getDiffPercentColor(item.diff_percent)}`}>
                  {formatDiffPercent(item.diff_percent)}
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

export default StyledRankingTable; 