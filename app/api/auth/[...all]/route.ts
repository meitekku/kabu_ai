import { auth } from "@/lib/auth/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest, NextResponse } from "next/server";

const handler = toNextJsHandler(auth);

// エラーを詳細にログ出力するヘルパー関数
function logError(context: string, error: unknown) {
  const timestamp = new Date().toISOString();
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  // 構造化されたエラーログ（pm2 logsで確認しやすい形式）
  console.error(JSON.stringify({
    timestamp,
    level: "error",
    context,
    message: errorMessage,
    stack: errorStack,
    env: process.env.NODE_ENV,
    betterAuthUrl: process.env.BETTER_AUTH_URL,
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
  }));
}

export async function GET(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  console.log(`[Auth API] GET ${pathname} at ${new Date().toISOString()}`);

  try {
    const response = await handler.GET(request);
    console.log(`[Auth API] GET ${pathname} completed with status ${response.status}`);
    return response;
  } catch (error) {
    logError(`GET ${pathname}`, error);
    return NextResponse.json(
      {
        error: "認証処理中にエラーが発生しました",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  console.log(`[Auth API] POST ${pathname} at ${new Date().toISOString()}`);

  try {
    const clonedRequest = request.clone();
    const body = await clonedRequest.text();
    console.log(`[Auth API] POST ${pathname} body:`, body.substring(0, 500));

    const response = await handler.POST(request);
    console.log(`[Auth API] POST ${pathname} completed with status ${response.status}`);
    return response;
  } catch (error) {
    logError(`POST ${pathname}`, error);
    return NextResponse.json(
      {
        error: "認証処理中にエラーが発生しました",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
