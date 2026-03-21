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

export default function RankingTable({ tableName, data }: RankingTableProps) {
  const getDiffPercentColor = (diffPercent: number | null) => {
    if (!diffPercent) return 'text-muted-foreground';
    if (diffPercent > 0) return 'text-shikiho-negative';
    if (diffPercent < 0) return 'text-primary';
    return 'text-muted-foreground';
  };

  const formatDiffPercent = (diffPercent: number | null): string => {
    if (diffPercent === null) return '-';
    const value: number = parseFloat(String(diffPercent));
    const sign = value > 0 ? '+' : '';
    return `${sign}${value}%`;
  };

  const getRankBadge = (index: number) => {
    if (index === 0) return 'bg-[#cc0000] text-white';
    if (index === 1) return 'bg-[#333333] text-white';
    if (index === 2) return 'bg-[#666666] text-white';
    return 'bg-secondary text-muted-foreground';
  };

  return (
    <div className="w-full bg-card rounded border border-[#e5e5e5] overflow-hidden shadow-sm">
      <div>
        {data.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-muted-foreground">
            本日のデータはありません
          </div>
        ) : (
          data.map((item: BaseRankingData, index: number) => (
            <Link
              key={`${tableName}-${item.code}-${index}`}
              href={`/stocks/${item.code}/news`}
              className={`px-2 py-1.5 hover:bg-[#f0f0f0] hover:text-[#cc0000] transition-colors duration-150 cursor-pointer flex items-center border-b border-[#e5e5e5] last:border-b-0 ${index === 0 ? 'bg-[#cc0000]/5' : index % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]'}`}
            >
              <div className={`${index === 0 ? 'w-5 h-5' : 'w-[18px] h-[18px]'} rounded flex items-center justify-center mr-2 font-bold text-[9px] ${getRankBadge(index)}`}>
                {index + 1}
              </div>
              <div className="text-[10px] text-[#999] mr-1.5 font-mono tabular-nums">
                {item.code}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-foreground font-medium truncate">
                  {item.name}
                </div>
              </div>
              <div className={`text-right text-xs font-bold tabular-nums ${getDiffPercentColor(item.diff_percent)}`}>
                {formatDiffPercent(item.diff_percent)}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
