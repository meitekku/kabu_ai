import { betterAuth } from "better-auth";
import { createPool } from "mysql2/promise";
import { sendVerificationEmail } from "./email";

console.log("[Auth] ========================================");
console.log("[Auth] Initializing auth module");
console.log("[Auth] NODE_ENV:", process.env.NODE_ENV);
console.log("[Auth] BETTER_AUTH_URL:", process.env.BETTER_AUTH_URL);
console.log("[Auth] NEXT_PUBLIC_APP_URL:", process.env.NEXT_PUBLIC_APP_URL);
console.log("[Auth] DB_HOST:", process.env.DB_HOST);
console.log("[Auth] DB_NAME:", process.env.DB_NAME);
console.log("[Auth] DB_USER:", process.env.DB_USER);
console.log("[Auth] DB_PORT:", process.env.DB_PORT);
console.log("[Auth] ========================================");

// 環境変数のチェック
if (!process.env.BETTER_AUTH_URL && process.env.NODE_ENV === "production") {
  console.error("[Auth] WARNING: BETTER_AUTH_URL is not set in production!");
}
if (!process.env.NEXT_PUBLIC_APP_URL && process.env.NODE_ENV === "production") {
  console.error("[Auth] WARNING: NEXT_PUBLIC_APP_URL is not set in production!");
}

// MySQL Pool を作成
let pool;
try {
  pool = createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || "3306"),
    waitForConnections: true,
    connectionLimit: 10,
    timezone: "Z",
  });
  console.log("[Auth] MySQL pool created successfully");
} catch (error) {
  console.error("[Auth] Failed to create MySQL pool:", error);
  throw error;
}

export const auth = betterAuth({
  database: pool,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      console.log("[Auth] Sending verification email to:", user.email);
      console.log("[Auth] Verification URL:", url);
      await sendVerificationEmail({
        email: user.email,
        url,
      });
    },
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    },
    twitter: {
      clientId: process.env.TWITTER_CLIENT_ID || "",
      clientSecret: process.env.TWITTER_CLIENT_SECRET || "",
    },
    facebook: {
      clientId: process.env.FACEBOOK_CLIENT_ID || "",
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET || "",
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30日
    updateAge: 60 * 60 * 24, // 1日ごとに更新
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5分
    },
  },
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
