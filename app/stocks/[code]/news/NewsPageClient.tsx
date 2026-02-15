'use client';

import { useState, useEffect } from 'react';
import StockChart from '@/components/parts/chart/StockChart';
import NewsList from '@/components/ui/NewsList';
import CompanyBasicInfo from '@/components/common/CompanyBasicInfo';
import { PredictionButton } from '@/components/prediction/PredictionButton';
import USCommentList from '@/components/parts/us/USCommentList';

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
      <StockChart
        code={code}
        pcHeight={{ upper: 200, lower: 100 }}
        tabletHeight={{ upper: 180, lower: 96 }}
        mobileHeight={{ upper: 120, lower: 80 }}
        width={"100%"}
        maxNewsTooltips={4}
      />
      {!isUSStock && <PredictionButton code={code} />}
      {isUSStock ? (
        <USCommentList code={code} />
      ) : (
        <NewsList title="最新ニュース" showMoreButton={true} />
      )}
    </div>
  );
};

export default NewsPageClient;
