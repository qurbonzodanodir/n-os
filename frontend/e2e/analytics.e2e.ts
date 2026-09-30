import { expect, test } from "@playwright/test";
import { addDays, seed, task, today, workspace } from "./helpers";

const month = today().slice(0, 7);
const account = { id: "cash", title: "Cash", opening: 0, currency: "USD" };
const expense = (id: string, date: string, amount: number, category = "Food") => ({
  id,
  kind: "expense",
  amount,
  date,
  category,
  accountId: "cash",
});

test("review compares the period with the previous one and lists progress", async ({ page, request }) => {
  const done = (id: string, completedAt: string) => task(id, `Done ${id}`, { status: "completed", completedAt, projectId: "p1" });
  await seed(
    request,
    workspace({
      goals: [{ id: "g1", title: "Launch" }],
      projects: [{ id: "p1", title: "Website", goalId: "g1" }],
      tasks: [
        done("a", today()),
        done("b", today()),
        done("c", addDays(today(), -8)),
        task("d", "Open", { projectId: "p1", date: addDays(today(), 3) }),
      ],
    }),
  );
  await page.goto("/#review");
  await page.locator('[data-action="review-period"][data-value="week"]').click();
  await expect(page.locator(".compare-row", { hasText: "Completed" })).toContainText("2");
  await expect(page.locator(".progress-row", { hasText: "Website" })).toContainText("75%");
  await expect(page.locator(".progress-row", { hasText: "Launch" })).toBeVisible();
});

test("weekly report is generated automatically and can be copied", async ({ page, request, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const lastWeek = addDays(today(), -7);
  await seed(request, workspace({ tasks: [task("a", "Old win", { status: "completed", completedAt: lastWeek, createdAt: lastWeek })] }));
  await page.goto("/#review");
  await expect(page.locator(".weekly-report")).toBeVisible();
  await expect(page.locator(".weekly-report pre")).toContainText("Weekly report");
  await expect(page.locator(".weekly-report")).toContainText("automatic");
  await page.locator('[data-action="report-copy"]').click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain("Weekly report");
});

test("finance forecasts month-end spending against the budget", async ({ page, request }) => {
  // Freeze the clock on day 10 of a 31-day month so the projection is deterministic.
  await page.clock.setFixedTime(new Date("2026-03-10T08:00:00Z"));
  await seed(
    request,
    workspace({
      accounts: [account],
      transactions: [expense("x1", "2026-03-05", 50_000)],
      budgets: [{ id: "b1", title: "Food", category: "Food", amount: 60_000, monthKey: "2026-03", currency: "USD" }],
    }),
  );
  await page.goto("/#finance");
  await page.locator("#finance-month").fill("2026-03");
  const forecast = page.locator(".expense-forecast");
  await expect(forecast).toContainText("Projected for month");
  await expect(forecast).toContainText("$1,550.00");
  await expect(forecast).toContainText("Over budget: $950.00");
});

test("finance compares spending with the previous month", async ({ page, request }) => {
  const previous = `${new Date(Date.parse(`${month}-01T12:00:00Z`) - 86_400_000).toISOString().slice(0, 7)}-01`;
  await seed(
    request,
    workspace({ accounts: [account], transactions: [expense("x1", `${month}-01`, 20_000), expense("x2", previous, 10_000)] }),
  );
  await page.goto("/#finance");
  await expect(page.locator(".compare-row", { hasText: "Expense" })).toContainText("+100%");
});
