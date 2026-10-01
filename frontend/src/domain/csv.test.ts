import { describe, expect, it } from "vitest";
import type { Workspace } from "../types";
import { parseAmount, parseBankCsv, parseCsv, parseDate, planImport, transactionsToCsv } from "./csv";

describe("amount and date parsing", () => {
  it("understands common bank number formats", () => {
    expect(parseAmount("12.50")).toBe(1250);
    expect(parseAmount("-1 234,56")).toBe(-123456);
    expect(parseAmount("1,234.56")).toBe(123456);
    expect(parseAmount("1.234,56")).toBe(123456);
    expect(parseAmount("1,234")).toBe(123400);
    expect(parseAmount("(15.00)")).toBe(-1500);
    expect(parseAmount("300 TJS")).toBe(30000);
    expect(parseAmount("abc")).toBeNull();
    expect(parseAmount("1.2.3")).toBeNull();
  });

  it("accepts ISO and day-first dates and rejects impossible ones", () => {
    expect(parseDate("2026-03-05")).toBe("2026-03-05");
    expect(parseDate("05.03.2026")).toBe("2026-03-05");
    expect(parseDate("5/3/2026 14:00")).toBe("2026-03-05");
    expect(parseDate("31.02.2026")).toBeNull();
    expect(parseDate("yesterday")).toBeNull();
  });
});

describe("CSV parsing", () => {
  it("handles quotes, embedded separators and semicolon files", () => {
    expect(parseCsv('a,b\n"x, y","say ""hi"""\n')).toEqual([
      ["a", "b"],
      ["x, y", 'say "hi"'],
    ]);
    expect(parseCsv("дата;сумма\r\n01.02.2026;10,50\r\n")).toEqual([
      ["дата", "сумма"],
      ["01.02.2026", "10,50"],
    ]);
  });
});

describe("bank statement import", () => {
  it("reads a signed amount column", () => {
    const result = parseBankCsv("Date,Description,Amount\n2026-03-01,Coffee,-3.50\n2026-03-02,Salary,1000\nbad,row,x\n");
    expect(result.recognised).toBe(true);
    expect(result.skipped).toBe(1);
    expect(result.rows).toEqual([
      { date: "2026-03-01", amount: -350, title: "Coffee", category: undefined },
      { date: "2026-03-02", amount: 100000, title: "Salary", category: undefined },
    ]);
  });

  it("reads separate debit and credit columns in Russian", () => {
    const result = parseBankCsv("Дата;Описание;Списание;Зачисление\n01.03.2026;Такси;25,00;\n02.03.2026;Зарплата;;5 000,00\n");
    expect(result.rows.map((row) => row.amount)).toEqual([-2500, 500000]);
  });

  it("reports unrecognised files instead of guessing", () => {
    expect(parseBankCsv("foo,bar\n1,2\n")).toMatchObject({ recognised: false, rows: [] });
  });

  it("skips rows already imported for the same account", () => {
    const workspace = {
      transactions: [{ id: "old", kind: "expense", amount: 350, date: "2026-03-01", title: "Coffee", accountId: "cash" }],
    } as unknown as Workspace;
    const rows = [
      { date: "2026-03-01", amount: -350, title: "coffee" },
      { date: "2026-03-01", amount: -350, title: "coffee" },
      { date: "2026-03-02", amount: 100000, title: "Salary" },
    ];
    let n = 0;
    const plan = planImport(workspace, "cash", rows, "2026-03-05", () => `imp-${++n}`);
    expect(plan.duplicates).toBe(2);
    expect(plan.fresh).toEqual([expect.objectContaining({ id: "imp-1", kind: "income", amount: 100000, accountId: "cash" })]);
  });
});

describe("transaction export", () => {
  it("writes a spreadsheet-safe CSV with decimal amounts", () => {
    const workspace = {
      accounts: [{ id: "cash", title: "Cash", currency: "USD" }],
      transactions: [
        { id: "b", kind: "expense", amount: 1999, date: "2026-03-02", category: "Food", title: '=HYPERLINK("x")', accountId: "cash" },
        { id: "a", kind: "income", amount: 100, date: "2026-03-01", title: "Gift, small", accountId: "cash" },
      ],
    } as unknown as Workspace;
    const csv = transactionsToCsv(workspace);
    expect(csv.startsWith('\uFEFFdate,type,amount,currency,account,category,title\r\n2026-03-01,income,1.00,USD,Cash,,"Gift, small"')).toBe(
      true,
    );
    expect(csv).toContain('"\'=HYPERLINK(""x"")"');
  });
});
