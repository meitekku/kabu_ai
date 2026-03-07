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
    if (diffPercent > 0) return 'text-shikiho-positive';
    if (diffPercent < 0) return 'text-shikiho-negative';
    return 'text-shikiho-text-tertiary';
  };

  const formatDiffPercent = (diffPercent: number | null): string => {
    if (diffPercent === null) return '-';
    const value: number = parseFloat(String(diffPercent));
    const sign = value > 0 ? '+' : '';
    return `${sign}${value}%`;
  };

  const getRankingStyle = (index: number) => {
    if (index < 3) { // 1-3位
      return 'bg-shikiho-accent-red-light text-white';
    }
    return 'bg-[#dedede] text-[#707070]'; // 4位以降
  };

  return (
    <div className="w-full bg-white rounded-md shadow-shikiho-sm border border-shikiho-bg-border-light overflow-hidden">
      <div className="px-4 py-3 border-b border-shikiho-bg-border bg-shikiho-bg-gray-light">
        <div className="flex items-center">
          <div className="text-[15px] font-bold text-shikiho-text-primary">{title}</div>
          <div className="ml-2 text-[11px] text-shikiho-text-secondary">
            {tableName.startsWith('ranking_pts') ? '終値比' : '前日比'}
          </div>
        </div>
      </div>
      <div>
        {data.length === 0 ? (
          <div className="px-4 py-6 text-center text-[12px] text-shikiho-text-tertiary">
            本日のデータはありません
          </div>
        ) : (
          data.map((item: BaseRankingData, index: number) => (
            <Link 
              key={`${tableName}-${item.code}-${index}`}
              href={`/stocks/${item.code}/news`}
              className={`px-4 py-3 hover:bg-shikiho-bg-gray-light transition-colors duration-150 cursor-pointer flex items-center border-b border-shikiho-bg-border-light last:border-b-0`}
            >
              <div className={`w-[22px] h-[22px] rounded flex items-center justify-center mr-3 font-bold text-[11px] ${getRankingStyle(index)}`}>
                {index + 1}
              </div>
              <div className="text-[12px] text-shikiho-text-secondary mr-3 w-[32px]">
                {item.code}
              </div>
              <div className="flex-1 min-w-0 pr-2">
                <div className="text-[13px] text-shikiho-text-primary font-bold truncate hover:text-shikiho-link-primary">
                  {item.name}
                </div>
              </div>
              <div className={`text-right text-[14px] font-bold ${getDiffPercentColor(item.diff_percent)}`}>
                {formatDiffPercent(item.diff_percent)}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}