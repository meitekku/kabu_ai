import { Metadata } from 'next';
import NewsPageClient from './NewsPageClient';

interface PageProps {
  params: {
    code: string;
  };
}

export const generateMetadata = async ({ params }: PageProps): Promise<Metadata> => {
  const code = params.code;
  
  return {
    title: `${code} - 株価ニュース`,
    description: `${code}の株価チャートとニュース一覧をご覧いただけます。最新の株価情報と関連ニュースをチェックできます。`,
  };
};

const NewsPage = ({ params }: PageProps) => {
  return <NewsPageClient code={params.code} />;
};

export default NewsPage;