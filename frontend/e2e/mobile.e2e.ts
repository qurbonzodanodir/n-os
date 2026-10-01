import { expect, test } from "@playwright/test";
import { seed, task, workspace } from "./helpers";

const views = ["today", "tasks", "calendar", "habits", "notes", "goals", "projects", "finance", "review", "settings"];
const data = () =>
  workspace(
    {
      tasks: [task("t1", "A fairly long task title that has to wrap on a narrow phone screen without breaking the layout")],
      accounts: [{ id: "a", title: "Cash", opening: 1000, currency: "USD" }],
    },
    { language: "ru" },
  );

test.describe("phone layout", () => {
  test.use({ viewport: { width: 360, height: 740 }, hasTouch: true });

  for (const view of views) {
    test(`${view} fits the screen width`, async ({ page, request }) => {
      await seed(request, data());
      await page.goto(`/#${view}`);
      await expect(page.locator(".mobile-nav")).toBeVisible();
      await page.waitForTimeout(300);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${view} scrolls sideways by ${overflow}px`).toBeLessThanOrEqual(1);
    });
  }

  test("the top bar shows drawn icons and keeps theme and language in Settings", async ({ page, request }) => {
    await seed(request, data());
    await page.goto("/#today");
    const buttons = page.locator(".topbar .actions > .btn:visible");
    await expect(buttons.first()).toBeVisible();
    for (const button of await buttons.all()) {
      const box = await button.locator("svg").first().boundingBox();
      expect(box?.width ?? 0, "every visible top bar button draws an icon").toBeGreaterThan(8);
    }
    await expect(page.locator('.topbar [data-action="theme"]')).toBeHidden();
    await expect(page.locator('.topbar [data-action="language"]')).toBeHidden();
    await page.goto("/#settings");
    await expect(page.locator('select[name="language"]')).toBeVisible();
    await expect(page.locator('select[name="theme"]')).toBeVisible();
  });

  test("there is a single add button and it adds what the page is about", async ({ page, request }) => {
    await seed(request, data());
    await page.goto("/#tasks");
    await expect(page.locator(".hero > .btn")).toBeHidden();
    const fab = page.locator(".mobile-fab");
    await expect(fab).toHaveAttribute("data-action", "add");
    await expect(fab).toHaveAttribute("data-value", "task");
    await fab.click();
    await expect(page.locator('#item-form input[name="title"]')).toBeVisible();
    await page.keyboard.press("Escape");
    await page.goto("/#settings");
    await expect(fab).toHaveCount(0);
  });

  test("task filters are fully readable and not clipped", async ({ page, request }) => {
    await seed(request, data());
    await page.goto("/#tasks");
    for (const id of ["#task-priority-filter", "#task-sort", "#project-filter", "#task-saved-view"]) {
      const clipped = await page.locator(id).evaluate((el) => {
        const select = el as HTMLSelectElement;
        const probe = document.createElement("span");
        const style = getComputedStyle(select);
        probe.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font:${style.font}`;
        probe.textContent = select.selectedOptions[0]?.textContent ?? "";
        document.body.append(probe);
        const needed = probe.getBoundingClientRect().width;
        probe.remove();
        return needed > select.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      });
      expect(clipped, `${id} text is cut off`).toBe(false);
    }
  });
});

test.describe("desktop layout", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("keeps theme and language in the top bar with a visible icon", async ({ page, request }) => {
    await seed(request, data());
    await page.goto("/#today");
    const theme = page.locator('.topbar [data-action="theme"]');
    await expect(theme).toBeVisible();
    expect((await theme.locator("svg").boundingBox())?.width ?? 0).toBeGreaterThan(8);
    await expect(page.locator('.topbar [data-action="language"]')).toBeVisible();
  });
});
