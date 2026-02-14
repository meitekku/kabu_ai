import { Metadata } from 'next';

// ページメタデータ設定
const PAGE_METADATA = {
  title: '最新の株式ニュース一覧',
  description: '上場企業の最新ニュースを一覧で確認。企業の決算情報・業績発表・IR・適時開示情報をAIが厳選してお届けします。投資判断に役立つマーケットニュースをリアルタイムで更新中。',
};

export const metadata: Metadata = {
  title: PAGE_METADATA.title,
  description: PAGE_METADATA.description,
};