import { describe, expect, it } from "vitest";
import { localDate, parseSms, suggestAccount } from "./sms";

const at = "2026-11-16T10:00:00";
const read = (body: string, sender = "Bank") => parseSms({ sender, body, received_at: at }, "Asia/Dushanbe");

describe("parseSms", () => {
  it("reads a Russian card purchase", () => {
    expect(read("Покупка 125,50 TJS. Карта *1234. Korvon. Баланс: 1 500,00 TJS", "AlifBank")).toEqual({
      kind: "expense",
      amount: 12550,
      currency: "TJS",
      date: "2026-11-16",
      title: "AlifBank",
    });
  });

  it("reads transliterated and English messages", () => {
    expect(read("Pokupka 85.00 TJS, karta *1234, Korvon")).toMatchObject({ kind: "expense", amount: 8500 });
    expect(read("Card *1234: purchase USD 12.99 at AMAZON. Available 300.00 USD")).toMatchObject({
      kind: "expense",
      amount: 1299,
      currency: "USD",
    });
  });

  it("recognises income words and explicit signs", () => {
    expect(read("Зачисление 2 000 сомони на карту *1234")).toMatchObject({ kind: "income", amount: 200000, currency: "TJS" });
    expect(read("Popolnenie +50 TJS")).toMatchObject({ kind: "income", amount: 5000 });
    expect(read("Счёт *1234 -300.00 RUB")).toMatchObject({ kind: "expense", amount: 30000, currency: "RUB" });
    expect(read("Возврат по оплате 40 TJS")).toMatchObject({ kind: "income", amount: 4000 });
  });

  it("reads Tajik messages", () => {
    expect(read("Харид 32,40 сомонӣ. Корт *1234. Боқимонда 900 сомонӣ")).toMatchObject({ kind: "expense", amount: 3240, currency: "TJS" });
  });

  it("skips the balance when it comes first", () => {
    expect(read("Баланс 1 000 TJS. Списание 70 TJS")).toMatchObject({ kind: "expense", amount: 7000 });
  });

  it("handles grouped thousands", () => {
    expect(read("Оплата 1,234.56 USD")).toMatchObject({ amount: 123456 });
    expect(read("Оплата 12 345 руб.")).toMatchObject({ amount: 1234500, currency: "RUB" });
  });

  it("falls back to an amount keyword without a currency", () => {
    expect(read("Оплата услуг. Сумма: 15.00")).toMatchObject({ amount: 1500, currency: null });
  });

  it("returns no amount for codes and unrelated texts", () => {
    expect(read("Код подтверждения 4821. Никому не сообщайте")).toMatchObject({ amount: null });
    expect(read("Ваш заказ 12345 доставлен")).toMatchObject({ amount: null });
  });

  it("does not take a card number or time as the amount", () => {
    expect(read("12:45 Карта 4444 оплата 9 TJS")).toMatchObject({ amount: 900 });
  });
});

describe("localDate", () => {
  it("reads bare server timestamps as UTC and converts to the workspace timezone", () => {
    expect(localDate("2026-11-16T20:30:00", "Asia/Dushanbe")).toBe("2026-11-17");
    expect(localDate("2026-11-16T20:30:00+00:00", "UTC")).toBe("2026-11-16");
  });
});

describe("suggestAccount", () => {
  const accounts = [
    { id: "a", currency: "USD" },
    { id: "b", currency: "TJS" },
  ];
  it("prefers the message currency", () => {
    expect(suggestAccount(accounts, "TJS")).toBe("b");
    expect(suggestAccount(accounts, "EUR")).toBe("a");
    expect(suggestAccount([], null)).toBe("");
  });
});
