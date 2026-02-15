import { generateMetadata } from './metadata';
import PredictPageClient from './PredictPageClient';
import { Database } from '@/lib/database/Mysql';

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

  return <PredictPageClient code={code} companyName={companyName} />;
};

export default PredictPage;
