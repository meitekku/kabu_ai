import DefaultTemplate from "@/components/template/DefaultTemplate";
import { Metadata } from 'next';
import RankingTable from '@/components/common/RankingTable';

export const metadata: Metadata = {
  title: '株AIトップページ',
  description: '株AIは株式投資の分析・判断をサポートするAIツールです。',
}

const ITEMS_PER_RANKING = 5;

const rankingConfigs = [
  {
    tableName: 'ranking_access',
    title: 'アクセスランキング'
  },
  {
    tableName: 'ranking_yahoo_post',
    title: 'Yahoo掲示板投稿ランキング'
  },
  {
    tableName: 'ranking_up',
    title: '値上がり率ランキング'
  },
  {
    tableName: 'ranking_low',
    title: '値下がり率ランキング'
  },
  {
    tableName: 'ranking_stop_high',
    title: 'ストップ高ランキング'
  },
  {
    tableName: 'ranking_stop_low',
    title: 'ストップ安ランキング'
  },
  {
    tableName: 'ranking_trading_value',
    title: '出来高ランキング'
  }
];

export default function Home() {
  return (
    <DefaultTemplate>
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">株式市場の最新動向</h1>
          <p className="text-gray-600">
            各種ランキングから、市場の動きをリアルタイムで把握できます。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {rankingConfigs.map((config) => (
            <div key={config.tableName} className="w-full">
              <RankingTable 
                title={config.title}
                tableName={config.tableName}
                limit={ITEMS_PER_RANKING}
              />
            </div>
          ))}
        </div>

        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            株AIは現在も開発を続けており、新規機能を随時追加しています。
            より使いやすく、より役立つサービスを目指して改善を重ねてまいります。
          </p>
        </div>
      </div>
    </DefaultTemplate>
  );
}