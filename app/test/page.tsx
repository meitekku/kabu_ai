import TimeDisplay from '@/app/test/TimeDisplay';
import { metadata } from './metadata';

export { metadata };

export default function TestPage() {
  // このページにアクセスされた時点でサーバー側で時間を取得するイメージ
  const serverTime = new Date().toISOString();

  return (
    <main>
      <h1>テストページ</h1>
      {/* 子コンポーネントに props で渡す */}
      <TimeDisplay serverTime={serverTime} />
    </main>
  );
}