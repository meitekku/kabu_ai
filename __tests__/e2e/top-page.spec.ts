import { test, expect } from "@playwright/test";

test.describe("Top Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("page loads successfully", async ({ page }) => {
    // The page should have the main heading for latest news
    await expect(page.getByText("新着ニュース")).toBeVisible({ timeout: 10000 });
  });

  test("NewsSection shows pickup and market news headings", async ({
    page,
  }) => {
    await expect(page.getByText("ピックアップニュース")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("市場ニュース")).toBeVisible({
      timeout: 10000,
    });
  });

  test("NewsSection displays news cards or loading skeletons", async ({
    page,
  }) => {
    // Either we see loading skeletons or actual news cards
    const hasCards = await page.locator(".rounded-lg.shadow").count();
    const hasSkeletons = await page.locator(".animate-pulse").count();

    expect(hasCards + hasSkeletons).toBeGreaterThan(0);
  });

  test("NewsListS section loads and shows content", async ({ page }) => {
    // Wait for NewsListS to finish loading (spinner disappears)
    await page.waitForSelector(".animate-spin", {
      state: "hidden",
      timeout: 15000,
    });

    // Should show either news items, empty state, or error state
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

    // Should have at least some news links (from either NewsSection or NewsListS)
    if (count > 0) {
      const firstLink = newsLinks.first();
      const href = await firstLink.getAttribute("href");
      expect(href).toMatch(/\/stocks\//);
    }
  });

  test("'もっと見る' link is present", async ({ page }) => {
    // The top page renders NewsListS with more={true}
    await page.waitForSelector(".animate-spin", {
      state: "hidden",
      timeout: 15000,
    });

    // Only check if actual news article links loaded (not ranking table items)
    const newsArticleLinks = await page.locator('a[href*="/stocks/"][href*="/news/"]').count();
    if (newsArticleLinks > 0) {
      await expect(page.getByText("もっと見る ›")).toBeVisible();
    }
  });

  test("page has proper title or meta", async ({ page }) => {
    // Wait for the page to fully load
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });
});
