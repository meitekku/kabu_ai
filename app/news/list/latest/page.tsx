import NewsListS from '@/components/news/NewsListS';

export default function LatestNewsPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">ニュース一覧</h1>
      <NewsListS limit={10} more={false} />
    </div>
  );
} 