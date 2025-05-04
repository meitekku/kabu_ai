import { TwitterApi } from 'twitter-api-v2';

// Twitter APIクライアントの初期化
const client = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY || '',
  appSecret: process.env.TWITTER_API_SECRET || '',
  accessToken: process.env.TWITTER_ACCESS_TOKEN || '',
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET || '',
});

// ツイートを投稿する関数
export async function postTweet(text: string) {
  try {
    const tweet = await client.v2.tweet(text);
    return tweet;
  } catch (error) {
    console.error('Error posting tweet:', error);
    throw error;
  }
} 