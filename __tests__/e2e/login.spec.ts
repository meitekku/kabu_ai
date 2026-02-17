import { test, expect } from "@playwright/test";

test.describe("Login Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("page loads with login heading", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "ログイン" })).toBeVisible();
    await expect(page.getByText("アカウントにログイン")).toBeVisible();
  });

  test("email and password fields are present", async ({ page }) => {
    const emailInput = page.getByLabel("メールアドレス");
    const passwordInput = page.getByLabel("パスワード");

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(emailInput).toHaveAttribute("type", "email");
    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("submit button is present", async ({ page }) => {
    const submitButton = page.getByRole("button", { name: "ログイン", exact: true });
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeEnabled();
  });

  test("social login buttons are visible", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /Google/i })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Twitter/i })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Facebook/i })
    ).toBeVisible();
  });

  test("separator text is displayed", async ({ page }) => {
    await expect(page.getByText("または")).toBeVisible();
  });

  test("can type into email and password fields", async ({ page }) => {
    const emailInput = page.getByLabel("メールアドレス");
    const passwordInput = page.getByLabel("パスワード");

    await emailInput.fill("test@example.com");
    await passwordInput.fill("password123");

    await expect(emailInput).toHaveValue("test@example.com");
    await expect(passwordInput).toHaveValue("password123");
  });

  test("form submission shows loading state", async ({ page }) => {
    // Fill form and submit
    await page.getByLabel("メールアドレス").fill("test@example.com");
    await page.getByLabel("パスワード").fill("password123");

    await page.getByRole("button", { name: "ログイン", exact: true }).click();

    // Should briefly show loading state
    await expect(page.getByText("処理中...")).toBeVisible({ timeout: 2000 });
  });

  test("email field has required attribute", async ({ page }) => {
    const emailInput = page.getByLabel("メールアドレス");
    await expect(emailInput).toHaveAttribute("required", "");
  });

  test("password field has minLength 8", async ({ page }) => {
    const passwordInput = page.getByLabel("パスワード");
    await expect(passwordInput).toHaveAttribute("minlength", "8");
  });

  test("signup link is shown on localhost", async ({ page }) => {
    // On localhost, the signup link should be shown
    await expect(
      page.getByText("アカウントをお持ちでない方はこちら")
    ).toBeVisible({ timeout: 3000 });
  });
});
