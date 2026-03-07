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
      <div className="w-full bg-white rounded-md shadow-shikiho-sm border border-shikiho-bg-border-light overflow-hidden">
        <div className="px-4 py-3 border-b border-shikiho-bg-border bg-shikiho-bg-gray-light">
          <div className="animate-pulse flex items-center gap-2">
            <div className="h-4 bg-[#e8e8e8] rounded w-24"></div>
            <div className="h-3 bg-[#e8e8e8] rounded w-10"></div>
          </div>
        </div>
        <div className="animate-pulse">
          {[...Array(5)].map((_, index) => (
            <div
              key={`skeleton-${tableName}-${index}`}
              className={`px-4 py-3 flex items-center border-b border-shikiho-bg-border-light last:border-b-0`}
            >
              <div className="w-[22px] h-[22px] rounded bg-[#e8e8e8] mr-3 flex-shrink-0"></div>
              <div className="h-3 bg-[#e8e8e8] rounded w-8 mr-3 flex-shrink-0"></div>
              <div className="flex-1 min-w-0 pr-2">
                <div className="h-4 bg-[#e8e8e8] rounded w-4/5 max-w-[150px]"></div>
              </div>
              <div className="h-5 bg-[#e8e8e8] rounded w-12 flex-shrink-0"></div>
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
