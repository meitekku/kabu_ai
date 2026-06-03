import { test, expect } from "@playwright/test";

const mockReport = {
  success: true,
  data: {
    id: 1,
    code: "7203",
    per: 12.5,
    pbr: 1.2,
    industry_avg_per: 15.0,
    industry_avg_pbr: 1.5,
    expected_per: 14.0,
    expected_pbr: 1.3,
    per_evaluation: "low",
    pbr_evaluation: "low",
    report_content:
      "トヨタ自動車のバリュエーションは割安水準にあります。PER 12.5倍は業種平均15.0倍を下回り、PBR 1.2倍も同様に割安です。",
    report_type: "weekly",
    created_at: "2026-02-20T10:00:00.000Z",
  },
};

const mockCompanyInfo = {
  success: true,
  data: [
    {
      code: "7203",
      name: "トヨタ自動車",
      market: 1,
      industry: "輸送用機器",
      current_price: "2850",
      price_change: "35",
    },
  ],
};

const mockNoReport = {
  success: false,
  data: null,
};

function setupCommonRoutes(
  page: import("@playwright/test").Page,
  reportResponse: object
) {
  return Promise.all([
    page.route("**/api/stocks/7203/valuation-report", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(reportResponse),
      });
    }),
    page.route("**/api/stocks/7203/company_info", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockCompanyInfo),
      });
    }),
    page.route("**/api/stocks/7203/chart", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] }),
      });
    }),
  ]);
}

test.describe("Valuation report page", () => {
  test("shows loading spinner initially", async ({ page }) => {
    // Delay the valuation-report response so the spinner is visible
    await page.route("**/api/stocks/7203/valuation-report", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockReport),
      });
    });
    await page.route("**/api/stocks/7203/company_info", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockCompanyInfo),
      });
    });
    await page.route("**/api/stocks/7203/chart", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    await page.goto("/stocks/7203/valuation");

    // The spinner should be visible while loading
    await expect(page.locator(".animate-spin").first()).toBeVisible({ timeout: 5000 });
  });

  test("displays full valuation report with PER/PBR data", async ({
    page,
  }) => {
    await setupCommonRoutes(page, mockReport);
    await page.goto("/stocks/7203/valuation");

    // Main heading
    await expect(
      page.getByRole("heading", { name: "AIバリュエーション診断" })
    ).toBeVisible({ timeout: 15000 });

    // PER values (appear in both summary and card, so use .first())
    await expect(page.getByText("現在のPER").first()).toBeVisible();
    await expect(page.getByText("12.50").first()).toBeVisible();

    // PBR values (appear in both summary and card, so use .first())
    await expect(page.getByText("現在のPBR").first()).toBeVisible();
    await expect(page.getByText("1.20").first()).toBeVisible();

    // Evaluation badges (low = 割安)
    const badges = page.getByText("割安");
    await expect(badges.first()).toBeVisible();

    // PER analysis card
    await expect(page.getByText("PER 分析")).toBeVisible();

    // PBR analysis card
    await expect(page.getByText("PBR 分析")).toBeVisible();

    // AI想定値 labels
    const aiExpected = page.getByText("AI想定値");
    await expect(aiExpected.first()).toBeVisible();

    // AI analysis summary section
    await expect(page.getByText("AI 分析サマリー")).toBeVisible();
    await expect(
      page.getByText("トヨタ自動車のバリュエーションは割安水準にあります", {
        exact: false,
      }).first()
    ).toBeVisible();

    // Disclaimer
    await expect(
      page.getByText("投資の最終決定はご自身の判断で行ってください", {
        exact: false,
      })
    ).toBeVisible();
  });

  test("shows empty state when no report is available", async ({ page }) => {
    await setupCommonRoutes(page, mockNoReport);
    await page.goto("/stocks/7203/valuation");

    // No-report message
    await expect(
      page.getByText("レポートはまだ作成されていません")
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByText("決算発表や重要な市場ニュースの後に生成されます")
    ).toBeVisible();

    // Should NOT show analysis sections
    await expect(
      page.getByRole("heading", { name: "AIバリュエーション診断" })
    ).not.toBeVisible();
  });

  test("displays weekly report type badge", async ({ page }) => {
    await setupCommonRoutes(page, mockReport);
    await page.goto("/stocks/7203/valuation");

    await expect(
      page.getByRole("heading", { name: "AIバリュエーション診断" })
    ).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("週次")).toBeVisible();
  });

  test("displays settlement report type badge", async ({ page }) => {
    const settlementReport = {
      ...mockReport,
      data: { ...mockReport.data, report_type: "settlement" },
    };
    await setupCommonRoutes(page, settlementReport);
    await page.goto("/stocks/7203/valuation");

    await expect(
      page.getByRole("heading", { name: "AIバリュエーション診断" })
    ).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("決算")).toBeVisible();
  });

  test("displays company name from company info header", async ({ page }) => {
    await setupCommonRoutes(page, mockReport);
    await page.goto("/stocks/7203/valuation");

    await expect(
      page.getByTestId("company-basic-info").getByText("トヨタ自動車")
    ).toBeVisible({
      timeout: 15000,
    });
  });
});
