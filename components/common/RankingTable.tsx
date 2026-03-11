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
    if (!diffPercent) return 'text-gray-400';
    if (diffPercent > 0) return 'text-red-500';
    if (diffPercent < 0) return 'text-blue-500';
    return 'text-gray-400';
  };

  const formatDiffPercent = (diffPercent: number | null): string => {
    if (diffPercent === null) return '-';
    const value: number = parseFloat(String(diffPercent));
    const sign = value > 0 ? '+' : '';
    return `${sign}${value}%`;
  };

  const getRankBadge = (index: number) => {
    if (index === 0) return 'bg-amber-500 text-white';
    if (index === 1) return 'bg-gray-400 text-white';
    if (index === 2) return 'bg-amber-700 text-white';
    return 'bg-gray-100 text-gray-500';
  };

  return (
    <div className="w-full bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold text-gray-900">{title}</div>
          <div className="text-[11px] text-gray-400">
            {tableName.startsWith('ranking_pts') ? '終値比' : '前日比'}
          </div>
        </div>
      </div>
      <div>
        {data.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-gray-400">
            本日のデータはありません
          </div>
        ) : (
          data.map((item: BaseRankingData, index: number) => (
            <Link
              key={`${tableName}-${item.code}-${index}`}
              href={`/stocks/${item.code}/news`}
              className="px-4 py-2 hover:bg-gray-50 transition-colors duration-150 cursor-pointer flex items-center border-b border-gray-50 last:border-b-0"
            >
              <div className={`w-5 h-5 rounded-md flex items-center justify-center mr-2.5 font-bold text-[10px] ${getRankBadge(index)}`}>
                {index + 1}
              </div>
              <div className="text-[11px] text-gray-400 mr-2 font-mono tabular-nums">
                {item.code}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-700 font-medium truncate">
                  {item.name}
                </div>
              </div>
              <div className={`text-right text-sm font-bold tabular-nums ${getDiffPercentColor(item.diff_percent)}`}>
                {formatDiffPercent(item.diff_percent)}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
