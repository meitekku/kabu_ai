import { test, expect } from "@playwright/test";

test.describe("Top Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("page loads successfully", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "AIポートフォリオエージェント" }).first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test("welcome message types out and shows risk preset buttons", async ({
    page,
  }) => {
    // WHY: typewriter animation reveals the buttons after ~3s. Allow generous timeout.
    await expect(
      page.getByRole("button", { name: "安定", exact: true }),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByRole("button", { name: "バランス", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "成長", exact: true }),
    ).toBeVisible();
  });

  test("chat input is present", async ({ page }) => {
    const placeholderRegex = /投資目標|本日の/;
    await expect(
      page.locator(`textarea, input[type="text"]`).first(),
    ).toBeVisible({ timeout: 10000 });
    const inputs = await page.locator(`textarea, input`).all();
    let matched = false;
    for (const el of inputs) {
      const ph = (await el.getAttribute("placeholder")) ?? "";
      if (placeholderRegex.test(ph)) {
        matched = true;
        break;
      }
    }
    expect(matched).toBe(true);
  });

  test("page has proper title or meta", async ({ page }) => {
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });
});
