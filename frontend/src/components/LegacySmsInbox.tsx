import { useEffect, useState } from "react";
import { smsApi } from "../api";
import { parseAmount } from "../domain/csv";
import { parseSms, suggestAccount, type SmsMessage } from "../domain/sms";

interface AccountOption {
  id: string;
  title: string;
  currency: string;
}

/** What the workspace receives: a signed amount in minor units, like a bank CSV row. */
export interface SmsTransactionDraft {
  accountId: string;
  date: string;
  amount: number;
  title: string;
}

interface Props {
  accounts: AccountOption[];
  timezone: string;
  isDuplicate: (draft: SmsTransactionDraft) => boolean;
  /** Saves the transaction; resolves false when the workspace save failed. */
  onImport: (draft: SmsTransactionDraft) => Promise<boolean>;
  label: (key: string) => string;
  formatTime: (timestamp: string) => string;
}

export function LegacySmsInbox({ accounts, timezone, isDuplicate, onImport, label: t, formatTime }: Props) {
  const [messages, setMessages] = useState<SmsMessage[] | null>(null);
  const [error, setError] = useState("");

  const [reloads, setReloads] = useState(0);

  useEffect(() => {
    let current = true;
    smsApi
      .list()
      .then((rows) => {
        if (!current) return;
        setError("");
        setMessages(rows);
      })
      .catch(() => {
        if (current) setError(t("smsLoadError"));
      });
    return () => {
      current = false;
    };
  }, [t, reloads]);

  const load = () => setReloads((count) => count + 1);

  const remove = (id: string) => setMessages((rows) => rows?.filter((row) => row.id !== id) ?? null);

  return (
    <div className="sms-inbox">
      <div className="sms-inbox-head">
        <p className="meta">{t("smsInboxHint")}</p>
        <button type="button" className="btn" onClick={load}>
          <span>{t("smsRefresh")}</span>
        </button>
      </div>
      {error && <p className="form-error">{error}</p>}
      {messages === null && !error && <p className="meta">{t("loading")}</p>}
      {messages?.length === 0 && (
        <p className="meta">
          {t("smsEmpty")} {t("smsSetupHint")}
        </p>
      )}
      {messages?.map((message) => (
        <SmsRow
          key={message.id}
          message={message}
          accounts={accounts}
          timezone={timezone}
          isDuplicate={isDuplicate}
          onImport={onImport}
          onDone={() => remove(message.id)}
          label={t}
          formatTime={formatTime}
        />
      ))}
    </div>
  );
}

interface RowProps extends Omit<Props, "label"> {
  message: SmsMessage;
  onDone: () => void;
  label: (key: string) => string;
}

function SmsRow({ message, accounts, timezone, isDuplicate, onImport, onDone, label: t, formatTime }: RowProps) {
  const [parsed] = useState(() => parseSms(message, timezone));
  const [kind, setKind] = useState(parsed.kind);
  const [amountText, setAmountText] = useState(parsed.amount ? (parsed.amount / 100).toFixed(2) : "");
  const [title, setTitle] = useState(parsed.title);
  const [date, setDate] = useState(parsed.date);
  const [accountId, setAccountId] = useState(() => suggestAccount(accounts, parsed.currency));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const amount = parseAmount(amountText);
  const valid = amount !== null && amount > 0 && !!accountId && !!title.trim() && /^\d{4}-\d{2}-\d{2}$/.test(date);
  const draft: SmsTransactionDraft | null = valid
    ? { accountId, date, title: title.trim(), amount: kind === "expense" ? -amount : amount }
    : null;
  const duplicate = draft ? isDuplicate(draft) : false;
  const prefix = `sms-${message.id}`;

  const finish = async (status: "imported" | "dismissed") => {
    setBusy(true);
    setError("");
    try {
      if (status === "imported") {
        if (!draft) throw new Error("amountError");
        if (!(await onImport(draft))) throw new Error("saveError");
      }
      await smsApi.setStatus(message.id, status);
      onDone();
    } catch (failure) {
      const key = failure instanceof Error && ["amountError", "saveError"].includes(failure.message) ? failure.message : "smsUpdateError";
      setError(t(key));
      setBusy(false);
    }
  };

  return (
    <article className="sms-row card glass pad" aria-labelledby={`${prefix}-sender`}>
      <header className="sms-row-head">
        <strong id={`${prefix}-sender`}>{message.sender}</strong>
        <span className="meta">{formatTime(message.received_at)}</span>
      </header>
      <p className="sms-body">{message.body}</p>
      {parsed.amount === null && <p className="meta">{t("smsNoAmount")}</p>}
      <div className="sms-fields">
        <div className="segments" role="group" aria-label={t("kind")}>
          {(["expense", "income"] as const).map((value) => (
            <button
              type="button"
              key={value}
              className={kind === value ? "active" : ""}
              aria-pressed={kind === value}
              onClick={() => setKind(value)}
            >
              <span>{t(value)}</span>
            </button>
          ))}
        </div>
        <div className="field">
          <label htmlFor={`${prefix}-amount`}>{t("amount")}</label>
          <input id={`${prefix}-amount`} inputMode="decimal" value={amountText} onChange={(event) => setAmountText(event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor={`${prefix}-title`}>{t("title")}</label>
          <input id={`${prefix}-title`} value={title} maxLength={80} onChange={(event) => setTitle(event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor={`${prefix}-date`}>{t("date")}</label>
          <input id={`${prefix}-date`} type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor={`${prefix}-account`}>{t("account")}</label>
          <select id={`${prefix}-account`} value={accountId} onChange={(event) => setAccountId(event.target.value)}>
            {accounts.map((account) => (
              <option value={account.id} key={account.id}>
                {account.title} · {account.currency}
              </option>
            ))}
          </select>
        </div>
      </div>
      {duplicate && <p className="meta">{t("smsDuplicate")}</p>}
      {error && <p className="form-error">{error}</p>}
      <div className="form-footer">
        <button type="button" className="btn" disabled={busy} onClick={() => void finish("dismissed")}>
          <span>{t("smsDismiss")}</span>
        </button>
        <button type="button" className="btn primary" disabled={busy || !draft} onClick={() => void finish("imported")}>
          <span>{t(duplicate ? "smsMarkDone" : "add")}</span>
        </button>
      </div>
    </article>
  );
}
