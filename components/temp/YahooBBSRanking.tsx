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

  // 初回マウント時のみデータを取得
  useEffect(() => {
    const fetchInitialData = async () => {
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
        } else {
          setError('Failed to fetch data');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
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
    <select
      value={selectedCode}
      onChange={handleChange}
      className="w-40 p-2 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
    >
      <option value="">選択してください</option>
      {companies.map((company) => (
        <option key={company.code} value={company.code}>
          {company.code} {company.company_name}
        </option>
      ))}
    </select>
  );
};

export default YahooBBSRanking;