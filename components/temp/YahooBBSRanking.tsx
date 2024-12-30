import React, { useState, useEffect } from 'react';

interface RankingCompany {
  code: string;
  company_name: string;
}

interface SearchCompany {
  id: string;
  name: string;
}

interface YahooBBSRankingProps {
  onCodeSelect: (code: string) => void;
  selectedCompanyFromSearch: SearchCompany | null;
}

const YahooBBSRanking: React.FC<YahooBBSRankingProps> = ({ 
  onCodeSelect, 
  selectedCompanyFromSearch 
}) => {
  const [companies, setCompanies] = useState<RankingCompany[]>([]);
  const [selectedCode, setSelectedCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/another/yahoo-ranking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: '' }),
      });
      const result = await response.json();

      if (result.success) {
        setCompanies(result.data);
        setLastUpdated(new Date());
      } else {
        setError('Failed to fetch data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // 初回マウント時とその後3分ごとにデータを取得
  useEffect(() => {
    // 初回データ取得
    fetchData();

    // 3分ごとの自動更新を設定
    const intervalId = setInterval(() => {
      fetchData();
    }, 3 * 60 * 1000); // 3分 = 180,000ミリ秒

    // クリーンアップ関数
    return () => {
      clearInterval(intervalId);
    };
  }, []); // 初回マウント時のみ実行

  // 検索からの選択を反映
  useEffect(() => {
    if (selectedCompanyFromSearch) {
      setSelectedCode(selectedCompanyFromSearch.id);
    }
  }, [selectedCompanyFromSearch]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCode = e.target.value;
    setSelectedCode(newCode);
    onCodeSelect(newCode);
  };

  if (isLoading) return <div className="text-gray-600">Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="space-y-2">
      <select
        value={selectedCode}
        onChange={handleChange}
        className="w-40 p-2 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      >
        <option value="">yahooランキング</option>
        {companies.map((company) => (
          <option key={company.code} value={company.code}>
            {company.code} {company.company_name}
          </option>
        ))}
      </select>
      <div className="text-xs text-gray-500">
        最終更新: {lastUpdated.toLocaleString()}
      </div>
    </div>
  );
};

export default YahooBBSRanking;