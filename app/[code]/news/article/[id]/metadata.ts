import { Metadata } from 'next';
import { Database } from '@/lib/database/Mysql';
import { RowDataPacket } from 'mysql2';

// ページメタデータ設定
const PAGE_METADATA = {
  titleTemplate: '{articleTitle} - {companyName} | 株AI',
  descriptionTemplate: '{companyName}({code})の最新ニュース「{articleTitle}」の詳細情報をご覧いただけます。',
  fallbackTitle: '記事詳細 - {code} | 株AI',
  fallbackDescription: '{code}の記事詳細ページです。株式投資に関する最新情報をご覧いただけます。',
};

type Props = {
  params: Promise<{
    code: string;
    id: string;
  }>;
};

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const { code, id } = await params;
  
  try {
    const database = Database.getInstance();
    
    const query = `
      SELECT 
        p.id, 
        p.title, 
        p.code,
        c.name as company_name
      FROM post p
      JOIN company c ON p.code = c.code
      WHERE p.id = ? AND p.code = ? AND p.accept = 1
    `;
    
    const results = await database.select(query, [id, code]) as RowDataPacket[];
    
    if (results && results.length > 0) {
      const article = results[0];
      
      return {
        title: PAGE_METADATA.titleTemplate
          .replace('{articleTitle}', article.title)
          .replace('{companyName}', article.company_name),
        description: PAGE_METADATA.descriptionTemplate
          .replace('{companyName}', article.company_name)
          .replace('{code}', code)
          .replace('{articleTitle}', article.title),
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