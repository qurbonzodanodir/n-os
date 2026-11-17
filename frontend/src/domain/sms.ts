import { parseAmount } from "./csv";

/** A forwarded message as returned by `GET /api/v1/sms`. */
export interface SmsMessage {
  id: string;
  source: "sms" | "push";
  sender: string;
  body: string;
  received_at: string;
  status: "new" | "imported" | "dismissed";
  created_at: string;
}

export interface ParsedSms {
  kind: "income" | "expense";
  /** Positive minor units, or null when no amount could be found. */
  amount: number | null;
  /** ISO currency code when the message names one. */
  currency: string | null;
  /** Local calendar date in the workspace timezone. */
  date: string;
  title: string;
}

const currencies: Array<[RegExp, string]> = [
  [/^(tjs|smn|сомон[иӣий]?|somoni|сом)$/i, "TJS"],
  [/^(usd|\$|долл\.?|доллар(ов)?)$/i, "USD"],
  [/^(eur|€|евро)$/i, "EUR"],
  [/^(rub|₽|руб\.?|рубл(ей|я|ь)?)$/i, "RUB"],
  [/^(uzs|сум|so'm|som)$/i, "UZS"],
  [/^(kzt|₸|тенге)$/i, "KZT"],
  [/^(cny|¥|юан(ей|ь|я)?)$/i, "CNY"],
];
const CURRENCY =
  "TJS|SMN|сомон[иӣий]?|somoni|сом|USD|\\$|долл\\.?|доллар(?:ов)?|EUR|€|евро|RUB|₽|руб\\.?|рубл(?:ей|я|ь)?|UZS|сум|so'm|som|KZT|₸|тенге|CNY|¥|юан(?:ей|ь|я)?";
// Grouped thousands ("1 234,56", "1,234.56") before plain numbers ("125.50").
const NUMBER = "\\d{1,3}(?:[ \\u00a0]\\d{3})+(?:[.,]\\d{1,2})?|\\d{1,3}(?:[.,]\\d{3})+(?:[.,]\\d{1,2})?|\\d+(?:[.,]\\d{1,2})?";
// \b does not understand Cyrillic, so letter boundaries are explicit.
const before = "(?<![\\p{L}\\d.,])";
const after = "(?![\\p{L}\\d])";
const amountPatterns = [
  new RegExp(`${before}([+\\-−]?)\\s?(${NUMBER})\\s?(${CURRENCY})${after}`, "giu"),
  new RegExp(`${before}(${CURRENCY})\\s?([+\\-−]?)(${NUMBER})${after}`, "giu"),
  new RegExp(`(?:сумма|summa|amount|маблағ)[:\\s]+([+\\-−]?)(${NUMBER})${after}`, "giu"),
];
const balanceBefore =
  /(баланс|остаток|доступно|дост\.|balance|available|bal\.?|ost\.?|ostatok|boqimonda|боқимонда|бақия|мавҷуд)[^\d]{0,12}$/iu;

const incomeWords =
  /(зачисл|пополн|поступ|получен|возврат|входящ|credited|credit|received|deposit|refund|incoming|zachisl|popoln|postup|vozvrat|ворид|қабул|воридот)/iu;
const expenseWords =
  /(списан|оплат|покупк|снят|перевод с|исходящ|debit|purchase|payment|paid|withdraw|spisan|oplat|pokupk|харид|пардохт|xarid|pardoxt|бардошт)/iu;

interface Candidate {
  sign: string;
  number: string;
  currency: string | null;
  index: number;
}

function candidates(text: string): Candidate[] {
  const found: Candidate[] = [];
  for (const [patternIndex, pattern] of amountPatterns.entries()) {
    for (const match of text.matchAll(pattern)) {
      const [sign, number, currency] =
        patternIndex === 0
          ? [match[1], match[2], match[3]]
          : patternIndex === 1
            ? [match[2], match[3], match[1]]
            : [match[1], match[2], null];
      found.push({ sign, number, currency, index: match.index ?? 0 });
    }
    // Fall back to the keyword pattern only when no currency-tagged amount exists.
    if (patternIndex === 1 && found.length) break;
  }
  return found.sort((a, b) => a.index - b.index);
}

function currencyCode(token: string | null): string | null {
  if (!token) return null;
  return currencies.find(([pattern]) => pattern.test(token.trim()))?.[1] ?? null;
}

/** The server stores UTC; SQLite drops the offset, so a bare timestamp is read as UTC. */
export function localDate(timestamp: string, timezone: string): string {
  const withZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(timestamp) ? timestamp : `${timestamp}Z`;
  const date = new Date(withZone);
  const safe = Number.isNaN(date.getTime()) ? new Date() : date;
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(safe);
}

/** Best-effort reading of a bank SMS. Every field stays editable before import. */
export function parseSms(message: Pick<SmsMessage, "sender" | "body" | "received_at">, timezone: string): ParsedSms {
  const text = message.body.replace(/\s+/g, " ");
  const transaction = candidates(text).find(
    (candidate) => !balanceBefore.test(text.slice(Math.max(0, candidate.index - 30), candidate.index)),
  );
  const amount = transaction ? parseAmount(transaction.number) : null;

  let kind: ParsedSms["kind"] = "expense";
  if (transaction?.sign === "+") kind = "income";
  else if (transaction?.sign !== "-" && transaction?.sign !== "−") {
    const income = text.search(incomeWords);
    const expense = text.search(expenseWords);
    // The word that appears first describes the operation ("Возврат по оплате" is income).
    if (income >= 0 && (expense < 0 || income < expense)) kind = "income";
  }

  return {
    kind,
    amount: amount && amount > 0 ? amount : null,
    currency: currencyCode(transaction?.currency ?? null),
    date: localDate(message.received_at, timezone),
    title: message.sender.slice(0, 80),
  };
}

/** Prefers an account in the message's currency, then the first account. */
export function suggestAccount<T extends { id: string; currency: string }>(accounts: T[], currency: string | null): string {
  return (currency && accounts.find((account) => account.currency === currency)?.id) || accounts[0]?.id || "";
}
