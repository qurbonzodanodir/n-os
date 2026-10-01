import type { Transaction, Workspace } from "../types";

const BOM = "\uFEFF";

/** Cells that start like a formula are prefixed so spreadsheets show them as text. */
function cell(value: string | number | undefined): string {
  let text = value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const decimal = (minor: number) =>
  `${minor < 0 ? "-" : ""}${Math.floor(Math.abs(minor) / 100)}.${String(Math.abs(minor) % 100).padStart(2, "0")}`;

export function transactionsToCsv(workspace: Workspace): string {
  const accounts = new Map(workspace.accounts.map((account) => [account.id, account]));
  const lines = [["date", "type", "amount", "currency", "account", "category", "title"].join(",")];
  for (const item of [...workspace.transactions].sort((a, b) => a.date.localeCompare(b.date))) {
    const account = accounts.get(item.accountId);
    lines.push(
      [item.date, item.kind, decimal(item.amount), account?.currency, account?.title, item.category, item.title].map(cell).join(","),
    );
  }
  return `${BOM}${lines.join("\r\n")}\r\n`;
}

/** RFC 4180 style parser that also handles ; and tab separated bank exports. */
export function parseCsv(text: string): string[][] {
  const source = text.replace(/^\uFEFF/, "");
  const firstLine = source.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = [";", "\t", ","]
    .map((candidate) => [candidate, firstLine.split(candidate).length] as const)
    .sort((a, b) => b[1] - a[1])[0][0];
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') {
        field += '"';
        index++;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[index + 1] === "\n") index++;
      row.push(field);
      field = "";
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
    } else field += char;
  }
  row.push(field);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows.map((values) => values.map((value) => value.trim()));
}

export interface BankRow {
  date: string;
  /** Signed minor units: negative is money going out. */
  amount: number;
  title: string;
  category?: string;
}

export interface BankImport {
  rows: BankRow[];
  skipped: number;
  /** False when no date column or amount columns could be recognised. */
  recognised: boolean;
}

const columns = {
  date: /^(date|дата|booking date|posted|transaction date|дата операции|дата проводки)/i,
  amount: /^(amount|сумма|sum|value|сумма операции)$/i,
  debit: /^(debit|расход|списание|withdrawal|paid out|дебет)/i,
  credit: /^(credit|приход|зачисление|deposit|paid in|кредит)/i,
  title: /(description|описание|details|назначение|merchant|payee|получатель|narrative|memo|комментарий)/i,
  category: /^(category|категория)/i,
};

export function parseAmount(value: string): number | null {
  let text = value.replace(/[\s\u00a0]/g, "").replace(/[^\d.,()+-]/g, "");
  if (!text) return null;
  const negative = /^\(.*\)$/.test(text) || text.startsWith("-");
  text = text.replace(/[()+-]/g, "");
  const last = Math.max(text.lastIndexOf(","), text.lastIndexOf("."));
  let normalized = text;
  if (last >= 0) {
    const separator = text[last];
    const mixed = text.includes(",") && text.includes(".");
    const occurrences = text.split(separator).length - 1;
    // "1.234,56" and "1,234.56" end in a decimal mark; a lone "1,234" is a thousands mark.
    const decimal = mixed || (occurrences === 1 && text.length - last - 1 !== 3);
    if (!decimal && !/^\d{1,3}([.,]\d{3})+$/.test(text)) return null;
    normalized = decimal ? `${text.slice(0, last).replace(/[.,]/g, "")}.${text.slice(last + 1)}` : text.replace(/[.,]/g, "");
  }
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(".");
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(minor) ? (negative ? -minor : minor) : null;
}

export function parseDate(value: string): string | null {
  const text = value.trim();
  let year: number, month: number, day: number;
  let match = text.match(/^(\d{4})-(\d{2})-(\d{2})(?!\d)/);
  if (match) [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  else if ((match = text.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})(?!\d)/)))
    [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
  else return null;
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return new Date(`${iso}T12:00:00Z`).toISOString().slice(0, 10) === iso ? iso : null;
}

export function parseBankCsv(text: string): BankImport {
  const table = parseCsv(text);
  const header = table[0] ?? [];
  const find = (pattern: RegExp) => header.findIndex((name) => pattern.test(name));
  const dateAt = find(columns.date);
  const amountAt = find(columns.amount);
  const debitAt = find(columns.debit);
  const creditAt = find(columns.credit);
  const titleAt = find(columns.title);
  const categoryAt = find(columns.category);
  if (dateAt < 0 || (amountAt < 0 && debitAt < 0 && creditAt < 0))
    return { rows: [], skipped: Math.max(0, table.length - 1), recognised: false };

  const rows: BankRow[] = [];
  let skipped = 0;
  for (const values of table.slice(1)) {
    const date = parseDate(values[dateAt] ?? "");
    let amount: number | null;
    if (amountAt >= 0) amount = parseAmount(values[amountAt] ?? "");
    else {
      const out = parseAmount(values[debitAt] ?? "");
      const incoming = parseAmount(values[creditAt] ?? "");
      amount = out ? -Math.abs(out) : incoming ? Math.abs(incoming) : null;
    }
    if (!date || !amount) {
      skipped++;
      continue;
    }
    rows.push({
      date,
      amount,
      title: (values[titleAt] ?? "").slice(0, 80) || (amount < 0 ? "Expense" : "Income"),
      category: values[categoryAt] || undefined,
    });
  }
  return { rows, skipped, recognised: true };
}

const key = (accountId: string, date: string, signed: number, title: string) => `${accountId}|${date}|${signed}|${title.toLowerCase()}`;

/** Splits parsed rows into new transactions and rows that already exist (same account, date, amount and title). */
export function planImport(workspace: Workspace, accountId: string, rows: BankRow[], today: string, makeId: () => string) {
  const existing = new Set(
    workspace.transactions
      .filter((item) => item.accountId === accountId && item.kind !== "transfer")
      .map((item) => key(accountId, item.date, item.kind === "income" ? item.amount : -item.amount, item.title ?? item.category ?? "")),
  );
  const fresh: Transaction[] = [];
  let duplicates = 0;
  for (const row of rows) {
    const id = key(accountId, row.date, row.amount, row.title);
    if (existing.has(id)) {
      duplicates++;
      continue;
    }
    existing.add(id);
    fresh.push({
      id: makeId(),
      kind: row.amount < 0 ? "expense" : "income",
      amount: Math.abs(row.amount),
      date: row.date,
      title: row.title,
      category: row.category,
      accountId,
      createdAt: today,
      updatedAt: today,
    });
  }
  return { fresh, duplicates };
}
