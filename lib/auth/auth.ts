import { betterAuth } from "better-auth";
import { createPool } from "mysql2/promise";
import { sendVerificationEmail } from "./email";

let _auth: ReturnType<typeof betterAuth> | null = null;

function createAuth() {
  const pool = createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || "3306"),
    waitForConnections: true,
    connectionLimit: 10,
    timezone: "Z",
  });

  return betterAuth({
    database: pool,
    trustedOrigins: ["https://kabu-ai.jp"],
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 8,
    },
    emailVerification: {
      sendVerificationEmail: async ({ user, url }) => {
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
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30日
      updateAge: 60 * 60 * 24, // 1日ごとに更新
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5, // 5分
      },
    },
    user: {
      additionalFields: {
        role: {
          type: "string",
          required: false,
          input: false,
          defaultValue: "user",
        },
      },
    },
  });
}

function getAuth() {
  if (!_auth) {
    _auth = createAuth();
  }
  return _auth;
}

export const auth = new Proxy({} as ReturnType<typeof betterAuth>, {
  get(_target, prop) {
    return (getAuth() as Record<string | symbol, unknown>)[prop];
  },
  has(_target, prop) {
    return prop in getAuth();
  },
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
