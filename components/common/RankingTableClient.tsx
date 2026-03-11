"use client";

import { useEffect, useState } from 'react';
import RankingTable from './RankingTable';

export interface BaseRankingData {
  code: string;
  name: string;
  diff_percent: number | null;
  current_price: number | null;
}

export type RankingTableName =
  | 'ranking_yahoo_post'
  | 'ranking_access'
  | 'ranking_up'
  | 'ranking_low'
  | 'ranking_stop_high'
  | 'ranking_stop_low'
  | 'ranking_trading_value'
  | 'ranking_pts_up'
  | 'ranking_pts_down';

type RankingTableClientProps = {
  title: string;
  tableName: string;
  limit?: number;
  initialData?: BaseRankingData[];
  suspendFetch?: boolean;
};

export default function RankingTableClient({
  title,
  tableName,
  limit = 10,
  initialData,
  suspendFetch = false,
}: RankingTableClientProps) {
  const [data, setData] = useState<BaseRankingData[]>(initialData ?? []);
  const [loading, setLoading] = useState(initialData === undefined);

  useEffect(() => {
    if (initialData !== undefined) {
      setData(initialData);
      setLoading(false);
      return;
    }

    if (suspendFetch) {
      setLoading(true);
      return;
    }

    const fetchData = async () => {
      try {
        const response = await fetch('/api/common/get-all', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ tableName, limit: limit + 2 }),
          next: { revalidate: 1800 }, // 30分ごとに更新
        });
        console.log('rankingTableClient');

        if (!response.ok) {
          throw new Error('データの取得に失敗しました');
        }

        const result = await response.json();
        // 会社名がないデータをスキップして上位5件までに制限
        const filteredData = result.data
          .filter((item: BaseRankingData) => item.name)
          .slice(0, 5);
        setData(filteredData);
      } catch (error) {
        console.error('Error fetching data:', error);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [initialData, tableName, limit, suspendFetch]);

  if (loading) {
    return (
      <div className="w-full bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-100">
          <div className="animate-pulse flex items-center gap-2">
            <div className="h-4 bg-gray-100 rounded w-24"></div>
            <div className="h-3 bg-gray-100 rounded w-10"></div>
          </div>
        </div>
        <div>
          {[...Array(5)].map((_, index) => (
            <div
              key={`skeleton-${tableName}-${index}`}
              className="px-4 py-2 flex items-center border-b border-gray-50 last:border-b-0"
            >
              <div className="w-5 h-5 rounded-md bg-gray-100 mr-2.5 flex-shrink-0 animate-pulse"></div>
              <div className="h-3 bg-gray-100 rounded w-8 mr-2 flex-shrink-0 animate-pulse"></div>
              <div className="flex-1 min-w-0">
                <div className="h-3 bg-gray-100 rounded w-4/5 max-w-[150px] animate-pulse"></div>
              </div>
              <div className="h-4 bg-gray-100 rounded w-12 ml-3 flex-shrink-0 animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <RankingTable
      title={title}
      tableName={tableName}
      data={data}
      limit={limit}
    />
  );
}
