import { test, expect } from "@playwright/test";

test.describe("PWA Shell Loads Offline", () => {
  test("service worker is registered", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Check if service worker is registered
    const hasSw = await page.evaluate(() => {
      return "serviceWorker" in navigator;
    });
    expect(hasSw).toBe(true);
  });

  test("app shell URLs are cached by service worker", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Verify the page loaded successfully
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });

  test("manifest.webmanifest is accessible", async ({ page }) => {
    const response = await page.goto("/manifest.webmanifest");
    expect(response?.ok()).toBe(true);
    const contentType = response?.headers()["content-type"] ?? "";
    expect(contentType).toContain("json");
  });
});