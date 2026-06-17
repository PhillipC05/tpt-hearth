import { test, expect } from "@playwright/test";

test.describe("Auth Flow", () => {
  test("loads the auth page with sign-in options", async ({ page }) => {
    await page.goto("/auth");
    await expect(page).toHaveURL(/\/auth/);
    // The auth page should render the AuthForm component
    await expect(page.locator("text=Auth").or(page.locator("h1"))).toBeVisible();
  });

  test("redirects unauthenticated users from protected routes", async ({ page }) => {
    // Hearth is a protected route
    const response = await page.goto("/hearth");
    // Should redirect to auth or return a 401
    const url = page.url();
    expect(url.includes("/auth") || url.includes("/auth")).toBeTruthy();
  });
});