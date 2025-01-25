import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
    console.log("Incoming request:", req.method); // ✅ `req` を使うことで警告を回避
  
    process.env.TZ = "Asia/Tokyo";
    return NextResponse.next();
  }