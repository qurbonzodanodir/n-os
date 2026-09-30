import { expect, test } from "@playwright/test";
import { seed, task, workspace } from "./helpers";

test("command palette runs commands and finds records with the keyboard", async ({ page, request }) => {
  await seed(request, workspace({ tasks: [task("t1", "Renew passport")] }));
  await page.goto("/#today");
  await expect(page.locator(".search-trigger")).toBeVisible();
  await page.keyboard.press("Control+k");
  const input = page.locator("#global-search");
  await expect(input).toBeFocused();

  await input.fill("finance");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#finance$/);

  await expect(page.locator(".search-trigger")).toBeVisible();
  await page.keyboard.press("Control+k");
  await page.locator("#global-search").fill("passport");
  await expect(page.locator(".search-result", { hasText: "Renew passport" })).toBeVisible();
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test("bottom navigation switches views and More lists every section", async ({ page, request }) => {
    await seed(request, workspace());
    await page.goto("/#today");
    const nav = page.locator(".mobile-nav");
    await expect(nav).toBeVisible();
    await nav.locator('[data-value="tasks"]').click();
    await expect(page).toHaveURL(/#tasks$/);
    await nav.locator('[data-action="more"]').click();
    await expect(page.locator('dialog [data-value="finance"]')).toBeVisible();
    await expect(page.locator('dialog [data-value="review"]')).toBeVisible();
  });
});
