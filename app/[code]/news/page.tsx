import { Metadata } from 'next';
import NewsPageClient from './NewsPageClient';

type Props = {
  params: {
    code: string;
  };
  searchParams: { [key: string]: string | string[] | undefined };
};

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const code = params.code;
  
  return {
    title: `${code} - 株価ニュース`,
    description: `${code}の株価チャートとニュース一覧をご覧いただけます。最新の株価情報と関連ニュースをチェックできます。`,
  };
};

const NewsPage = ({ params }: Props) => {
  return <NewsPageClient code={params.code} />;
};

export default NewsPage;