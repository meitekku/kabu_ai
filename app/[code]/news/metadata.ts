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
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/${code}/company_info`, {
      cache: 'no-store'
    });
    
    if (response.ok) {
      const data = await response.json();
      const companyName = data.company_name;
      
      return {
        title: PAGE_METADATA.title
          .replace('{companyName}', companyName)
          .replace('{code}', code),
        description: PAGE_METADATA.description
          .replace('{companyName}', companyName)
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