import RankingTableClient, { type BaseRankingData, type RankingTableName } from '@/components/common/RankingTableClient'
import RandomAd from '@/components/common/RandomAd'

type SidebarProps = {
  rankingData?: Partial<Record<RankingTableName, BaseRankingData[]>>
  suspendFetch?: boolean
}

const rankingSections: Array<{
  title: string
  tableName: RankingTableName
  limit: number
}> = [
  { title: 'アクセスランキング', tableName: 'ranking_yahoo_post', limit: 5 },
  { title: '値上がり率ランキング', tableName: 'ranking_up', limit: 5 },
  { title: '値下がり率ランキング', tableName: 'ranking_low', limit: 5 },
  { title: 'ストップ高ランキング', tableName: 'ranking_stop_high', limit: 5 },
  { title: 'ストップ安ランキング', tableName: 'ranking_stop_low', limit: 5 },
  { title: '出来高ランキング', tableName: 'ranking_trading_value', limit: 5 },
  { title: 'PTS上昇率ランキング', tableName: 'ranking_pts_up', limit: 5 },
  { title: 'PTS下落率ランキング', tableName: 'ranking_pts_down', limit: 5 },
]

export default function Sidebar({ rankingData, suspendFetch = false }: SidebarProps) {
  return (
    <div className="space-y-6">
      <RandomAd />
      {rankingSections.map((section) => (
        <RankingTableClient
          key={section.tableName}
          title={section.title}
          tableName={section.tableName}
          limit={section.limit}
          initialData={rankingData?.[section.tableName]}
          suspendFetch={suspendFetch}
        />
      ))}
    </div>
  )
} 
