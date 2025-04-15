import DefaultTemplate from "@/components/template/DefaultTemplate";
import NewsListS from "@/components/news/NewsListS";
import NewsSection from "@/components/news/NewsSection";
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '株AIトップページ',
  description: '株AIは株式投資の分析・判断をサポートするAIツールです。',
}

export default function Home() {
  return (
    <DefaultTemplate>
      <div className="space-y-6">
        <h2 className="text-xl font-bold mb-4">ニュース</h2>
        <NewsSection />
        <NewsListS more={true} />
      </div>
    </DefaultTemplate>
  );
}