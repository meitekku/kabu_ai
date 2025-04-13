import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Post {
  id: number;
  code: string;
  title: string;
  content: string;
  created_at: string;
  company_name: string;
}

export default function NewsWithImage() {
  const [pickupNews, setPickupNews] = useState<Post[]>([]);
  const [marketNews, setMarketNews] = useState<Post[]>([]);
  const [companyNews, setCompanyNews] = useState<Post[]>([]);

  useEffect(() => {
    const fetchNews = async (site: number) => {
      try {
        const response = await fetch('/api/news/post_type', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ site, num: 4 }),
        });
        const data = await response.json();
        return data.success ? data.data : [];
      } catch (error) {
        console.error('Error fetching news:', error);
        return [];
      }
    };

    const loadAllNews = async () => {
      const [pickup, market, company] = await Promise.all([
        fetchNews(1),
        fetchNews(2),
        fetchNews(3),
      ]);
      setPickupNews(pickup);
      setMarketNews(market);
      setCompanyNews(company);
    };

    loadAllNews();
  }, []);

  const NewsBlock = ({ title, news }: { title: string; news: Post[] }) => (
    <div className="mb-8">
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      <div className="space-y-4">
        {news.map((item) => (
          <Link href={`/news/${item.id}`} key={item.id}>
            <div className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">{item.title}</h3>
                <span className="text-sm text-gray-500">
                  {new Date(item.created_at).toLocaleDateString('ja-JP')}
                </span>
              </div>
              {item.company_name && (
                <p className="text-sm text-gray-600 mt-1">{item.company_name}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <NewsBlock title="ピックアップニュース" news={pickupNews} />
      <NewsBlock title="市場ニュース" news={marketNews} />
      <NewsBlock title="企業ニュース" news={companyNews} />
    </div>
  );
} 