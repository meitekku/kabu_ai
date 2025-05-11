"use client";

import { useEffect, useState } from 'react';
import RankingTable from './RankingTable';

interface BaseRankingData {
  code: string;
  name: string;
  diff_percent: number | null;
  current_price: number | null;
}

type RankingTableClientProps = {
  title: string;
  tableName: string;
  limit?: number;
  initialData?: BaseRankingData[];
};

export default function RankingTableClient({ title, tableName, limit = 10, initialData = [] }: RankingTableClientProps) {
  const [data, setData] = useState<BaseRankingData[]>(initialData);
  const [loading, setLoading] = useState(!initialData.length);

  useEffect(() => {
    if (initialData.length > 0) {
      setData(initialData);
      setLoading(false);
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
  }, [tableName, limit]);

  if (loading) {
    return (
      <div className="w-full bg-white rounded-lg shadow-sm p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[...Array(limit)].map((_, index) => (
              <div key={`skeleton-${index}`} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
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