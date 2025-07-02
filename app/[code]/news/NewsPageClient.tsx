'use client';

import { useState, useEffect } from 'react';
import StockChart from '@/components/parts/chart/StockChart';
import NewsList from '@/components/ui/NewsList';
import CompanyBasicInfo from '@/components/common/CompanyBasicInfo';

interface NewsPageClientProps {
  code: string;
}

const NewsPageClient = ({ code }: NewsPageClientProps) => {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) {
      setError('Invalid code parameter.');
    }
  }, [code]);

  if (error) {
    return <div className="text-red-500 p-4">Error: {error}</div>;
  }

  return (
    <div>
      <CompanyBasicInfo code={code} />
      <StockChart 
        code={code}
        pcHeight={{ upper: 200, lower: 100 }}
        mobileHeight={{ upper: 100, lower: 80 }}
        width={"100%"}
        maxNewsTooltips={4}
      />
      <NewsList title="最新ニュース" />
    </div>
  );
};

export default NewsPageClient; 