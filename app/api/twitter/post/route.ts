import { NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';

// Twitter APIクライアントの初期化
const client = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY || '',
  appSecret: process.env.TWITTER_API_SECRET || '',
  accessToken: process.env.TWITTER_ACCESS_TOKEN || '',
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET || '',
});

export async function POST(request: Request) {
  try {
    const { title, url } = await request.json();

    // ツイート本文を作成（タイトル + URL）
    const tweetText = `${title}\n\n${url}`;

    // Twitterに投稿
    const tweet = await client.v2.tweet(tweetText);

    return NextResponse.json({
      success: true,
      message: 'Tweet posted successfully',
      data: tweet
    });
  } catch (error) {
    console.error('Error posting tweet:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to post tweet'
    }, { status: 500 });
  }
} 