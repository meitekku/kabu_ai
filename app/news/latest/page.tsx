import NewsListS from '@/components/news/NewsListS';
import { searchNews } from '@/lib/news/search';
import { metadata } from './metadata';

export { metadata };
export const dynamic = 'force-dynamic';

export default async function LatestNewsPage() {
  const latestResult = await searchNews({ limit: 10, page: 1 }).catch(() => null);
  const initialData = latestResult
    ? {
      news: latestResult.response.data,
      total: latestResult.response.total,
      page: 1,
    }
    : undefined;

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">ニュース一覧</h1>
      <NewsListS limit={10} more={false} initialData={initialData} />
    </div>
  );
}
