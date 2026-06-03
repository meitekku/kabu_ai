interface SubmitTwitterAndWebPostParams {
  title: string;
  content: string;
  imageUrl?: string;
  siteNumber?: number;
}

interface SubmitTwitterAndWebPostResult {
  success: boolean;
  message: string;
  tweetUrl?: string;
}

const formatUnixTimestampToJST = (unixTimestamp: number): string => {
  const date = new Date(unixTimestamp * 1000);
  const jstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));

  const month = jstDate.getUTCMonth() + 1;
  const day = jstDate.getUTCDate();
  const hours = jstDate.getUTCHours().toString().padStart(2, '0');
  const minutes = jstDate.getUTCMinutes().toString().padStart(2, '0');
  const seconds = jstDate.getUTCSeconds().toString().padStart(2, '0');

  return `${month}月${day}日 ${hours}:${minutes}:${seconds}`;
};

export async function submitTwitterAndWebPost({
  title,
  content,
  imageUrl,
  siteNumber = 72,
}: SubmitTwitterAndWebPostParams): Promise<SubmitTwitterAndWebPostResult> {
  const tweetContent = `${title}\n${content}`;

  const postResponse = await fetch('/api/post', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      code: '0000',
      title,
      content,
      site: siteNumber,
      accept: 1,
      pickup: 0,
    }),
  });

  if (!postResponse.ok) {
    throw new Error('Webサイトへの投稿に失敗しました');
  }

  const twitterResponse = await fetch('/api/twitter/post', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tweetContent,
      imageUrl: imageUrl || undefined,
    }),
  });

  if (twitterResponse.status === 429) {
    const resetTime = twitterResponse.headers.get('x-rate-limit-reset');
    if (resetTime) {
      const resetTimestamp = parseInt(resetTime, 10);
      throw new Error(`レート制限に達しました。${formatUnixTimestampToJST(resetTimestamp)}頃に再試行してください。`);
    }

    throw new Error('レート制限に達しました。少し時間をおいて再試行してください。');
  }

  const twitterResult = await twitterResponse.json() as SubmitTwitterAndWebPostResult;

  if (!twitterResponse.ok || !twitterResult.success) {
    throw new Error(twitterResult.message || 'Twitter投稿に失敗しました');
  }

  return twitterResult;
}
