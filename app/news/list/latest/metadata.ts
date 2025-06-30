import { Metadata } from 'next';

// ページメタデータ設定
const PAGE_METADATA = {
  title: '最新ニュース一覧 | 株AI',
  description: '株式投資に関する最新ニュースの一覧ページです。企業の最新情報をチェックできます。',
};

export const metadata: Metadata = {
  title: PAGE_METADATA.title,
  description: PAGE_METADATA.description,
};