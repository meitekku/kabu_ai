import RankingTable from './RankingTable';

export const revalidate = 1800; // 30分ごとに再検証

async function getRankingData(tableName: string) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/common/get-all`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ tableName, limit: 10 }),
    next: { revalidate: 1800 }, // 30分ごとに更新
  });
  console.log('rankingPage');

  if (!response.ok) {
    throw new Error('データの取得に失敗しました');
  }

  return response.json();
}

export default async function RankingPage() {
  const [upData, lowData] = await Promise.all([
    getRankingData('ranking_up'),
    getRankingData('ranking_low'),
  ]);

  return (
    <div className="container mx-auto py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <RankingTable
          title="上昇率ランキング"
          tableName="ranking_up"
          data={upData.data}
        />
        <RankingTable
          title="下落率ランキング"
          tableName="ranking_low"
          data={lowData.data}
        />
      </div>
    </div>
  );
} 