import { expect, test } from "@playwright/test";
import { addDays, seed, stored, task, today, workspace } from "./helpers";

const event = (extra: Record<string, unknown> = {}) => ({
  id: "e1",
  title: "Team sync",
  date: today(),
  time: "10:00",
  endTime: "11:00",
  repeat: "none",
  ...extra,
});

test("dragging an event to another day in the month grid reschedules it", async ({ page, request }) => {
  await seed(request, workspace({ events: [event()] }));
  await page.goto("/#calendar");
  const tomorrow = addDays(today(), 1);
  await page.locator(".cal-chip", { hasText: "Team sync" }).dragTo(page.locator(`.cal-day[data-value="${tomorrow}"]`));
  await expect.poll(async () => (await stored(request)).events[0].date).toBe(tomorrow);
});

test("dragging one occurrence of a repeating event shifts the whole series", async ({ page, request }) => {
  await seed(request, workspace({ events: [event({ repeat: "weekly", repeatUntil: addDays(today(), 60) })] }));
  await page.goto("/#calendar");
  const target = addDays(today(), 2);
  await page
    .locator(".cal-chip", { hasText: "Team sync" })
    .first()
    .dragTo(page.locator(`.cal-day[data-value="${target}"]`));
  await expect.poll(async () => (await stored(request)).events[0]).toMatchObject({ date: target, repeatUntil: addDays(today(), 62) });
});

test("dragging a task between days in the week view changes its due date", async ({ page, request }) => {
  await seed(request, workspace({ tasks: [task("t1", "File taxes", { date: today() })] }));
  await page.goto("/#calendar");
  await page.locator('[data-action="calendar-mode"][data-value="week"]').click();
  const columns = page.locator(".week-column");
  const source = columns.filter({ has: page.locator(".event-slot", { hasText: "File taxes" }) });
  const index = await columns.evaluateAll(
    (nodes, el) => nodes.findIndex((node) => node.contains(el as Node)),
    await source.elementHandle(),
  );
  const next = columns.nth((index + 1) % 7);
  await source.locator(".event-slot", { hasText: "File taxes" }).dragTo(next);
  await expect.poll(async () => (await stored(request)).tasks[0].date).not.toBe(today());
});
