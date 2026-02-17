import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./__tests__/e2e",
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: isCI ? "npm run start" : "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !isCI,
    timeout: 180000,
    env: {
      HOSTNAME: "127.0.0.1",
      PORT: "3000",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
