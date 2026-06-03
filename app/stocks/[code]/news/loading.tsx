import { NewsPageSkeleton } from '@/components/stocks/news/NewsPageSkeleton';

export default function Loading() {
  return (
    <NewsPageSkeleton
      chartPcHeight={{ upper: 200, lower: 100 }}
      chartTabletHeight={{ upper: 180, lower: 96 }}
      chartMobileHeight={{ upper: 120, lower: 80 }}
      newsRowCount={10}
      showAiFeatureNav
      showMoreButton
      title="最新ニュース"
    />
  );
}
