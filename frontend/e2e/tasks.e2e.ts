import { expect, test } from "@playwright/test";
import { seed, stored, task, today, workspace } from "./helpers";

test("creates a task through the add dialog and persists it", async ({ page, request }) => {
  await seed(request, workspace());
  await page.goto("/#tasks");
  await page.locator('button[data-action="quick"]').first().click();
  await page.locator('dialog [data-action="add"][data-value="task"]').click();
  await page.locator('#item-form input[name="title"]').fill("Buy milk");
  await page.locator('#item-form button[type="submit"]').click();
  await expect(page.getByText("Buy milk")).toBeVisible();
  await expect.poll(async () => (await stored(request)).tasks.map((row: { title: string }) => row.title)).toContain("Buy milk");
});

test("quick edit changes a task without opening the dialog", async ({ page, request }) => {
  await seed(request, workspace({ tasks: [task("t1", "Write report")] }));
  await page.goto("/#tasks");
  await page.getByRole("button", { name: /Quick edit Write report/ }).click();
  await page.locator('.quick-task-editor input[name="title"]').fill("Write final report");
  await page.locator('.quick-task-editor select[name="priority"]').selectOption("urgent");
  await page.locator('.quick-task-editor button[type="submit"]').click();
  await expect(page.getByText("Write final report")).toBeVisible();
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  await expect.poll(async () => (await stored(request)).tasks[0]).toMatchObject({ title: "Write final report", priority: "urgent" });
});

test("dragging a card on the board changes its status", async ({ page, request }) => {
  await seed(request, workspace({ tasks: [task("t1", "Ship feature")] }));
  await page.goto("/#tasks");
  await page.locator('[data-action="task-mode"][data-value="board"]').click();
  const card = page.locator(".task-card", { hasText: "Ship feature" });
  await card.dragTo(page.locator(".board-col").nth(1));
  await expect(page.locator(".board-col").nth(1)).toContainText("Ship feature");
  await expect.poll(async () => (await stored(request)).tasks[0].status).toBe("progress");
});

test("filters, sorting and saved views survive a reload", async ({ page, request }) => {
  await seed(
    request,
    workspace({
      tasks: [
        task("a", "Alpha", { priority: "high" }),
        task("b", "Bravo", { priority: "low" }),
        task("c", "Charlie", { priority: "high", date: today() }),
      ],
    }),
  );
  await page.goto("/#tasks");
  await page.locator("#task-priority-filter").selectOption("high");
  await page.locator("#task-sort").selectOption("title");
  await expect(page.getByText("Bravo")).toHaveCount(0);
  await page.getByRole("button", { name: "Save view" }).click();
  await page.locator('.save-view-bar input[name="name"]').fill("Important");
  await page.locator('.save-view-bar button[type="submit"]').click();
  await expect
    .poll(async () => (await stored(request)).settings.taskViews?.[0])
    .toMatchObject({ name: "Important", priorityFilter: "high", sort: "title" });

  await page.reload();
  await page.locator("#task-saved-view").selectOption({ label: "Important" });
  await expect(page.locator("#task-priority-filter")).toHaveValue("high");
  await expect(page.locator("#task-sort")).toHaveValue("title");
  await expect(page.getByText("Bravo")).toHaveCount(0);
  await expect(page.getByText("Alpha")).toBeVisible();
});
