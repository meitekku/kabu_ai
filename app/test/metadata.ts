import { Metadata } from 'next';

// ページメタデータ設定
const PAGE_METADATA = {
  title: 'テストページ | 株AI',
  description: 'システムテスト用のページです。',
};

export const metadata: Metadata = {
  title: PAGE_METADATA.title,
  description: PAGE_METADATA.description,
  robots: { index: false },
};