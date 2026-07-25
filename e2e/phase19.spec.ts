import { expect, test } from "@playwright/test";
import { skipWhenWebUnavailable } from "./helpers";

const webUrl = process.env.E2E_WEB_URL ?? "http://localhost:3000";

skipWhenWebUnavailable();

test.describe("Phase 19 release readiness routes", () => {
  test("public SaaS and status pages render", async ({ page }) => {
    for (const route of [
      "/pricing",
      "/signup/institution",
      "/status",
      "/offline",
    ]) {
      const response = await page.goto(`${webUrl}${route}`);
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator("body")).toBeVisible();
    }
  });
});
