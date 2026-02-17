import { expect, test, type Page } from "@playwright/test";

type Box = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getBoxByTestId = async (page: Page, testId: string): Promise<Box> => {
  const locator = page.getByTestId(testId);
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error(`Bounding box not found for ${testId}`);
  }
  return box;
};

const assertAligned = (name: string, skeleton: Box, loaded: Box) => {
  expect(Math.abs(skeleton.x - loaded.x), `${name}: x position drift`).toBeLessThanOrEqual(4);
  expect(Math.abs(skeleton.y - loaded.y), `${name}: y position drift`).toBeLessThanOrEqual(8);
  expect(Math.abs(skeleton.width - loaded.width), `${name}: width drift`).toBeLessThanOrEqual(6);
  expect(Math.abs(skeleton.height - loaded.height), `${name}: height drift`).toBeLessThanOrEqual(28);
};

const buildChartData = (count: number) => {
  return Array.from({ length: count }, (_, index) => {
    const day = index + 1;
    const base = 250 + index;
    const dayLabel = day.toString().padStart(2, "0");

    return {
      date: `2026-01-${dayLabel}`,
      open: base,
      high: base + 4,
      low: base - 3,
      close: base + 2,
      volume: 100000 + index * 1000,
    };
  });
};

const buildChartNews = (count: number) => {
  return Array.from({ length: count }, (_, index) => {
    const day = index + 1;
    const dayLabel = day.toString().padStart(2, "0");

    return {
      id: index + 1,
      code: "3103",
      title: `チャート連携ニュース ${index + 1}`,
      content: "chart news",
      created_at: `2026-01-${dayLabel} 09:00:00`,
      company_name: "ユニチカ",
      status: JSON.stringify({ news: true }),
    };
  });
};

const buildNewsListData = (count: number) => {
  return Array.from({ length: count }, (_, index) => {
    const day = index + 1;
    const dayLabel = day.toString().padStart(2, "0");

    return {
      id: 1000 + index,
      code: "3103",
      title: `最新ニュース ${index + 1}`,
      content: "list news",
      created_at: `2026-02-${dayLabel} 10:00`,
      company_name: "ユニチカ",
      status: JSON.stringify({ news: true }),
    };
  });
};

test.describe("Stocks news loading alignment", () => {
  test("/stocks/3103/news skeleton and loaded layout stay aligned", async ({ page }) => {
    const chartData = buildChartData(24);
    const chartNews = buildChartNews(24);
    const newsListData = buildNewsListData(10);

    await page.route("**/api/stocks/3103/company_info", async (route) => {
      await wait(1200);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [
            {
              code: "3103",
              name: "ユニチカ",
              market: 1,
              industry: "繊維製品",
              forward_pe: "12.11",
              trailing_pe: "11.95",
              price_to_book: "0.78",
              market_cap: 123456789000,
              current_price: "267",
              price_change: "3",
              dividend_yield: "1.43",
            },
          ],
        }),
      });
    });

    await page.route("**/api/stocks/3103/chart", async (route) => {
      await wait(1200);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: chartData,
        }),
      });
    });

    await page.route("**/api/stocks/3103/news", async (route) => {
      await wait(1200);
      const postData = route.request().postData();
      const body = postData ? JSON.parse(postData) : {};
      const isChartNewsRequest = body?.limit === 60;

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: isChartNewsRequest ? chartNews : newsListData,
        }),
      });
    });

    await page.goto("/stocks/3103/news");

    const skeletonCompanyBox = await getBoxByTestId(page, "company-basic-info-skeleton");
    const skeletonChartBox = await getBoxByTestId(page, "stock-chart-skeleton");
    const skeletonNewsBox = await getBoxByTestId(page, "news-list-skeleton");

    await expect(page.getByTestId("company-basic-info")).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId("stock-chart")).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId("news-list")).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId("ai-feature-nav")).toBeVisible({ timeout: 20000 });

    const loadedCompanyBox = await getBoxByTestId(page, "company-basic-info");
    const loadedChartBox = await getBoxByTestId(page, "stock-chart");
    const loadedNewsBox = await getBoxByTestId(page, "news-list");

    assertAligned("CompanyBasicInfo", skeletonCompanyBox, loadedCompanyBox);
    assertAligned("StockChart", skeletonChartBox, loadedChartBox);
    assertAligned("NewsList", skeletonNewsBox, loadedNewsBox);
  });
});
