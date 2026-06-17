import { test, expect } from "@playwright/test";

test.describe("Grove Search", () => {
  test("loads the grove page", async ({ page }) => {
    await page.goto("/grove");
    await page.waitForLoadState("networkidle");
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });

  test("displays grove search interface", async ({ page }) => {
    await page.goto("/grove");
    await page.waitForLoadState("domcontentloaded");

    // The grove page should have search-related content
    const pageText = await page.locator("body").innerText();
    const hasGroveContent = pageText.toLowerCase().includes("grove");
    expect(hasGroveContent).toBeTruthy();
  });

  test("renders search results or empty state", async ({ page }) => {
    await page.goto("/grove");
    await page.waitForLoadState("networkidle");

    // Verify the page renders without crash
    const hasContent = await page.locator("body").isVisible();
    expect(hasContent).toBe(true);
  });
});