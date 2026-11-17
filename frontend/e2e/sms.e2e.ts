import { expect, test } from "@playwright/test";
import { seed, stored, workspace } from "./helpers";

test("a forwarded bank SMS becomes a transaction after review", async ({ page, request }) => {
  await seed(request, workspace({ accounts: [{ id: "card", title: "Alif card", opening: 0, currency: "TJS" }] }));

  // Connect the phone from Settings; the token is shown once.
  await page.goto("/#settings");
  const setup = page.locator(".sms-setup");
  const connect = setup.getByRole("button", { name: "Connect phone" });
  const replace = setup.getByRole("button", { name: "Replace token" });
  await expect(connect.or(replace)).toBeVisible();
  if (await replace.isVisible()) {
    await replace.click();
    await setup.getByRole("button", { name: "Replace token" }).click();
  } else await connect.click();
  await expect(setup).toContainText("Phone connected");
  const header = (await setup.locator("code", { hasText: "Authorization: Bearer" }).textContent()) ?? "";
  const token = header.replace("Authorization: Bearer ", "").trim();
  expect(token.length).toBeGreaterThan(20);
  await expect(setup.locator("code", { hasText: "/api/v1/sms/ingest" })).toBeVisible();

  // The phone forwarder posts two messages.
  const auth = { Authorization: `Bearer ${token}` };
  const purchase = await request.post("/api/v1/sms/ingest", {
    headers: auth,
    data: { from: "AlifBank", text: "Pokupka 125.50 TJS, karta *1234, Korvon. Balans 900.00 TJS", sentStamp: "%sentStamp%" },
  });
  expect(purchase.status()).toBe(201);
  const code = await request.post("/api/v1/sms/ingest", { headers: auth, data: { from: "AlifBank", text: "Kod 4821" } });
  expect(code.status()).toBe(201);

  await page.goto("/#finance");
  await page.locator('[data-action="sms-inbox"]').click();
  const dialog = page.locator("dialog");
  const purchaseRow = dialog.locator(".sms-row", { hasText: "Pokupka" });
  const codeRow = dialog.locator(".sms-row", { hasText: "Kod 4821" });
  await expect(purchaseRow).toBeVisible();
  await expect(purchaseRow.getByLabel("Amount")).toHaveValue("125.50");
  await expect(purchaseRow.getByLabel("Title")).toHaveValue("AlifBank");
  await expect(codeRow).toContainText("Amount not recognised");
  await expect(codeRow.getByRole("button", { name: "Add new" })).toBeDisabled();

  await purchaseRow.getByLabel("Title").fill("Korvon");
  await purchaseRow.getByRole("button", { name: "Add new" }).click();
  await expect(purchaseRow).toHaveCount(0);
  await expect
    .poll(async () => (await stored(request)).transactions)
    .toEqual([expect.objectContaining({ kind: "expense", amount: 12_550, title: "Korvon", accountId: "card" })]);

  await codeRow.getByRole("button", { name: "Hide" }).click();
  await expect(dialog).toContainText("No new messages.");
  expect(await (await request.get("/api/v1/sms", { headers: { "X-User-Id": "local-owner" } })).json()).toEqual([]);
  expect((await stored(request)).transactions).toHaveLength(1);
});
