"use client";

import { useEffect, useState } from "react";

export default function TimeDisplay({ serverTime }: { serverTime: string }) {
  const [clientTime, setClientTime] = useState("");

  useEffect(() => {
    if (serverTime) {
      const formattedTime = new Intl.DateTimeFormat("ja-JP", {
        timeZone: "Asia/Tokyo",
        dateStyle: "full",
        timeStyle: "long",
      }).format(new Date(serverTime));

      setClientTime(formattedTime);
    }
  }, [serverTime]);

  return (
    <div>
      <p>サーバー時間（UTCベース）: {serverTime}</p>
      <p>クライアント時間（日本時間）: {clientTime}</p>
    </div>
  );
}
