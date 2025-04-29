import RankingTable from './RankingTable';

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

async function getRankingData(tableName: string, limit: number): Promise<{ data: BaseRankingData[] }> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/common/get-all`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ tableName, limit }),
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error('データの取得に失敗しました');
  }

  return response.json();
}

export default async function RankingTableServer({ title, tableName, limit = 10 }: RankingTableServerProps) {
  const { data } = await getRankingData(tableName, limit);

  return (
    <RankingTable
      title={title}
      tableName={tableName}
      data={data}
      limit={limit}
    />
  );
} 