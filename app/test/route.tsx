"use client";

import { useEffect, useState } from "react";

export default function TimeDisplay({ serverTime }: { serverTime?: string }) {
  const [clientTime, setClientTime] = useState<string>("");

  useEffect(() => {
    if (!serverTime) return;

    const updateTime = () => {
      const formattedTime = new Intl.DateTimeFormat("ja-JP", {
        timeZone: "Asia/Tokyo",
        dateStyle: "full",
        timeStyle: "long",
      }).format(new Date(serverTime));

      setClientTime(formattedTime);
    };

    updateTime();

    // ✅ リアルタイム更新（オプション）
    // const intervalId = setInterval(updateTime, 1000);
    // return () => clearInterval(intervalId);
  }, [serverTime]);

  if (!serverTime) {
    return <p>Loading...</p>;
  }

  return (
    <div>
      <p>📅 <strong>サーバー時間（UTCベース）:</strong> {serverTime}</p>
      <p>⏰ <strong>クライアント時間（日本時間）:</strong> {clientTime}</p>
    </div>
  );
}
