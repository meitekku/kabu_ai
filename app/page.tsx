import DefaultTemplate from "@/components/template/DefaultTemplate";
import NewsListS from "@/components/news/NewsListS";
import NewsSection from "@/components/news/NewsSection";
import { searchNews } from "@/lib/news/search";
import { metadata } from './metadata';

export { metadata };
export const dynamic = 'force-dynamic';

export default async function Home() {
  const [pickupResult, marketResult, latestResult] = await Promise.allSettled([
    searchNews({ pickup: 1, limit: 2 }),
    searchNews({ pickup: 2, limit: 2 }),
    searchNews({ site_type: [1, 70], limit: 4, page: 1 }),
  ]);

  const canUseSectionInitialData = pickupResult.status === 'fulfilled' && marketResult.status === 'fulfilled';
  const sectionPickupNews = canUseSectionInitialData ? pickupResult.value.response.data : undefined;
  const sectionMarketNews = canUseSectionInitialData ? marketResult.value.response.data : undefined;

  const latestInitialData = latestResult.status === 'fulfilled'
    ? {
      news: latestResult.value.response.data,
      total: latestResult.value.response.total,
      page: 1,
    }
    : undefined;

  return (
    <DefaultTemplate>
      <NewsSection initialPickupNews={sectionPickupNews} initialMarketNews={sectionMarketNews} />
      <h2 className="text-xl font-bold mb-2">新着ニュース</h2>
      <NewsListS more={true} site={[1,70]} initialData={latestInitialData} />
    </DefaultTemplate>
  );
}
