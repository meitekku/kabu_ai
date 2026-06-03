import { unstable_cache } from 'next/cache';
import RankingTableClient from './RankingTableClient';

interface BaseRankingData {
  code: string;
  name: string;
  diff_percent: number | null;
  current_price: number | null;
}

type RankingTableServerProps = {
  title: string;
  tableName: string;
  limit?: number;
};

const getCachedData = unstable_cache(
  async (tableName: string, limit: number) => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/common/get-all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tableName, limit }),
      next: { revalidate: 1800 }, // 30分ごとに更新
    });
    console.log('rankingTableServer');

    if (!response.ok) {
      throw new Error('データの取得に失敗しました');
    }

    const result = await response.json();
    return result.data as BaseRankingData[];
  },
  ['ranking-data'],
  { revalidate: 1800 } // 30分ごとに更新
);

export default async function RankingTableServer({ title, tableName, limit = 10 }: RankingTableServerProps) {
  const data = await getCachedData(tableName, limit);

  return (
    <RankingTableClient
      title={title}
      tableName={tableName}
      initialData={data}
      limit={limit}
    />
  );
} 