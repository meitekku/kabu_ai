'use client';

import { useState, useEffect } from 'react';
import StockChart from '@/components/parts/chart/StockChart';
import NewsList from '@/components/ui/NewsList';
import CompanyBasicInfo from '@/components/common/CompanyBasicInfo';
import { FavoriteButton } from '@/components/stocks/FavoriteButton';
import { AiFeatureNav } from '@/components/stocks/AiFeatureNav';

interface NewsPageClientProps {
  code: string;
}

const NewsPageClient = ({ code }: NewsPageClientProps) => {
  const [error, setError] = useState<string | null>(null);
  const isUSStock = /^[A-Z]+$/.test(code);

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
      <div className="flex justify-end px-2 -mt-2 mb-2">
        <FavoriteButton code={code} />
      </div>
      <StockChart
        code={code}
        pcHeight={{ upper: 200, lower: 100 }}
        tabletHeight={{ upper: 180, lower: 96 }}
        mobileHeight={{ upper: 120, lower: 80 }}
        width={"100%"}
        maxNewsTooltips={4}
      />
      {!isUSStock && <AiFeatureNav code={code} />}
      <NewsList title="最新ニュース" showMoreButton={true} />
    </div>
  );
};

export default NewsPageClient;
