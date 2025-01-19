import React from 'react';

type RankingTableProps = {
  title: string;
  items: {
    rank: number;
    title: string;
  }[];
};

const RankingTable = ({ title, items }: RankingTableProps) => {
  return (
    <div className="w-full max-w-2xl bg-white rounded-lg border border-gray-100 shadow-sm">
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="text-lg font-bold">{title}</div>
      </div>
      <div className="divide-y divide-gray-100">
        {items.map((item) => (
          <div 
            key={item.rank} 
            className="px-6 py-4 hover:bg-gray-50 transition-colors duration-150 cursor-pointer flex items-start gap-6"
          >
            <span className="text-2xl text-blue-600 font-serif min-w-6">
              {item.rank}
            </span>
            <p className="text-gray-900 text-base leading-relaxed pt-1">
              {item.title}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RankingTable;