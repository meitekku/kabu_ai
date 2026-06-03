import { test, expect } from "@playwright/test";

/**
 * Setup common API mocks for chat page tests.
 * Mocks: company_info, chart, turnstile status, auth session.
 */
async function setupChatMocks(page: import("@playwright/test").Page) {
  // Mock company info
  await page.route("**/api/stocks/7203/company_info", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: [
          {
            code: "7203",
            name: "トヨタ自動車",
            market: 1,
            industry: "輸送用機器",
          },
        ],
      }),
    });
  });

  // Mock chart data
  await page.route("**/api/stocks/7203/chart", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: [
          {
            date: "2026-02-24",
            open: 2800,
            high: 2850,
            low: 2780,
            close: 2830,
            volume: 10000000,
          },
          {
            date: "2026-02-21",
            open: 2750,
            high: 2810,
            low: 2740,
            close: 2800,
            volume: 9500000,
          },
        ],
      }),
    });
  });

  // Bypass Cloudflare Turnstile - report as disabled
  await page.route("**/api/cloudflare/turnstile/status", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ enabled: false, verified: true }),
    });
  });

  // Mock auth session - not logged in by default
  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(null),
    });
  });
}

test.describe("Chat System", () => {
  test("chat page without stock code shows not found", async ({ page }) => {
    await page.goto("/chat");
    // notFound() renders a 404 page - chat interface should NOT be present
    await expect(page.getByText("404")).toBeVisible({ timeout: 5000 });
    await expect(
      page.getByText("株式投資AIアシスタント")
    ).not.toBeVisible();
  });

  test("chat page loads with company info", async ({ page }) => {
    await setupChatMocks(page);
    await page.goto("/chat?code=7203");

    await expect(
      page.getByText("対象銘柄:").first()
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByText("トヨタ自動車（7203）", { exact: true }).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("starter questions displayed", async ({ page }) => {
    await setupChatMocks(page);
    await page.goto("/chat?code=7203");

    // Wait for the empty state heading
    await expect(
      page.getByText("株式投資AIアシスタント").first()
    ).toBeVisible({ timeout: 15000 });

    // Starter questions section should be visible
    await expect(
      page.getByText("最初の質問テンプレート（1回のみ表示）")
    ).toBeVisible({ timeout: 10000 });

    // Should show 4 starter question buttons
    const starterButtons = page.locator(
      'button:has-text("トヨタ自動車（7203）")'
    );
    await expect(starterButtons).toHaveCount(4, { timeout: 10000 });
  });

  test("send message and receive streaming response", async ({ page }) => {
    await setupChatMocks(page);

    // Mock chat API to return streaming response
    await page.route("**/api/chat", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/plain; charset=utf-8",
        headers: { "X-Chat-Id": "test-chat-id" },
        body: "これはテスト応答です。トヨタ自動車について分析します。",
      });
    });

    await page.goto("/chat?code=7203");

    // Wait for the textarea to become enabled (fingerprint loaded)
    const textarea = page.getByPlaceholder(
      "メッセージを入力... (Shift+Enterで改行)"
    );
    await expect(textarea).toBeEnabled({ timeout: 15000 });

    // Type a message and send
    await textarea.fill("トヨタ自動車の分析をお願いします");
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeEnabled({ timeout: 5000 });
    await submitBtn.click();

    // Verify user message appears
    await expect(
      page.getByText("トヨタ自動車の分析をお願いします")
    ).toBeVisible({ timeout: 10000 });

    // Verify assistant response appears
    await expect(
      page.getByText("これはテスト応答です。トヨタ自動車について分析します。")
    ).toBeVisible({ timeout: 10000 });

    // Verify message role labels
    await expect(page.getByText("あなた")).toBeVisible();
    await expect(page.getByText("AI アシスタント")).toBeVisible();
  });

  test("rate limit - guest shows login modal", async ({ page }) => {
    await setupChatMocks(page);

    // Mock chat API to return 429 with requireLogin
    await page.route("**/api/chat", async (route) => {
      await route.fulfill({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({
          error: "無料のチャット回数を使い切りました",
          requireLogin: true,
        }),
      });
    });

    await page.goto("/chat?code=7203");

    const textarea = page.getByPlaceholder(
      "メッセージを入力... (Shift+Enterで改行)"
    );
    await expect(textarea).toBeEnabled({ timeout: 15000 });

    await textarea.fill("テストメッセージ");
    const submitBtn1 = page.locator('button[type="submit"]');
    await expect(submitBtn1).toBeEnabled({ timeout: 5000 });
    await submitBtn1.click();

    // LoginModal should appear with its title
    await expect(
      page.getByText("ログインが必要です")
    ).toBeVisible({ timeout: 10000 });
    // LoginModal action button
    await expect(
      page.getByRole("button", { name: "ログインする" })
    ).toBeVisible();
  });

  test("rate limit - user shows premium modal", async ({ page }) => {
    await setupChatMocks(page);

    // Mock chat API to return 429 with requirePremium
    await page.route("**/api/chat", async (route) => {
      await route.fulfill({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({
          error: "本日の無料利用回数を超えました",
          requirePremium: true,
        }),
      });
    });

    await page.goto("/chat?code=7203");

    const textarea = page.getByPlaceholder(
      "メッセージを入力... (Shift+Enterで改行)"
    );
    await expect(textarea).toBeEnabled({ timeout: 15000 });

    await textarea.fill("テストメッセージ");
    const submitBtn2 = page.locator('button[type="submit"]');
    await expect(submitBtn2).toBeEnabled({ timeout: 5000 });
    await submitBtn2.click();

    // PremiumModal should appear with the custom title from ChatInterface
    await expect(
      page.getByText("本日の無料利用回数を超えました")
    ).toBeVisible({ timeout: 10000 });
    // PremiumModal action button
    await expect(
      page.getByRole("button", { name: "プレミアム会員になる" })
    ).toBeVisible();
  });

  test("loading state during response", async ({ page }) => {
    await setupChatMocks(page);

    // Mock chat API with a delayed response
    await page.route("**/api/chat", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: "text/plain; charset=utf-8",
        headers: { "X-Chat-Id": "test-chat-id" },
        body: "遅延応答です。",
      });
    });

    await page.goto("/chat?code=7203");

    const textarea = page.getByPlaceholder(
      "メッセージを入力... (Shift+Enterで改行)"
    );
    await expect(textarea).toBeEnabled({ timeout: 15000 });

    await textarea.fill("テストメッセージ");
    const submitBtn3 = page.locator('button[type="submit"]');
    await expect(submitBtn3).toBeEnabled({ timeout: 5000 });
    await submitBtn3.click();

    // Loading indicator should appear while waiting for response
    await expect(page.getByText("考え中...")).toBeVisible({ timeout: 5000 });

    // After response arrives, loading indicator should disappear
    await expect(page.getByText("考え中...")).toBeHidden({ timeout: 10000 });
    await expect(page.getByText("遅延応答です。")).toBeVisible();
  });
});
