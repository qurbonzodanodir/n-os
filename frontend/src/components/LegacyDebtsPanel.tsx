import { useState, type FormEvent } from "react";

interface Summary {
  currency: string;
  receivable: string;
  payable: string;
  net: string;
  netTone: string;
}
interface Payment {
  id: string;
  amount: string;
  date: string;
  note?: string;
}
interface DebtCard {
  id: string;
  title: string;
  direction: string;
  amount: string;
  paid: string;
  remaining: string;
  remainingMinor: number;
  currency: string;
  dueLabel: string;
  overdue: boolean;
  settled: boolean;
  progress: number;
  note?: string;
  payments: Payment[];
}
interface Props {
  filter: string;
  summaries: Summary[];
  debts: DebtCard[];
  today: string;
  onPayment: (debtId: string, values: { amount: string; date: string; note: string }) => void | Promise<void>;
  onDeletePayment: (debtId: string, paymentId: string) => void | Promise<void>;
  label: (key: string) => string;
}

export function LegacyDebtsPanel({ filter, summaries, debts, today, onPayment, onDeletePayment, label: t }: Props) {
  const [paying, setPaying] = useState<string | null>(null);
  return (
    <>
      <div className="toolbar">
        <div className="segments">
          {["all", "owed_to_me", "i_owe", "overdue", "settled"].map((value) => (
            <button type="button" className={filter === value ? "active" : ""} data-action="debt-filter" data-value={value} key={value}>
              {t(value)}
            </button>
          ))}
        </div>
        <span className="spacer" />
      </div>
      {summaries.length > 0 && (
        <div className="debt-summary-grid">
          {summaries.map((item) => (
            <article className="card glass debt-summary" key={item.currency}>
              <header>
                <strong>{item.currency}</strong>
                <small>{t("debtBalance")}</small>
              </header>
              <div>
                <span>{t("owedToMe")}</span>
                <b className="income">+{item.receivable}</b>
              </div>
              <div>
                <span>{t("iOwe")}</span>
                <b className="expense">−{item.payable}</b>
              </div>
              <footer>
                <span>{t("net")}</span>
                <strong className={item.netTone}>{item.net}</strong>
              </footer>
            </article>
          ))}
        </div>
      )}
      <div className="debt-grid">
        {debts.map((debt) => (
          <article className={`card glass debt-card ${debt.overdue ? "overdue-debt" : ""} ${debt.settled ? "settled" : ""}`} key={debt.id}>
            <header>
              <div>
                <span className={`debt-direction ${debt.direction}`}>{t(debt.direction)}</span>
                <h2>{debt.title}</h2>
              </div>
              <button
                type="button"
                className="btn icon-btn"
                data-action="edit-item"
                data-value={`debt:${debt.id}`}
                aria-label={`${t("edit")} ${debt.title}`}
              >
                ✎
              </button>
            </header>
            <div className="debt-amount">
              <small>{t("remaining")}</small>
              <strong>{debt.remaining}</strong>
              <span>
                {t("of")} {debt.amount}
              </span>
            </div>
            <div className="bar">
              <i style={{ width: `${debt.progress}%` }} />
            </div>
            <div className="debt-meta">
              <span>
                {t("paid")}: <b>{debt.paid}</b>
              </span>
              <span className={debt.overdue ? "overdue" : ""}>
                {t("dueDate")}: <b>{debt.dueLabel}</b>
              </span>
            </div>
            {debt.note && <p className="debt-note">{debt.note}</p>}
            {debt.payments.length > 0 && (
              <section className="debt-history">
                <h3>{t("paymentHistory")}</h3>
                {debt.payments.map((payment) => (
                  <div className="debt-payment" key={payment.id}>
                    <span>
                      <strong>{payment.amount}</strong>
                      <small>
                        {payment.date}
                        {payment.note ? ` · ${payment.note}` : ""}
                      </small>
                    </span>
                    <button type="button" onClick={() => void onDeletePayment(debt.id, payment.id)} aria-label={t("deletePayment")}>
                      ×
                    </button>
                  </div>
                ))}
              </section>
            )}
            {!debt.settled &&
              (paying === debt.id ? (
                <PaymentForm debt={debt} today={today} label={t} onCancel={() => setPaying(null)} onPayment={onPayment} />
              ) : (
                <button type="button" className="btn debt-pay" onClick={() => setPaying(debt.id)}>
                  {t("addPayment")}
                </button>
              ))}
            {debt.settled && <div className="debt-settled">✓ {t("debtSettled")}</div>}
          </article>
        ))}
        {!debts.length && (
          <div className="empty card glass">
            <strong>{t("noDebts")}</strong>
            <p>{t("noDebtsHint")}</p>
            <button type="button" className="btn" data-action="add" data-value="debt">
              {t("addDebt")}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function PaymentForm({
  debt,
  today,
  label: t,
  onCancel,
  onPayment,
}: {
  debt: DebtCard;
  today: string;
  label: (key: string) => string;
  onCancel: () => void;
  onPayment: Props["onPayment"];
}) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    void onPayment(debt.id, {
      amount: String(values.get("amount") || ""),
      date: String(values.get("date") || today),
      note: String(values.get("note") || "").trim(),
    });
  };
  return (
    <form className="debt-payment-form" onSubmit={submit}>
      <input name="amount" inputMode="decimal" placeholder={t("amount")} required />
      <input name="date" type="date" defaultValue={today} required />
      <input name="note" placeholder={t("paymentNote")} maxLength={120} />
      <div>
        <button type="button" className="btn" onClick={onCancel}>
          {t("cancel")}
        </button>
        <button type="submit" className="btn primary">
          {t("save")}
        </button>
      </div>
    </form>
  );
}

export type { DebtCard, Summary };
