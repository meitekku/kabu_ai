'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import StockChart from '@/components/parts/chart/StockChart';
import NewsList from '@/components/ui/NewsList';
import CompanyBasicInfo from '@/components/common/CompanyBasicInfo';

const NewsPage = () => {
  const params = useParams();
  const code = typeof params.code === 'string' ? params.code : '';
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const validateParams = () => {
      if (!code) {
        setError('Invalid code parameter.');
      }
    };

    validateParams();
  }, [code]);

  if (error) {
    return <div className="text-red-500 p-4">Error: {error}</div>;
  }

  return (
    <div>
      <CompanyBasicInfo code={code} />
      <StockChart code={code} />
      <NewsList />
    </div>
  );
};

export default NewsPage;