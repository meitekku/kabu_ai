import { generateMetadata } from './metadata';
import PredictPageClient from './PredictPageClient';
import { Database } from '@/lib/database/Mysql';
import { BreadcrumbJsonLd } from '@/components/seo/JsonLd';

export { generateMetadata };

type Props = {
  params: Promise<{
    code: string;
  }>;
};

const PredictPage = async ({ params }: Props) => {
  const { code } = await params;

  let companyName = '';
  try {
    const db = Database.getInstance();
    const [company] = await db.select<{ name: string }>('SELECT name FROM company WHERE code = ?', [code]);
    if (company?.name) companyName = company.name;
  } catch {
    // fallback: 名前なしで表示
  }

  const breadcrumbLabel = companyName ? `${companyName}(${code})` : code;

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'ホーム', url: 'https://kabu-ai.jp' },
          { name: breadcrumbLabel, url: `https://kabu-ai.jp/stocks/${code}/news` },
          { name: '株価予測', url: `https://kabu-ai.jp/stocks/${code}/predict` },
        ]}
      />
      <PredictPageClient code={code} companyName={companyName} />
    </>
  );
};

export default PredictPage;
