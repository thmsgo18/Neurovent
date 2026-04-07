const { test, expect } = require("@playwright/test");

test("home page loads the public landing experience", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("button", { name: /explore events/i })).toBeVisible();
  await expect(page.getByText(/everything you need to organize research events/i)).toBeVisible();
});
