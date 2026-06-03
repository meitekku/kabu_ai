import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock mysql2/promise to avoid real DB connection
vi.mock("mysql2/promise", () => ({
  createPool: vi.fn(() => ({
    query: vi.fn(),
    execute: vi.fn(),
    getConnection: vi.fn(),
    end: vi.fn(),
  })),
}));

// Mock email module
vi.mock("@/lib/auth/email", () => ({
  sendVerificationEmail: vi.fn(),
}));

// Mock better-auth to capture the config passed to it
let capturedConfig: Record<string, unknown> | null = null;

vi.mock("better-auth", () => ({
  betterAuth: (config: Record<string, unknown>) => {
    capturedConfig = config;
    return {
      handler: vi.fn(),
      api: {},
      $Infer: { Session: {} },
    };
  },
}));

describe("Auth configuration", () => {
  beforeEach(() => {
    capturedConfig = null;
    vi.resetModules();
  });

  async function getAuthConfig() {
    const mod = await import("@/lib/auth/auth");
    // Access a property on the Proxy to trigger lazy initialization
    void (mod.auth as Record<string, unknown>).handler;
    return capturedConfig!;
  }

  it("includes kabu-ai.jp in trustedOrigins", async () => {
    const config = await getAuthConfig();

    expect(config).not.toBeNull();
    expect(config.trustedOrigins).toBeDefined();
    expect(config.trustedOrigins).toContain("https://kabu-ai.jp");
  });

  it("has email and password authentication enabled", async () => {
    const config = await getAuthConfig();
    const emailAndPassword = config.emailAndPassword as Record<
      string,
      unknown
    >;

    expect(emailAndPassword.enabled).toBe(true);
  });

  it("requires email verification", async () => {
    const config = await getAuthConfig();
    const emailAndPassword = config.emailAndPassword as Record<
      string,
      unknown
    >;

    expect(emailAndPassword.requireEmailVerification).toBe(true);
  });

  it("sets minimum password length to 8", async () => {
    const config = await getAuthConfig();
    const emailAndPassword = config.emailAndPassword as Record<
      string,
      unknown
    >;

    expect(emailAndPassword.minPasswordLength).toBe(8);
  });

  it("configures session expiration to 30 days", async () => {
    const config = await getAuthConfig();
    const session = config.session as Record<string, unknown>;

    expect(session.expiresIn).toBe(60 * 60 * 24 * 30);
  });

  it("configures session update age to 1 day", async () => {
    const config = await getAuthConfig();
    const session = config.session as Record<string, unknown>;

    expect(session.updateAge).toBe(60 * 60 * 24);
  });

  it("enables cookie cache with 5 minute maxAge", async () => {
    const config = await getAuthConfig();
    const session = config.session as Record<string, unknown>;
    const cookieCache = session.cookieCache as Record<string, unknown>;

    expect(cookieCache.enabled).toBe(true);
    expect(cookieCache.maxAge).toBe(60 * 5);
  });

  it("configures social providers (google, twitter)", async () => {
    const config = await getAuthConfig();
    const socialProviders = config.socialProviders as Record<string, unknown>;

    expect(socialProviders).toHaveProperty("google");
    expect(socialProviders).toHaveProperty("twitter");
    expect(socialProviders).not.toHaveProperty("facebook");
  });
});
