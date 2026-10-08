import { expect, test } from "@playwright/test";
import { seed, stored, today, workspace } from "./helpers";

test("tracks both debt directions and partial repayments", async ({ page, request }) => {
  await seed(
    request,
    workspace({
      debts: [
        {
          id: "receivable",
          title: "Aziz",
          direction: "owed_to_me",
          amount: 10_000,
          currency: "TJS",
          dueDate: today(),
          payments: [{ id: "first", amount: 2_500, date: today(), note: "Cash" }],
        },
        {
          id: "payable",
          title: "Bank",
          direction: "i_owe",
          amount: 4_000,
          currency: "TJS",
          payments: [],
        },
      ],
    }),
  );

  await page.goto("/#debts");
  await expect(page.getByRole("heading", { name: "Debts" })).toBeVisible();
  await expect(page.locator(".debt-card", { hasText: "Aziz" })).toContainText("TJS 75.00");
  await expect(page.locator(".debt-card", { hasText: "Bank" })).toContainText("I owe");

  const card = page.locator(".debt-card", { hasText: "Aziz" });
  await card.getByRole("button", { name: "Add payment" }).click();
  await card.locator('input[name="amount"]').fill("25");
  await card.locator('input[name="note"]').fill("Transfer");
  await card.getByRole("button", { name: "Save" }).click();

  await expect(card).toContainText("TJS 50.00");
  await expect.poll(async () => (await stored(request)).debts[0].payments.length).toBe(2);

  await page.locator('[data-action="debt-filter"][data-value="i_owe"]').click();
  await expect(page.locator(".debt-card", { hasText: "Bank" })).toBeVisible();
  await expect(page.locator(".debt-card", { hasText: "Aziz" })).toHaveCount(0);
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test("the debts action creates a debt instead of opening the generic picker", async ({ page, request }) => {
    await seed(request, workspace());
    await page.goto("/#debts");
    const fab = page.locator(".mobile-fab");
    await expect(fab).toHaveAttribute("data-action", "add");
    await expect(fab).toHaveAttribute("data-value", "debt");
    await fab.click();
    await expect(page.locator('#item-form select[name="direction"]')).toBeVisible();
  });
});
