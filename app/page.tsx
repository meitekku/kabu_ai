import DefaultTemplate from "@/components/template/DefaultTemplate";
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '株AIトップページ',
  description: '株AIは現在開発中のWebサイトです。',
}

export default function Home() {
  return (
    <DefaultTemplate>
      <h1 className="text-2xl font-bold">トップページ</h1>
      <p>株AIは現在開発中のWebサイトです。Topページを含め、新規機能を随時作成して参ります。</p>
    </DefaultTemplate>
  );
}
