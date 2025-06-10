// 画像フォーマットの検証と変換
async function validateAndConvertImage(buffer: Buffer, mimeType: string): Promise<{ buffer: Buffer; mimeType: string }> {
  // Twitter APIがサポートする形式
  const supportedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
  
  // サポートされている形式の場合はそのまま返す
  if (supportedFormats.includes(mimeType)) {
    return { buffer, mimeType };
  }
  
  // WebPやその他の形式の場合、JPEGに変換を試みる
  console.log(`Converting ${mimeType} to JPEG for Twitter compatibility`);
  
  // 簡易的な変換（実際のプロダクションではsharpなどのライブラリを使用推奨）
  // ここではWebPもそのまま試してみる（Twitter APIが対応している可能性があるため）
  return { buffer, mimeType };
}// app/api/twitter/post/route.ts
import { NextResponse } from 'next/server';
import crypto from 'crypto';

// Twitter API エンドポイント
const TWITTER_API_URL = 'https://api.twitter.com/2/tweets';
const TWITTER_MEDIA_UPLOAD_URL = 'https://upload.twitter.com/1.1/media/upload.json';

// リクエストボディの型定義
interface TweetRequest {
  tweetContent: string;
  url: string;
  imageUrl?: string;
  hashtags?: string[];
  replyToId?: string;
}

// ツイートデータの型定義
interface TweetData {
  id: string;
  text: string;
  edit_history_tweet_ids?: string[];
}

// レスポンスの型定義
interface TweetResponse {
  success: boolean;
  message: string;
  data?: TweetData;
  error?: unknown;
  tweetUrl?: string;
  rateLimit?: {
    remaining: number;
    resetTime: number | null;
  };
}

// OAuth パラメータの型定義
interface OAuthParams {
  oauth_consumer_key: string;
  oauth_nonce: string;
  oauth_signature_method: string;
  oauth_timestamp: string;
  oauth_token: string;
  oauth_version: string;
  oauth_signature?: string;
}

// メディアアップロードレスポンスの型定義
interface MediaUploadResponse {
  media_id: string;
  media_id_string: string;
  size?: number;
  expires_after_secs?: number;
  image?: {
    image_type: string;
    w: number;
    h: number;
  };
}

// 環境変数の検証
function validateEnvironmentVariables(): { valid: boolean; missing: string[] } {
  const required = [
    'TWITTER_API_KEY',
    'TWITTER_API_SECRET',
    'TWITTER_ACCESS_TOKEN',
    'TWITTER_ACCESS_TOKEN_SECRET'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  return {
    valid: missing.length === 0,
    missing
  };
}

// OAuth 1.0a署名の生成
function generateOAuthSignature(
  method: string, 
  url: string, 
  params: Record<string, string>, 
  consumerSecret: string, 
  tokenSecret: string = ''
): string {
  const paramString = Object.keys(params)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');

  const signatureBaseString = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(paramString)
  ].join('&');

  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
  return crypto.createHmac('sha1', signingKey).update(signatureBaseString).digest('base64');
}

// OAuth認証ヘッダーの生成（改良版）
function generateOAuthHeader(
  method: string, 
  url: string, 
  params: Record<string, string>, 
  consumerKey: string, 
  consumerSecret: string, 
  accessToken: string, 
  accessTokenSecret: string,
  isMultipart: boolean = false
): string {
  const oauthParams: OAuthParams = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: '1.0'
  };

  // multipart/form-dataの場合、bodyパラメータは署名に含めない
  const signatureParams = isMultipart ? {} : params;
  
  const allParams: Record<string, string> = {
    ...signatureParams,
    ...Object.entries(oauthParams).reduce((acc, [key, value]) => ({
      ...acc,
      [key]: value || ''
    }), {})
  };

  const signature = generateOAuthSignature(method, url, allParams, consumerSecret, accessTokenSecret);
  oauthParams.oauth_signature = signature;

  const headerString = Object.entries(oauthParams)
    .filter(([, value]) => value !== undefined)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([key, value]) => `${encodeURIComponent(key)}="${encodeURIComponent(value!)}"`)
    .join(', ');

  return `OAuth ${headerString}`;
}

// 画像をダウンロード（Data URLもサポート）
async function downloadImage(imageUrl: string): Promise<{ buffer: Buffer; mimeType: string }> {
  // Data URLの場合の処理
  if (imageUrl.startsWith('data:')) {
    const matches = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      throw new Error('Invalid data URL format');
    }
    
    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');
    
    return { buffer, mimeType };
  }
  
  // 通常のURLの場合
  const response = await fetch(imageUrl);
  
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
  }
  
  const contentType = response.headers.get('content-type') || 'image/jpeg';
  const arrayBuffer = await response.arrayBuffer();
  
  return {
    buffer: Buffer.from(arrayBuffer),
    mimeType: contentType
  };
}

// メディアをアップロード
async function uploadMedia(imageBuffer: Buffer, mimeType: string = 'image/jpeg'): Promise<string> {
  const consumerKey = process.env.TWITTER_API_KEY!;
  const consumerSecret = process.env.TWITTER_API_SECRET!;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN!;
  const accessTokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET!;

  // MIMEタイプから拡張子を決定
  const extension = mimeType.split('/')[1] || 'jpeg';
  
  // INIT - アップロードの初期化
  const initParams = {
    command: 'INIT',
    total_bytes: imageBuffer.length.toString(),
    media_type: mimeType,
    media_category: 'tweet_image'
  };

  // URLエンコードされたボディを作成
  const initBody = new URLSearchParams(initParams).toString();

  const initAuthHeader = generateOAuthHeader(
    'POST',
    TWITTER_MEDIA_UPLOAD_URL,
    initParams,
    consumerKey,
    consumerSecret,
    accessToken,
    accessTokenSecret,
    false // isMultipart = false (URLエンコードの場合)
  );

  const initResponse = await fetch(TWITTER_MEDIA_UPLOAD_URL, {
    method: 'POST',
    headers: {
      'Authorization': initAuthHeader,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: initBody
  });

  if (!initResponse.ok) {
    const errorData = await initResponse.text();
    throw new Error(`Failed to initialize media upload: ${errorData}`);
  }

  const initData: MediaUploadResponse = await initResponse.json();
  const mediaId = initData.media_id_string;

  // APPEND - メディアデータのアップロード
  // multipart/form-dataの場合、OAuth署名には含めない
  const appendAuthHeader = generateOAuthHeader(
    'POST',
    TWITTER_MEDIA_UPLOAD_URL,
    {}, // 空のパラメータ
    consumerKey,
    consumerSecret,
    accessToken,
    accessTokenSecret,
    true // isMultipart = true
  );

  const appendFormData = new FormData();
  appendFormData.append('command', 'APPEND');
  appendFormData.append('media_id', mediaId);
  appendFormData.append('segment_index', '0');
  appendFormData.append('media', new Blob([imageBuffer], { type: mimeType }), `media.${extension}`);

  const appendResponse = await fetch(TWITTER_MEDIA_UPLOAD_URL, {
    method: 'POST',
    headers: {
      'Authorization': appendAuthHeader,
      // FormDataの場合、Content-Typeは設定しない（自動で設定される）
    },
    body: appendFormData
  });

  if (!appendResponse.ok) {
    const errorData = await appendResponse.text();
    console.error('APPEND failed. Status:', appendResponse.status);
    console.error('Error response:', errorData);
    throw new Error(`Failed to append media data: ${errorData}`);
  }

  // FINALIZE - アップロードの完了
  const finalizeParams = {
    command: 'FINALIZE',
    media_id: mediaId
  };

  const finalizeBody = new URLSearchParams(finalizeParams).toString();

  const finalizeAuthHeader = generateOAuthHeader(
    'POST',
    TWITTER_MEDIA_UPLOAD_URL,
    finalizeParams,
    consumerKey,
    consumerSecret,
    accessToken,
    accessTokenSecret,
    false // isMultipart = false (URLエンコードの場合)
  );

  const finalizeResponse = await fetch(TWITTER_MEDIA_UPLOAD_URL, {
    method: 'POST',
    headers: {
      'Authorization': finalizeAuthHeader,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: finalizeBody
  });

  if (!finalizeResponse.ok) {
    const errorData = await finalizeResponse.text();
    throw new Error(`Failed to finalize media upload: ${errorData}`);
  }

  return mediaId;
}

// ツイート本文を生成
function composeTweetText(tweetContent: string, url: string, hashtags?: string[]): string {
  let text = tweetContent;

  // ハッシュタグを追加（存在する場合）
  if (hashtags && hashtags.length > 0) {
    text += '\n\n' + hashtags.map(tag => `#${tag.replace(/^#/, '')}`).join(' ');
  }

  return text;
}

// ツイートを投稿（OAuth 1.0a）
async function postTweet(
  text: string, 
  mediaIds?: string[], 
  replyToId?: string
): Promise<TweetData | Response> {
  const consumerKey = process.env.TWITTER_API_KEY!;
  const consumerSecret = process.env.TWITTER_API_SECRET!;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN!;
  const accessTokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET!;

  // ツイートのボディを構築
  const tweetBody: Record<string, unknown> = { text };
  
  if (mediaIds && mediaIds.length > 0) {
    tweetBody.media = { media_ids: mediaIds };
  }
  
  if (replyToId) {
    tweetBody.reply = { in_reply_to_tweet_id: replyToId };
  }

  // OAuth 1.0a署名を生成（POST bodyは署名に含めない）
  const authHeader = generateOAuthHeader(
    'POST',
    TWITTER_API_URL,
    {},
    consumerKey,
    consumerSecret,
    accessToken,
    accessTokenSecret,
    false // isMultipart = false (JSONの場合)
  );

  const response = await fetch(TWITTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(tweetBody)
  });

  const remaining = response.headers.get('x-rate-limit-remaining');
  const resetTime = response.headers.get('x-rate-limit-reset');

  if (response.status === 429) {
    throw new Error(`Rate limit exceeded. Remaining: ${remaining}, Reset time: ${resetTime}`);
  }

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Failed to post tweet: ${response.status} ${errorData}`);
  }

  const responseData = await response.json();
  if (!responseData.data?.id) {
    throw new Error('Invalid response from Twitter API');
  }
  return responseData.data as TweetData;
}

export async function POST(request: Request): Promise<NextResponse<TweetResponse>> {
  try {
    // 環境変数の検証
    const envCheck = validateEnvironmentVariables();
    if (!envCheck.valid) {
      return NextResponse.json({
        success: false,
        message: `Missing environment variables: ${envCheck.missing.join(', ')}`
      }, { status: 500 });
    }

    // リクエストボディの解析
    const { tweetContent, url, imageUrl, hashtags, replyToId } = await request.json() as TweetRequest;

    // ツイートテキストの作成
    const tweetText = composeTweetText(tweetContent, url, hashtags);

    let mediaId: string | undefined;

    // 画像がある場合の処理
    if (imageUrl) {
      try {
        console.log('Downloading image from:', imageUrl.substring(0, 100) + '...');
        const { buffer: downloadedBuffer, mimeType: originalMimeType } = await downloadImage(imageUrl);
        console.log('Image downloaded, size:', downloadedBuffer.length, 'bytes, type:', originalMimeType);
        
        // 画像フォーマットの検証と必要に応じた変換
        const { buffer: imageBuffer, mimeType } = await validateAndConvertImage(downloadedBuffer, originalMimeType);
        
        console.log('Uploading image to Twitter...');
        mediaId = await uploadMedia(imageBuffer, mimeType);
        console.log('Image uploaded successfully, media ID:', mediaId);
      } catch (error) {
        console.error('Error processing image:', error);
        console.error('Note: Ensure your Twitter Access Token has "Read and write" permissions');
        console.error('You can check this in the Twitter Developer Portal under "Keys and tokens"');
        // 画像のアップロードに失敗してもツイート自体は投稿する
      }
    }

    // ツイートを投稿
    console.log('Posting tweet:', tweetText);
    
    const tweetData = await postTweet(
      tweetText,
      mediaId ? [mediaId] : undefined,
      replyToId
    ) as TweetData;
    
    console.log('Tweet posted successfully:', tweetData);

    // ツイートのURLを生成
    const tweetUrl = `https://twitter.com/i/web/status/${tweetData.id}`;

    return NextResponse.json({
      success: true,
      message: 'Tweet posted successfully',
      data: tweetData,
      tweetUrl
    });

  } catch (error) {
    console.error('Error posting tweet:', error);
    
    let errorMessage = 'Failed to post tweet';
    const errorDetails: unknown = error;
    
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json({
      success: false,
      message: errorMessage,
      error: errorDetails
    }, { status: 500 });
  }
}

// GET メソッドのハンドラー（APIの動作確認用）
export async function GET() {
  const envValidation = validateEnvironmentVariables();
  
  return NextResponse.json({
    status: 'Twitter API endpoint is ready',
    environmentVariablesSet: envValidation.valid,
    missingVariables: envValidation.missing.length > 0 ? envValidation.missing : undefined,
    requiredParameters: {
      tweetContent: 'string - ツイートの内容（必須）',
      url: 'string - 共有するURL（必須）',
      imageUrl: 'string - 画像のURL（オプション）',
      hashtags: 'string[] - ハッシュタグの配列（オプション）',
      replyToId: 'string - 返信先のツイートID（オプション）'
    },
    example: {
      tweetContent: 'これはテスト投稿です',
      url: 'https://example.com',
      imageUrl: 'https://via.placeholder.com/400x300',
      hashtags: ['test', 'development']
    }
  });
}