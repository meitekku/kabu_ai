import { Metadata } from 'next';

// ページメタデータ設定
const PAGE_METADATA = {
  title: '株AIトップページ',
  description: '株AIは株式投資の分析・判断をサポートするAIツールです。最新ニュースと株価情報をご確認ください。',
};

export const metadata: Metadata = {
  title: PAGE_METADATA.title,
  description: PAGE_METADATA.description,
};