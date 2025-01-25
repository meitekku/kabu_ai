import { NextResponse } from "next/server";

export const runtime = "edge"; // Edge Function で実行

export async function GET() {
  const now = new Date();
  const tokyoTime = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo" }).format(now);

  return NextResponse.json({ tokyoTime });
}
