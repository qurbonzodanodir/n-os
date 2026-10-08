import { expect, test } from "@playwright/test";
import { addDays, seed, stored, task, today, workspace } from "./helpers";

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
    await expect(page.locator('dialog [data-value="debts"]')).toBeVisible();
    await expect(page.locator('dialog [data-value="review"]')).toBeVisible();
  });
});

test("keyboard shortcuts navigate, complete tasks and show help", async ({ page, request }) => {
  await seed(request, workspace({ tasks: [task("t1", "First job"), task("t2", "Second job")] }));
  await page.goto("/#today");
  await expect(page.locator(".search-trigger")).toBeVisible();

  await page.keyboard.press("g");
  await page.keyboard.press("t");
  await expect(page).toHaveURL(/#tasks$/);

  await page.keyboard.press("j");
  await expect(page.locator('.row-body:has-text("First job")')).toBeFocused();
  await page.keyboard.press("j");
  await page.keyboard.press("x");
  await expect.poll(async () => (await stored(request)).tasks.find((row: { id: string }) => row.id === "t2").status).toBe("completed");

  await page.keyboard.press("n");
  await expect(page.locator("#item-form")).toBeVisible();
  await page.keyboard.press("Escape");

  await page.keyboard.press("?");
  await expect(page.locator(".shortcut-list")).toBeVisible();
});

test("shortcuts are ignored while typing", async ({ page, request }) => {
  await seed(request, workspace());
  await page.goto("/#tasks");
  await page.locator("#quick-add-task").fill("");
  await page.locator("#quick-add-task").pressSequentially("n? g");
  await expect(page.locator("#quick-add-task")).toHaveValue("n? g");
  await expect(page.locator("dialog[open]")).toHaveCount(0);
});

test.describe("mobile swipes", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  const swipe = (page: import("@playwright/test").Page, title: string, dx: number) =>
    page.evaluate(
      ([name, distance]) => {
        const row = [...document.querySelectorAll<HTMLElement>(".row.task-draggable")].find((node) =>
          node.textContent?.includes(name as string),
        );
        if (!row) throw new Error("row not found");
        const box = row.getBoundingClientRect();
        const x = box.left + box.width / 2;
        const y = box.top + box.height / 2;
        const fire = (type: string, offset: number) =>
          row.dispatchEvent(
            new PointerEvent(type, { pointerType: "touch", clientX: x + offset, clientY: y, bubbles: true, isPrimary: true }),
          );
        fire("pointerdown", 0);
        fire("pointermove", (distance as number) / 2);
        fire("pointerup", distance as number);
      },
      [title, dx],
    );

  test("swiping a task right completes it and left postpones it", async ({ page, request }) => {
    await seed(request, workspace({ tasks: [task("a", "Swipe done"), task("b", "Swipe later")] }));
    await page.goto("/#tasks");
    await expect(page.getByText("Swipe done")).toBeVisible();
    await swipe(page, "Swipe done", 140);
    await expect.poll(async () => (await stored(request)).tasks.find((row: { id: string }) => row.id === "a").status).toBe("completed");
    await expect(page.getByText("Swipe later")).toBeVisible();
    await swipe(page, "Swipe later", -140);
    await expect
      .poll(async () => (await stored(request)).tasks.find((row: { id: string }) => row.id === "b").date)
      .toBe(addDays(today(), 1));
  });
});

test.describe("getting started", () => {
  test("the checklist tracks progress and can be dismissed for good", async ({ page, request }) => {
    await seed(request, workspace({ tasks: [task("t1", "First")] }));
    await page.goto("/#today");
    const card = page.locator(".onboarding");
    await expect(card).toContainText("Getting started");
    await expect(card).toContainText("1/4");
    await card.locator('[data-action="dismiss-onboarding"]').click();
    await expect(card).toHaveCount(0);
    await expect.poll(async () => (await stored(request)).settings.onboardingDismissed).toBe(true);
    await page.reload();
    await expect(page.locator(".onboarding")).toHaveCount(0);
  });

  test("it disappears on its own once every step is done", async ({ page, request }) => {
    await page.addInitScript(() => localStorage.setItem("n-os-palette-used", "1"));
    await seed(
      request,
      workspace({
        tasks: [task("t1", "First")],
        habits: [{ id: "h1", title: "Read", completions: [] }],
        accounts: [{ id: "a", title: "Cash", opening: 0, currency: "USD" }],
      }),
    );
    await page.goto("/#today");
    await expect(page.locator(".search-trigger")).toBeVisible();
    await expect(page.locator(".onboarding")).toHaveCount(0);
  });
});
