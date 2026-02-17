import { test, expect } from "@playwright/test";
import { PAGE_COVERAGE } from "../shared/pageCoverage";

test.describe("All pages smoke test", () => {
  for (const pageInfo of PAGE_COVERAGE) {
    test(`${pageInfo.template} returns no 5xx`, async ({ request }) => {
      const response = await request.get(pageInfo.systemPath, {
        failOnStatusCode: false,
      });
      expect(response.status()).toBeLessThan(500);
    });
  }
});
