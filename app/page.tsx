import DefaultTemplate from "@/components/template/DefaultTemplate";
import NewsListS from "@/components/news/NewsListS";
import TrendingSection from "@/components/top/TrendingSection";
import HeroCarousel from "@/components/top/HeroCarousel";
import { getTrendingContent } from "@/lib/top/trending";
import { searchNews } from "@/lib/news/search";
import { getLatestCarousel } from "@/lib/top/carousel";
import { metadata } from './metadata';

export { metadata };
export const dynamic = 'force-dynamic';

export default async function Home() {
  const [trendingResult, latestResult, carouselResult] = await Promise.allSettled([
    getTrendingContent(),
    searchNews({ site_type: [1, 70], limit: 4, page: 1 }),
    getLatestCarousel(),
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

  const carouselSlides =
    carouselResult.status === 'fulfilled' ? carouselResult.value : [];

  return (
    <DefaultTemplate variant="plain">
      <HeroCarousel initialSlides={carouselSlides} />
      <div className="bg-white py-5">
        <TrendingSection initialData={trendingData} />
      </div>
      <div className="bg-white py-5">
        <h2 className="bg-[#1a1a1a] text-white py-2 px-4 text-sm font-bold rounded-t">新着ニュース</h2>
        <div className="border border-[#e5e5e5] border-t-0 rounded-b">
          <NewsListS more={true} site={[1, 70]} initialData={latestInitialData} />
        </div>
      </div>
    </DefaultTemplate>
  );
}
