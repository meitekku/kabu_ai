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
      <NewsSection />
      <h2 className="text-xl font-bold mb-2">新着ニュース</h2>
      <NewsListS more={true} />
    </DefaultTemplate>
  );
}