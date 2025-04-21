import { useEffect, useState } from 'react';

interface CurrentPriceInfoProps {
  code: string;
}

interface CompanyData {
  code: string;
  name: string;
  current_price: number | null;
  price_change: number | null;
  diff_percent: number | null;
}

export const CurrentPriceInfo: React.FC<CurrentPriceInfoProps> = ({ code }) => {
  const [data, setData] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/${code}/company_info`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code }),
        });

        const result = await response.json();
        if (result.success && result.data.length > 0) {
          setData(result.data[0]);
        } else {
          setError('データが見つかりませんでした');
        }
      } catch {
        setError('データの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [code]);

  if (loading) {
    return (
      <div className="flex items-center space-x-4 p-2">
        <div className="animate-pulse flex items-center space-x-4">
          <div className="h-4 bg-gray-200 rounded w-16"></div>
          <div className="h-4 bg-gray-200 rounded w-14"></div>
          <div className="h-4 bg-gray-200 rounded w-12"></div>
        </div>
      </div>
    );
  }

  if (error) return <div className="text-red-500">{error}</div>;
  if (!data) return null;

  let isPriceUp = false;
  let priceColor = 'text-gray-500';

  if (data.diff_percent) {
    isPriceUp = data.diff_percent < 0;
    priceColor = isPriceUp ? 'text-red-500' : 'text-blue-500';
  }
  console.log(data);

  return (
    <div className="flex items-center space-x-4 p-2">
      <div className="text-sm">{data.name}</div>
      <div className="text-sm">
        {data.current_price 
          ? `${data.current_price.toLocaleString()}`
          : '---'}
      </div>
      {data.diff_percent ? (
        <div className={`${priceColor} text-sm`}>
          {data.diff_percent}%
        </div>
      ) : (
        <div className="text-sm text-gray-400">-</div>
      )}
    </div>
  );
}; 