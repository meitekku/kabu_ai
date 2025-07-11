import { Metadata } from 'next';

// ページメタデータ設定
const PAGE_METADATA = {
  title: '{companyName}({code}) - 株価チャート・ニュース | 株AI',
  description: '{companyName}({code})の株価チャートと最新ニュース一覧をご覧いただけます。株式投資の判断にお役立てください。',
  fallbackTitle: '{code} - 株価チャート・ニュース | 株AI',
  fallbackDescription: '{code}の株価チャートと最新ニュース一覧をご覧いただけます。株式投資の判断にお役立てください。',
};

type Props = {
  params: Promise<{
    code: string;
  }>;
};

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const { code } = await params;
  
  try {
    // 本番環境では内部API呼び出しを避け、直接データベースアクセス
    const { Database } = await import('@/lib/database/Mysql');
    const db = Database.getInstance();
    
    const [company] = await db.select('SELECT name FROM company WHERE code = ?', [code]);
    
    if (company && company.name) {
      return {
        title: PAGE_METADATA.title
          .replace('{companyName}', company.name)
          .replace('{code}', code),
        description: PAGE_METADATA.description
          .replace('{companyName}', company.name)
          .replace('{code}', code),
      };
    }
  } catch (error) {
    console.error('メタデータ生成エラー:', error);
  }
  
  return {
    title: PAGE_METADATA.fallbackTitle.replace('{code}', code),
    description: PAGE_METADATA.fallbackDescription.replace('{code}', code),
  };
};