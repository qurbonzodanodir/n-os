import { expect, test } from "@playwright/test";
import { seed, workspace } from "./helpers";

test("the manifest is valid and Chromium reports no installability errors", async ({ page, request }) => {
  await seed(request, workspace());
  await page.goto("/#today");
  await expect(page.locator(".search-trigger")).toBeVisible();

  const manifest = await (await request.get("/manifest.webmanifest")).json();
  const sizes = manifest.icons.filter((icon: { type: string }) => icon.type === "image/png").map((icon: { sizes: string }) => icon.sizes);
  expect(sizes).toEqual(expect.arrayContaining(["192x192", "512x512"]));
  expect(manifest.icons.some((icon: { purpose?: string }) => icon.purpose === "maskable")).toBe(true);
  for (const icon of manifest.icons) expect((await request.get(icon.src)).ok(), icon.src).toBe(true);
  expect((await request.get("/apple-touch-icon.png")).ok()).toBe(true);

  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("crossorigin", "use-credentials");
  const session = await page.context().newCDPSession(page);
  const { installabilityErrors } = await session.send("Page.getInstallabilityErrors");
  expect(installabilityErrors).toEqual([]);
});

test("the service worker registers on first visit and caches the app shell", async ({ page, request }) => {
  await seed(request, workspace());
  await page.goto("/#today");
  await expect(page.locator(".search-trigger")).toBeVisible();
  // Regression: the app module loads after window "load", which used to skip registration entirely.
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await expect
    .poll(() => page.evaluate(async () => Boolean(await caches.match("/")) && Boolean(await caches.match("/icon-192.png"))))
    .toBe(true);
});
