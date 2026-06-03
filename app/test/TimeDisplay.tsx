'use client'; // app/test/TimeDisplay.tsx (クライアントコンポーネント)

import { useEffect, useState } from 'react';

export default function TimeDisplay({ serverTime }: { serverTime: string }) {
  const [clientTime, setClientTime] = useState('');

  useEffect(() => {
    // クライアント側も同じフォーマット（JST）で表示したい場合
    const formattedTime = new Intl.DateTimeFormat('ja-JP', {
      timeZone: 'Asia/Tokyo',
      dateStyle: 'full',
      timeStyle: 'long',
    }).format(new Date());

    setClientTime(formattedTime);
  }, []);

  return (
    <div>
      <p>📅 <strong>サーバー時間（日本時間）:</strong> {serverTime}</p>
      <p>⏰ <strong>クライアント時間（日本時間）:</strong> {clientTime}</p>
    </div>
  );
}