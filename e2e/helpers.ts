import { test } from "@playwright/test";

export function skipWhenWebUnavailable() {
  test.beforeAll(async () => {
    const baseUrl =
      process.env.E2E_WEB_URL ??
      process.env.E2E_BASE_URL ??
      "http://localhost:3000";
    try {
      const response = await fetch(baseUrl, {
        signal: AbortSignal.timeout(2500),
      });
      test.skip(
        response.status >= 500,
        `${baseUrl} returned ${response.status}`,
      );
    } catch {
      test.skip(
        true,
        `${baseUrl} is not reachable; start the web app to run E2E checks.`,
      );
    }
  });
}
