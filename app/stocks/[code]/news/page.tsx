import { generateMetadata } from './metadata';
import NewsPageClient from './NewsPageClient';
import { redirect } from 'next/navigation';

export { generateMetadata };

type Props = {
  params: Promise<{
    code: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

const NewsPage = async ({ params }: Props) => {
  const { code } = await params;

  if (code.toLowerCase() === 'all') {
    redirect('/news/latest');
  }

  return <NewsPageClient code={code} />;
};

export default NewsPage;
