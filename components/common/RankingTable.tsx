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
    if (!diffPercent) return 'text-gray-600';
    if (diffPercent > 0) return 'text-red-500';
    if (diffPercent < 0) return 'text-blue-500';
    return 'text-gray-600';
  };

  const formatDiffPercent = (diffPercent: number | null): string => {
    if (diffPercent === null) return '-';
    const value: number = parseFloat(String(diffPercent));
    const sign = value > 0 ? '+' : '';
    return `${sign}${value}%`;
  };

  const getRankingStyle = (index: number) => {
    if (index < 3) { // 1-3位
      return 'bg-red-600 text-white';
    }
    return 'bg-gray-700 text-white'; // 4位以降
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-sm">
      <div className="px-4 py-2 border-b border-gray-100">
        <div className="flex items-center">
          <div className="text-sm font-bold">{title}</div>
          <div className="ml-2 text-xs text-gray-500">前日比</div>
        </div>
      </div>
      <div>
        {data.length === 0 ? (
          <div className="px-4 py-4 text-center text-xs text-gray-500">
            本日のデータはありません
          </div>
        ) : (
          data.map((item: BaseRankingData, index: number) => (
            <Link 
              key={`${tableName}-${item.code}-${index}`}
              href={`/${item.code}/news`}
              className={`px-4 py-2 hover:bg-gray-50 transition-colors duration-150 cursor-pointer flex items-center border-b border-gray-100 last:border-b-0 ${(index + 1) % 2 === 0 ? 'bg-gray-50' : ''}`}
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center mr-2 font-bold text-xs ${getRankingStyle(index)}`}>
                {index + 1}
              </div>
              <div className="text-xs text-gray-600 mr-2">
                {item.code}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-blue-600 font-medium truncate">
                  {item.name}
                </div>
              </div>
              <div className={`text-right text-sm font-bold ${getDiffPercentColor(item.diff_percent)}`}>
                {formatDiffPercent(item.diff_percent)}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}