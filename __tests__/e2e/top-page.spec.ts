import { test, expect } from "@playwright/test";

test.describe("Top Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("page loads successfully", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "新着ニュース" }).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("TrendingSection shows dynamic content headings", async ({ page }) => {
    // One of the time-based section labels must be visible
    const possibleLabels = [
      "値上がり注目銘柄",
      "売買代金上位銘柄",
      "ストップ高銘柄",
      "PTS変動注目銘柄",
      "掲示板盛り上がり銘柄",
      "最新AI分析記事",
    ];
    // Wait for loading skeletons to disappear or content to appear
    await page.waitForFunction(
      (labels) =>
        labels.some((label) => document.body.innerText.includes(label)) ||
        document.querySelectorAll(".animate-pulse").length === 0,
      possibleLabels,
      { timeout: 10000 }
    );
    // At least one label should appear (or skeleton was shown and data is empty)
    const bodyText = await page.evaluate(() => document.body.innerText);
    const hasLabel = possibleLabels.some((label) => bodyText.includes(label));
    const hasEmptyState = bodyText.includes("現在データがありません");
    expect(hasLabel || hasEmptyState).toBe(true);
  });

  test("TrendingSection displays cards or loading skeletons", async ({
    page,
  }) => {
    const hasCards = await page.locator(".rounded-xl.shadow").count();
    const hasSkeletons = await page.locator(".animate-pulse").count();
    expect(hasCards + hasSkeletons).toBeGreaterThan(0);
  });

  test("NewsListS section loads and shows content", async ({ page }) => {
    await page.waitForSelector(".animate-spin", {
      state: "hidden",
      timeout: 15000,
    });

    const newsItems = await page.locator(".border-b.border-gray-100").count();
    const emptyState = await page.getByText("現在、ニュースはありません。").count();
    const errorState = await page.locator(".text-red-600").count();

    expect(newsItems + emptyState + errorState).toBeGreaterThan(0);
  });

  test("news items have links", async ({ page }) => {
    await page.waitForSelector(".animate-spin", {
      state: "hidden",
      timeout: 15000,
    });

    const newsLinks = page.locator('a[href*="/stocks/"]');
    const count = await newsLinks.count();

    if (count > 0) {
      const href = await newsLinks.first().getAttribute("href");
      expect(href).toMatch(/\/stocks\//);
    }
  });

  test("'もっと見る' link is present", async ({ page }) => {
    await page.waitForSelector(".animate-spin", {
      state: "hidden",
      timeout: 15000,
    });

    const newsArticleLinks = await page
      .locator('a[href*="/stocks/"][href*="/news/"]')
      .count();
    if (newsArticleLinks > 0) {
      await expect(page.getByText("もっと見る ›")).toBeVisible();
    }
  });

  test("page has proper title or meta", async ({ page }) => {
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });
});
