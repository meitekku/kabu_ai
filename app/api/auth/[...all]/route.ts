import { auth } from "@/lib/auth/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest } from "next/server";

const handler = toNextJsHandler(auth);

export async function GET(request: NextRequest) {
  console.log("[Auth API] GET request:", request.nextUrl.pathname);
  try {
    return await handler.GET(request);
  } catch (error) {
    console.error("[Auth API] GET error:", error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  console.log("[Auth API] POST request:", request.nextUrl.pathname);
  try {
    const clonedRequest = request.clone();
    const body = await clonedRequest.text();
    console.log("[Auth API] POST body:", body.substring(0, 500));
    return await handler.POST(request);
  } catch (error) {
    console.error("[Auth API] POST error:", error);
    throw error;
  }
}
