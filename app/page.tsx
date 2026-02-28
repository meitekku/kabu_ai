import DefaultTemplate from "@/components/template/DefaultTemplate";
import NewsListS from "@/components/news/NewsListS";
import TrendingSection from "@/components/top/TrendingSection";
import { getTrendingContent } from "@/lib/top/trending";
import { searchNews } from "@/lib/news/search";
import { metadata } from './metadata';

export { metadata };
export const dynamic = 'force-dynamic';

export default async function Home() {
  const [trendingResult, latestResult] = await Promise.allSettled([
    getTrendingContent(),
    searchNews({ site_type: [1, 70], limit: 4, page: 1 }),
  ]);

  const trendingData =
    trendingResult.status === 'fulfilled' ? trendingResult.value : undefined;

  const latestInitialData =
    latestResult.status === 'fulfilled'
      ? {
          news: latestResult.value.response.data,
          total: latestResult.value.response.total,
          page: 1,
        }
      : undefined;

  return (
    <DefaultTemplate>
      <TrendingSection initialData={trendingData} />
      <h2 className="text-xl font-bold mb-2">新着ニュース</h2>
      <NewsListS more={true} site={[1, 70]} initialData={latestInitialData} />
    </DefaultTemplate>
  );
}
