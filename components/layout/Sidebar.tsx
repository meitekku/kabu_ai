import RankingTableClient from '@/components/common/RankingTableClient'
import GoogleAdsense from '@/components/common/GoogleAdsense'

export default function Sidebar() {
  return (
    <aside className="w-full md:w-[300px] space-y-6">
      <GoogleAdsense />
      <RankingTableClient 
        title="アクセスランキング"
        tableName="ranking_yahoo_post"
        limit={5}
      />
      <RankingTableClient 
        title="値上がり率ランキング"
        tableName="ranking_up"
        limit={5}
      />
      <RankingTableClient 
        title="値下がり率ランキング"
        tableName="ranking_low"
        limit={5}
      />
      <RankingTableClient 
        title="ストップ高ランキング"
        tableName="ranking_stop_high"
        limit={5}
      />
      <RankingTableClient 
        title="ストップ安ランキング"
        tableName="ranking_stop_low"
        limit={5}
      />
      <RankingTableClient 
        title="出来高ランキング"
        tableName="ranking_trading_value"
        limit={5}
      />
    </aside>
  )
} 