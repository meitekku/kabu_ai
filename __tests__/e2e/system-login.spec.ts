import { test, expect } from "@playwright/test";

test.describe("Login System Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Mock get-session to return unauthenticated by default
    await page.route("**/api/auth/get-session", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(null),
      });
    });
  });

  test.describe("Successful email login flow", () => {
    test("redirects regular user to / after login", async ({ page }) => {
      // Mock sign-in endpoint to return success
      await page.route("**/api/auth/sign-in/email", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: {
              id: "user-1",
              email: "user@example.com",
              name: "Test User",
              emailVerified: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            session: {
              id: "session-1",
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              token: "test-token",
            },
          }),
        });
      });

      // After login, session should return authenticated user
      await page.route("**/api/auth/get-session", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: {
              id: "user-1",
              email: "user@example.com",
              name: "Test User",
              emailVerified: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            session: {
              id: "session-1",
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              token: "test-token",
            },
          }),
        });
      });

      await page.goto("/login");

      await page.getByLabel("メールアドレス").fill("user@example.com");
      await page.getByLabel("パスワード").fill("password123");
      await page.getByRole("button", { name: "ログイン", exact: true }).click();

      // Should redirect to home page
      await page.waitForURL("/", { timeout: 10000 });
      expect(page.url()).toContain("/");
    });

    test("redirects admin to /admin/comment after login", async ({ page }) => {
      await page.route("**/api/auth/sign-in/email", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: {
              id: "admin-1",
              email: "smartaiinvest@gmail.com",
              name: "Admin",
              emailVerified: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            session: {
              id: "session-admin",
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              token: "admin-token",
            },
          }),
        });
      });

      await page.route("**/api/auth/get-session", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: {
              id: "admin-1",
              email: "smartaiinvest@gmail.com",
              name: "Admin",
              emailVerified: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            session: {
              id: "session-admin",
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              token: "admin-token",
            },
          }),
        });
      });

      await page.goto("/login");

      await page.getByLabel("メールアドレス").fill("smartaiinvest@gmail.com");
      await page.getByLabel("パスワード").fill("adminpass123");
      await page.getByRole("button", { name: "ログイン", exact: true }).click();

      // Admin should redirect to /admin/comment
      await page.waitForURL("**/admin/comment", { timeout: 10000 });
      expect(page.url()).toContain("/admin/comment");
    });
  });

  test.describe("Failed login - wrong credentials", () => {
    test("displays error message on invalid credentials", async ({ page }) => {
      // better-auth returns 401 with error object for invalid credentials
      await page.route("**/api/auth/sign-in/email", async (route) => {
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({
            message: "Invalid email or password",
            code: "INVALID_CREDENTIALS",
          }),
        });
      });

      await page.goto("/login");

      await page.getByLabel("メールアドレス").fill("wrong@example.com");
      await page.getByLabel("パスワード").fill("wrongpass123");
      await page.getByRole("button", { name: "ログイン", exact: true }).click();

      // Should display error message (from better-auth or LoginForm fallback)
      await expect(
        page.locator(".text-red-500")
      ).toBeVisible({ timeout: 5000 });

      // Should stay on login page
      expect(page.url()).toContain("/login");
    });

    test("displays generic error on network failure", async ({ page }) => {
      await page.route("**/api/auth/sign-in/email", async (route) => {
        await route.abort("connectionfailed");
      });

      await page.goto("/login");

      await page.getByLabel("メールアドレス").fill("test@example.com");
      await page.getByLabel("パスワード").fill("password123");
      await page.getByRole("button", { name: "ログイン", exact: true }).click();

      // Should display generic error
      await expect(
        page.getByText("エラーが発生しました。もう一度お試しください。")
      ).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Protected route redirect", () => {
    test("unauthenticated user visiting /admin/comment is redirected to /login", async ({ page }) => {
      // get-session returns null (unauthenticated) - already set in beforeEach
      await page.goto("/admin/comment");

      // AdminProtectedRoute should redirect to /login
      await page.waitForURL("**/login", { timeout: 10000 });
      expect(page.url()).toContain("/login");
    });

    test("non-admin user visiting /admin/comment is redirected to /", async ({ page }) => {
      // Override get-session to return a regular (non-admin) user
      await page.route("**/api/auth/get-session", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: {
              id: "user-1",
              email: "regular@example.com",
              name: "Regular User",
              emailVerified: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            session: {
              id: "session-1",
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              token: "test-token",
            },
          }),
        });
      });

      await page.goto("/admin/comment");

      // Non-admin should be redirected to /
      await page.waitForURL("/", { timeout: 10000 });
    });
  });

  test.describe("Social login redirect", () => {
    test("Google login button initiates OAuth redirect", async ({ page }) => {
      // Track requests to the social sign-in endpoint
      let socialSignInCalled = false;
      await page.route("**/api/auth/sign-in/social", async (route) => {
        socialSignInCalled = true;
        // better-auth social sign-in returns a redirect URL
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            url: "https://accounts.google.com/o/oauth2/auth?client_id=test",
            redirect: true,
          }),
        });
      });

      await page.goto("/login");

      await page.getByRole("button", { name: /Google/i }).click();

      // Verify the social sign-in API was called
      await page.waitForTimeout(1000);
      expect(socialSignInCalled).toBe(true);
    });

    test("Twitter login button initiates OAuth redirect", async ({ page }) => {
      let socialSignInCalled = false;
      let requestProvider = "";
      await page.route("**/api/auth/sign-in/social", async (route) => {
        socialSignInCalled = true;
        const request = route.request();
        const postData = request.postDataJSON();
        requestProvider = postData?.provider || "";
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            url: "https://twitter.com/i/oauth2/authorize?client_id=test",
            redirect: true,
          }),
        });
      });

      await page.goto("/login");

      await page.getByRole("button", { name: /Twitter/i }).click();

      await page.waitForTimeout(1000);
      expect(socialSignInCalled).toBe(true);
      expect(requestProvider).toBe("twitter");
    });
  });

  test.describe("Signup link navigation", () => {
    test("clicking signup link navigates to /signup", async ({ page }) => {
      await page.goto("/login");

      await page.getByText("アカウントをお持ちでない方はこちら").click();

      await page.waitForURL("**/signup", { timeout: 10000 });
      expect(page.url()).toContain("/signup");
    });
  });
});
