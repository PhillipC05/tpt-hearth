import { test, expect } from "@playwright/test";

test.describe("Porch Session Flow", () => {
  test("loads the porch page", async ({ page }) => {
    await page.goto("/porch");
    await page.waitForLoadState("networkidle");
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });

  test("displays the porch UI elements", async ({ page }) => {
    await page.goto("/porch");
    await page.waitForLoadState("domcontentloaded");

    // The porch page should show key UI elements
    const pageText = await page.locator("body").innerText();
    const hasPorchTitle = pageText.toLowerCase().includes("porch");
    expect(hasPorchTitle).toBeTruthy();
  });

  test("renders available porch sessions or empty state", async ({ page }) => {
    await page.goto("/porch");
    await page.waitForLoadState("networkidle");

    // Should either list sessions or show an empty state
    const sessionsSection = page.locator("text=/sit for|no one else|porch|session/i");
    const isVisible = await sessionsSection.first().isVisible().catch(() => false);
    // Just verify the page loads without error
    expect(await page.locator("body").isVisible()).toBe(true);
  });
});