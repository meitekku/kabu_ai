import DefaultTemplate from "@/components/template/DefaultTemplate";
import NewsListS from "@/components/news/NewsListS";
import NewsSection from "@/components/news/NewsSection";
import { metadata } from './metadata';

export { metadata };

export default function Home() {
  return (
    <DefaultTemplate>
      <NewsSection />
      <h2 className="text-xl font-bold mb-2">新着ニュース</h2>
      <NewsListS more={true} site={[1,70]} />
    </DefaultTemplate>
  );
}