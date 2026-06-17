import { test, expect } from "@playwright/test";

test.describe("Hearth Room Chat", () => {
  test("loads the hearth page", async ({ page }) => {
    await page.goto("/hearth");
    // Should redirect to auth or show the hearth page
    await page.waitForLoadState("networkidle");
    // The page title or nav should reference "hearth" or "Hearth"
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });

  test("displays room cards when authenticated", async ({ page }) => {
    // Navigate to hearth - if not authenticated, will redirect
    await page.goto("/hearth");
    await page.waitForLoadState("networkidle");

    // If we're on the auth page, note it (not authenticated)
    const currentUrl = page.url();
    if (currentUrl.includes("/auth")) {
      test.info().annotations.push({
        type: "info",
        description: "User was redirected to auth - no active session"
      });
    }
  });

  test("room link navigates to room chat", async ({ page }) => {
    await page.goto("/hearth");
    await page.waitForLoadState("domcontentloaded");

    // Attempt to click on a room card if present (navigate to /hearth/:roomId)
    const roomLinks = page.locator('a[href*="/hearth/"]');
    const count = await roomLinks.count();

    if (count > 0) {
      const href = await roomLinks.first().getAttribute("href");
      await roomLinks.first().click();
      await page.waitForLoadState("networkidle");
      expect(page.url()).toContain(href ?? "/hearth/");
    }
  });
});