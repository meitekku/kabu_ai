import { generateMetadata } from './metadata';
import NewsPageClient from './NewsPageClient';
import { redirect } from 'next/navigation';
import { Database } from '@/lib/database/Mysql';
import { BreadcrumbJsonLd } from '@/components/seo/JsonLd';

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

  let companyName = '';
  try {
    const db = Database.getInstance();
    const [company] = await db.select<{ name: string }>('SELECT name FROM company WHERE code = ?', [code]);
    if (company?.name) companyName = company.name;
  } catch {
    // fallback: breadcrumb without company name
  }

  const breadcrumbLabel = companyName ? `${companyName}(${code})` : code;

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'ホーム', url: 'https://kabu-ai.jp' },
          { name: breadcrumbLabel, url: `https://kabu-ai.jp/stocks/${code}/news` },
          { name: 'ニュース', url: `https://kabu-ai.jp/stocks/${code}/news` },
        ]}
      />
      <NewsPageClient code={code} />
    </>
  );
};

export default NewsPage;
