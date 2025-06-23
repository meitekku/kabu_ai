import { Metadata } from 'next';
import NewsPageClient from './NewsPageClient';

type Props = {
  params: Promise<{
    code: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const { code } = await params;
  
  return {
    title: `${code} - 株価ニュース`,
    description: `${code}の株価チャートとニュース一覧をご覧いただけます。最新の株価情報と関連ニュースをチェックできます。`,
  };
};

const NewsPage = async ({ params }: Props) => {
  const { code } = await params;
  return <NewsPageClient code={code} />;
};

export default NewsPage;