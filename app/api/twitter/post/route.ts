import { NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';

// デバッグ用：環境変数の確認
console.log('Twitter API Configuration:', {
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

// 環境変数の検証
if (!process.env.TWITTER_API_KEY || !process.env.TWITTER_API_SECRET || 
    !process.env.TWITTER_ACCESS_TOKEN || !process.env.TWITTER_ACCESS_TOKEN_SECRET) {
  throw new Error('Twitter API credentials are not properly configured');
}

// Twitter APIクライアントの初期化
const client = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

export async function POST(request: Request) {
  try {
    const { title, url, imageUrl } = await request.json();

    // ツイート本文を作成（タイトル + URL）
    const tweetText = `${title}\n\n${url}`;

    let tweet;
    
    // 画像がある場合は画像をアップロードしてからツイート
    if (imageUrl) {
      // 画像をアップロード
      const mediaId = await client.v1.uploadMedia(imageUrl);
      
      // 画像付きでツイート
      tweet = await client.v2.tweet({
        text: tweetText,
        media: { media_ids: [mediaId] }
      });
    } else {
      // 画像なしでツイート
      tweet = await client.v2.tweet(tweetText);
    }

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