const LINE_AUTH_URL = 'https://access.line.me/oauth2/v2.1/authorize';
const LINE_TOKEN_URL = 'https://api.line.me/oauth2/v2.1/token';
const LINE_PROFILE_URL = 'https://api.line.me/v2/profile';

interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
}

/**
 * LINE Login認可URLを生成
 */
export function generateLineAuthUrl(state: string): string {
  const channelId = process.env.LINE_CHANNEL_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://kabu-ai.jp'}/api/line/link`;

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: channelId || '',
    redirect_uri: redirectUri,
    state,
    scope: 'profile openid',
  });

  return `${LINE_AUTH_URL}?${params.toString()}`;
}

/**
 * 認可コードをアクセストークンに交換し、プロフィールを取得
 */
export async function exchangeCodeForProfile(code: string): Promise<LineProfile> {
  const channelId = process.env.LINE_CHANNEL_ID || '';
  const channelSecret = process.env.LINE_CHANNEL_SECRET || '';
  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://kabu-ai.jp'}/api/line/link`;

  // トークン取得
  const tokenRes = await fetch(LINE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: channelId,
      client_secret: channelSecret,
    }),
  });

  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    throw new Error(`LINE token exchange failed: ${tokenRes.status} ${body}`);
  }

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  // プロフィール取得
  const profileRes = await fetch(LINE_PROFILE_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!profileRes.ok) {
    throw new Error(`LINE profile fetch failed: ${profileRes.status}`);
  }

  const profile = await profileRes.json();
  return {
    userId: profile.userId,
    displayName: profile.displayName,
    pictureUrl: profile.pictureUrl,
  };
}
