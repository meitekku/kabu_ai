import Link from 'next/link';

interface BaseRankingData {
  code: string;
  name: string;
  diff_percent: number | null;
  current_price: number | null;
}

type RankingTableProps = {
  title: string;
  tableName: string;
  data: BaseRankingData[];
  limit?: number;
};

export default function RankingTable({ title, tableName, data }: RankingTableProps) {
  const getDiffPercentColor = (diffPercent: number | null) => {
    if (!diffPercent) return 'text-shikiho-text-tertiary';
    // 日本株式市場の慣習: 上昇=赤、下落=青
    if (diffPercent > 0) return 'text-[#cc0000]';
    if (diffPercent < 0) return 'text-[#0066cc]';
    return 'text-shikiho-text-tertiary';
  };

  const formatDiffPercent = (diffPercent: number | null): string => {
    if (diffPercent === null) return '-';
    const value: number = parseFloat(String(diffPercent));
    const sign = value > 0 ? '+' : '';
    return `${sign}${value}%`;
  };

  const getRankBadge = (index: number) => {
    // 楽天証券スタイル: 1-3位は赤バッジ、4位以降はグレー
    if (index < 3) return 'bg-[#cc0000] text-white';
    return 'bg-[#dedede] text-[#707070]';
  };

  return (
    <div className="w-full bg-white rounded-sm shadow-shikiho-sm border border-[#e5e5e5] overflow-hidden">
      {/* ヘッダー: 楽天証券スタイルのグレー背景 */}
      <div className="px-3 py-2 border-b border-[#e5e5e5] bg-[#f5f5f5]">
        <div className="flex items-center gap-1.5">
          <div className="text-[13px] font-bold text-shikiho-text-primary">{title}</div>
          <div className="text-[11px] text-shikiho-text-tertiary">
            {tableName.startsWith('ranking_pts') ? '終値比' : '前日比'}
          </div>
        </div>
      </div>

      <div>
        {data.length === 0 ? (
          <div className="px-3 py-5 text-center text-[12px] text-shikiho-text-tertiary">
            本日のデータはありません
          </div>
        ) : (
          data.map((item: BaseRankingData, index: number) => (
            <Link
              key={`${tableName}-${item.code}-${index}`}
              href={`/stocks/${item.code}/news`}
              className="px-3 py-2 hover:bg-[#f9f9f9] transition-colors duration-100 cursor-pointer flex items-center border-b border-[#eeeeee] last:border-b-0"
            >
              {/* ランクバッジ */}
              <div className={`w-[18px] h-[18px] rounded-sm flex items-center justify-center mr-2 font-bold text-[10px] flex-shrink-0 ${getRankBadge(index)}`}>
                {index + 1}
              </div>
              {/* 銘柄コード */}
              <div className="text-[11px] text-shikiho-text-secondary mr-2 font-mono tabular-nums w-[30px] flex-shrink-0">
                {item.code}
              </div>
              {/* 銘柄名 */}
              <div className="flex-1 min-w-0 pr-1">
                <div className="text-[12px] text-shikiho-text-primary font-medium truncate">
                  {item.name}
                </div>
              </div>
              {/* 変化率 */}
              <div className={`text-right text-[13px] font-bold tabular-nums flex-shrink-0 ${getDiffPercentColor(item.diff_percent)}`}>
                {formatDiffPercent(item.diff_percent)}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
