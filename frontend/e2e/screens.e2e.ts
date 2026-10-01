import { test } from "@playwright/test";
import { addDays, seed, task, today, workspace } from "./helpers";

const OUT = process.env.SHOTS ?? "";
const views = ["today", "tasks", "calendar", "habits", "notes", "goals", "projects", "finance", "review", "settings"];

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 2, colorScheme: "dark" });

// Opt-in visual review helper: SHOTS=/some/dir npx playwright test screens
test("capture mobile screens", async ({ page, request }) => {
  test.skip(!process.env.SHOTS, "set SHOTS to a directory to capture screenshots");
  const d = today();
  await seed(
    request,
    workspace(
      {
        tasks: [
          task("t1", "Подготовить отчёт для клиента по проекту", { priority: "high", projectId: "p1", date: d }),
          task("t2", "Позвонить Али", { priority: "urgent", date: addDays(d, -2) }),
          task("t3", "Купить продукты", { status: "progress", date: addDays(d, 1) }),
          task("t4", "Закончено", { status: "completed", completedAt: d }),
        ],
        events: [{ id: "e1", title: "Встреча команды", date: d, time: "10:00", endTime: "11:00", repeat: "none" }],
        habits: [{ id: "h1", title: "Читать 20 минут", completions: [d], goal: "20 мин" }],
        notes: [
          {
            id: "n1",
            title: "Идеи по продукту",
            body: "Список идей и заметок для следующего спринта.\n- первое\n- второе",
            tags: "работа,идеи",
            folder: "Работа",
            pinned: true,
            createdAt: d,
            updatedAt: d,
          },
        ],
        goals: [
          {
            id: "g1",
            title: "Запустить сайт",
            milestones: [
              { title: "Дизайн", done: true },
              { title: "Релиз", done: false },
            ],
          },
        ],
        projects: [{ id: "p1", title: "Сайт компании", goalId: "g1" }],
        accounts: [{ id: "a1", title: "Наличные", opening: 100000, currency: "TJS" }],
        transactions: [{ id: "x1", kind: "expense", amount: 25000, date: d, category: "Еда", title: "Обед", accountId: "a1" }],
        budgets: [{ id: "b1", title: "Еда", category: "Еда", amount: 100000, monthKey: d.slice(0, 7), currency: "TJS" }],
      },
      { language: "ru", currency: "TJS", theme: "dark" },
    ),
  );
  for (const view of views) {
    await page.goto(`/#${view}`);
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${OUT}/${view}.png`, fullPage: false });
  }
  await page.goto("/#tasks");
  await page.locator('[data-action="task-mode"][data-value="board"]').click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/tasks-board.png` });
});
