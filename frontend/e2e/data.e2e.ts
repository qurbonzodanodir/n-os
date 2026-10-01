import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { seed, stored, today, workspace } from "./helpers";

const account = { id: "cash", title: "Cash", opening: 0, currency: "USD" };

test("imports a bank CSV, skips duplicates on a second run and can undo", async ({ page, request }) => {
  await seed(request, workspace({ accounts: [account] }));
  await page.goto("/#finance");
  const csv = "Date,Description,Amount\n2026-03-01,Coffee,-3.50\n2026-03-02,Salary,1000.00\n";

  await page.locator('[data-action="import-csv"]').click();
  await page.locator("#import-file").setInputFiles({ name: "bank.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await expect(page.locator(".import-dialog")).toContainText("2 new");
  await page.getByRole("button", { name: /^Import \(2\)/ }).click();
  await expect.poll(async () => (await stored(request)).transactions.length).toBe(2);
  expect((await stored(request)).transactions.map((row: { kind: string; amount: number }) => [row.kind, row.amount])).toEqual([
    ["expense", 350],
    ["income", 100000],
  ]);

  await page.locator('[data-action="import-csv"]').click();
  await page.locator("#import-file").setInputFiles({ name: "bank.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await expect(page.locator(".import-dialog")).toContainText("2 already exist");
  await expect(page.getByRole("button", { name: /^Import \(0\)/ })).toBeDisabled();
});

test("an unrecognised file is explained instead of imported", async ({ page, request }) => {
  await seed(request, workspace({ accounts: [account] }));
  await page.goto("/#finance");
  await page.locator('[data-action="import-csv"]').click();
  await page.locator("#import-file").setInputFiles({ name: "x.csv", mimeType: "text/csv", buffer: Buffer.from("foo,bar\n1,2\n") });
  await expect(page.locator(".import-dialog .form-error")).toContainText("Could not find date and amount columns");
});

test("exports transactions as CSV and the calendar as ICS", async ({ page, request }) => {
  await seed(
    request,
    workspace({
      accounts: [account],
      transactions: [{ id: "x", kind: "expense", amount: 1250, date: today(), category: "Food", title: "Lunch", accountId: "cash" }],
      events: [{ id: "e1", title: "Standup", date: today(), time: "09:00", endTime: "09:15", repeat: "daily" }],
    }),
  );
  await page.goto("/#finance");
  const csvDownload = page.waitForEvent("download");
  await page.locator('[data-action="export-csv"]').click();
  const csv = await readFile((await (await csvDownload).path()) as string, "utf8");
  expect(csv).toContain(`${today()},expense,12.50,USD,Cash,Food,Lunch`);

  await page.goto("/#calendar");
  const icsDownload = page.waitForEvent("download");
  await page.locator('[data-action="export-ics"]').click();
  const ics = await readFile((await (await icsDownload).path()) as string, "utf8");
  expect(ics).toContain("SUMMARY:Standup");
  expect(ics).toContain("RRULE:FREQ=DAILY");
});

test.describe("notes", () => {
  const note = (id: string, title: string, body: string, extra: Record<string, unknown> = {}) => ({
    id,
    title,
    body,
    createdAt: today(),
    updatedAt: today(),
    ...extra,
  });

  test("search ranks title matches first and highlights what matched", async ({ page, request }) => {
    await seed(
      request,
      workspace({ notes: [note("a", "Groceries", "buy a passport photo frame"), note("b", "Passport renewal", "forms and photos")] }),
    );
    await page.goto("/#notes");
    await page.locator("#note-query").fill("passport");
    await page.locator("#note-query").press("Enter");
    const cards = page.locator(".note-card");
    await expect(cards.first()).toContainText("Passport renewal");
    await expect(cards.first().locator("mark")).toHaveText("Passport");
  });

  test("[[links]] open the target note and list backlinks", async ({ page, request }) => {
    await seed(
      request,
      workspace({
        notes: [note("a", "Trip plan", "Pack with [[Packing list]] and [[Nowhere]]"), note("b", "Packing list", "Passport, charger")],
      }),
    );
    await page.goto("/#notes");
    await page.locator(".note-card", { hasText: "Trip plan" }).click();
    await expect(page.locator(".wikilink.missing")).toHaveText("Nowhere");
    await page.locator("button.wikilink", { hasText: "Packing list" }).click();
    await expect(page.locator("dialog[open]")).toContainText("Passport, charger");
    await expect(page.locator("dialog[open]")).toContainText("Mentioned in");
    await expect(page.locator("dialog[open]")).toContainText("Trip plan");
  });
});
