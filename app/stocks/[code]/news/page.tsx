import { generateMetadata } from './metadata';
import NewsPageClient from './NewsPageClient';

export { generateMetadata };

type Props = {
  params: Promise<{
    code: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

const NewsPage = async ({ params }: Props) => {
  const { code } = await params;
  return <NewsPageClient code={code} />;
};

export default NewsPage;