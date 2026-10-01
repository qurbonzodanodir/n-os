import type { FormEvent } from "react";
import type { ComparisonRow } from "./LegacyReviewPanel";

interface SeriesItem {
  label: string;
  incomeHeight: number;
  expenseHeight: number;
}
interface CategoryItem {
  name: string;
  width: number;
  value: string;
}
interface AccountItem {
  id: string;
  title: string;
  currency: string;
  balance: string;
}
interface TransactionItem {
  id: string;
  title: string;
  subtitle: string;
  kind: string;
  amount: string;
}
interface BudgetItem {
  id: string;
  title: string;
  category: string;
  spent: string;
  amount: string;
  remaining: string;
  percent: number;
}

interface ForecastView {
  month: string;
  spent: string;
  projected: string;
  dailyAverage: string;
  budget: string | null;
  overBudget: string | null;
  reliable: boolean;
  closed: boolean;
  progress: number;
}

interface RecurringItem {
  id: string;
  title: string;
  amount: string;
  kind: string;
  meta: string;
}
interface RecurringValues {
  title: string;
  kind: string;
  amount: string;
  accountId: string;
  category: string;
  repeat: string;
  start: string;
}

interface Props {
  range: string;
  month: string;
  currency: string;
  balance: string;
  income: string;
  expense: string;
  rangeLabel: string;
  series: SeriesItem[];
  categories: CategoryItem[];
  accounts: AccountItem[];
  transactions: TransactionItem[];
  budgets: BudgetItem[];
  comparison: ComparisonRow[];
  previousLabel: string;
  forecast: ForecastView | null;
  recurring: RecurringItem[];
  today: string;
  onAddRecurring: (values: RecurringValues) => void | Promise<void>;
  onDeleteRecurring: (id: string) => void | Promise<void>;
  label: (key: string) => string;
  icon: (key: string) => string;
}

export function LegacyFinancePanel(props: Props) {
  const {
    range,
    month,
    currency,
    balance,
    income,
    expense,
    rangeLabel,
    series,
    categories,
    accounts,
    transactions,
    budgets,
    comparison,
    previousLabel,
    forecast,
    recurring,
    today,
    onAddRecurring,
    onDeleteRecurring,
    label: t,
    icon,
  } = props;
  return (
    <>
      <div className="toolbar">
        <div className="segments">
          {["month", "quarter", "year"].map((value) => (
            <button type="button" className={range === value ? "active" : ""} data-action="finance-range" data-value={value} key={value}>
              <span>{t(value)}</span>
            </button>
          ))}
        </div>
        <input type="month" className="filter" id="finance-month" defaultValue={month} aria-label={t("month")} />
        <span className="spacer" />
        <AddButton type="account" label={t("account")} icon={icon} />
        <AddButton type="budget" label={t("budget")} icon={icon} />
        <button type="button" className="btn" data-action="import-csv">
          <span>{t("importCsv")}</span>
        </button>
        <button type="button" className="btn" data-action="export-csv">
          <span>{t("exportCsv")}</span>
        </button>
      </div>
      <div className="stat-grid">
        <Stat label={`${t("balance")} · ${currency}`} value={balance} />
        <Stat label={`${t("income")} · ${currency}`} value={income} />
        <Stat label={`${t("expense")} · ${currency}`} value={expense} />
      </div>
      <article className="card glass pad review-compare">
        <div className="section-title">
          <h2>{t("comparePeriods")}</h2>
          <small>
            {t("vs")} {previousLabel}
          </small>
        </div>
        <div className="compare-grid two">
          {comparison.map((row) => (
            <div className={`compare-row ${row.tone}`} key={row.key}>
              <span>{t(row.key)}</span>
              <strong>{row.current}</strong>
              <small>{row.previous}</small>
              <b aria-label={row.percent}>
                {row.trend === "up" ? "▲" : row.trend === "down" ? "▼" : "•"} {row.percent}
              </b>
            </div>
          ))}
        </div>
      </article>
      {forecast && (
        <article className="card glass pad expense-forecast">
          <div className="section-title">
            <h2>{t("expenseForecast")}</h2>
            <small>{forecast.month}</small>
          </div>
          <div className="forecast-figures">
            <div>
              <small>{t("spent")}</small>
              <strong>{forecast.spent}</strong>
            </div>
            <div>
              <small>{forecast.closed ? t("total") : t("projectedExpense")}</small>
              <strong>{forecast.projected}</strong>
            </div>
            <div>
              <small>{t("dailyAverage")}</small>
              <strong>{forecast.dailyAverage}</strong>
            </div>
          </div>
          <div className="bar" aria-hidden="true">
            <i style={{ width: `${forecast.progress}%` }} />
          </div>
          {forecast.budget && (
            <p className={`meta ${forecast.overBudget ? "forecast-warning" : ""}`}>
              {forecast.overBudget
                ? `${t("overBudget")}: ${forecast.overBudget} (${t("budget")}: ${forecast.budget})`
                : `${t("withinBudget")} (${t("budget")}: ${forecast.budget})`}
            </p>
          )}
          {!forecast.reliable && !forecast.closed && <p className="meta">{t("forecastEarly")}</p>}
        </article>
      )}
      <article className="card glass finance-analytics">
        <div className="section-title">
          <h2>{t("cashFlow")}</h2>
          <small>{rangeLabel}</small>
        </div>
        <div className="finance-bars">
          {series.map((item, index) => (
            <div className="finance-bar" key={`${item.label}-${index}`}>
              <div>
                <i className="income" style={{ height: `${item.incomeHeight}px` }} />
                <i className="expense" style={{ height: `${item.expenseHeight}px` }} />
              </div>
              <small>{item.label}</small>
            </div>
          ))}
        </div>
        <div className="chart-legend">
          <span>
            <i className="income" />
            {t("income")}
          </span>
          <span>
            <i className="expense" />
            {t("expense")}
          </span>
        </div>
        {categories.length > 0 && (
          <div className="category-list">
            {categories.map((item) => (
              <div key={item.name}>
                <span>{item.name}</span>
                <i>
                  <b style={{ width: `${item.width}%` }} />
                </i>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        )}
      </article>
      <div className="account-list">
        {accounts.map((account) => (
          <button
            type="button"
            className="card glass account-card"
            data-action="detail"
            data-type="account"
            data-id={account.id}
            key={account.id}
          >
            <small>
              {account.title} · {account.currency}
            </small>
            <strong>{account.balance}</strong>
          </button>
        ))}
      </div>
      <div className="finance-grid">
        <article className="card glass">
          <CardHead title={t("transaction")} iconName="finance" icon={icon} />
          <div className="rows">
            {transactions.map((transaction) => (
              <div className="row" key={transaction.id}>
                <button type="button" className="row-body" data-action="detail" data-type="transaction" data-id={transaction.id}>
                  <strong>{transaction.title}</strong>
                  <small>{transaction.subtitle}</small>
                </button>
                <span className={`tx-amount ${transaction.kind}`}>{transaction.amount}</span>
              </div>
            ))}
            {!transactions.length && <Empty type="transaction" label={t} icon={icon} />}
          </div>
        </article>
        <aside className="card glass">
          <CardHead title={t("budget")} iconName="goals" icon={icon} />
          <div className="rows">
            {budgets.map((budget) => (
              <div className="row" key={budget.id}>
                <button type="button" className="row-body" data-action="detail" data-type="budget" data-id={budget.id}>
                  <strong>{budget.title}</strong>
                  <small>
                    {budget.category} · {budget.spent} / {budget.amount}
                  </small>
                  <div className="bar">
                    <i style={{ width: `${budget.percent}%` }} />
                  </div>
                  <small>
                    {t("remaining")}: {budget.remaining}
                  </small>
                </button>
              </div>
            ))}
            {!budgets.length && <Empty type="budget" label={t} icon={icon} />}
          </div>
        </aside>
      </div>
      <article className="card glass pad recurring-card">
        <div className="section-title">
          <h2>{t("recurringTransactions")}</h2>
        </div>
        <div className="rows">
          {recurring.map((item) => (
            <div className="row" key={item.id}>
              <div className="row-body">
                <strong>{item.title}</strong>
                <small>{item.meta}</small>
              </div>
              <span className={`tx-amount ${item.kind}`}>{item.amount}</span>
              <button
                type="button"
                className="btn danger"
                onClick={() => void onDeleteRecurring(item.id)}
                aria-label={`${t("delete")} ${item.title}`}
              >
                ×
              </button>
            </div>
          ))}
          {!recurring.length && <p className="meta">{t("recurringHint")}</p>}
        </div>
        <form
          className="recurring-form"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const form = event.currentTarget;
            const values = Object.fromEntries(new FormData(form)) as unknown as RecurringValues;
            void onAddRecurring(values);
            form.reset();
          }}
        >
          <input name="title" placeholder={t("title")} required maxLength={80} aria-label={t("title")} />
          <select name="kind" aria-label={t("kind")} defaultValue="expense">
            <option value="expense">{t("expense")}</option>
            <option value="income">{t("income")}</option>
          </select>
          <input name="amount" inputMode="decimal" placeholder={t("amount")} required aria-label={t("amount")} />
          <select name="accountId" aria-label={t("account")} required>
            {accounts.map((account) => (
              <option value={account.id} key={account.id}>
                {account.title} · {account.currency}
              </option>
            ))}
          </select>
          <input name="category" placeholder={t("category")} maxLength={60} aria-label={t("category")} />
          <select name="repeat" aria-label={t("repeat")} defaultValue="monthly">
            <option value="monthly">{t("monthly")}</option>
            <option value="weekly">{t("weekly")}</option>
          </select>
          <input type="date" name="start" defaultValue={today} required aria-label={t("startDate")} />
          <button type="submit" className="btn primary" disabled={!accounts.length}>
            {t("add")}
          </button>
        </form>
      </article>
    </>
  );
}

export type { RecurringItem, RecurringValues };

export type { ForecastView };
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <article className="card glass stat">
      <small>{label}</small>
      <strong>{value}</strong>
    </article>
  );
}
function AddButton({ type, label, icon }: { type: string; label: string; icon: (key: string) => string }) {
  return (
    <button type="button" className="btn" data-action="add" data-value={type}>
      <Markup html={icon("plus")} />
      <span>{label}</span>
    </button>
  );
}
function CardHead({ title, iconName, icon }: { title: string; iconName: string; icon: (key: string) => string }) {
  return (
    <div className="card-head">
      <h2 className="card-title">
        <Markup html={icon(iconName)} />
        {title}
      </h2>
    </div>
  );
}
function Empty({ type, label: t, icon }: { type: string; label: (key: string) => string; icon: (key: string) => string }) {
  return (
    <div className="empty">
      <Markup html={icon(type === "transaction" ? "finance" : "goals")} />
      <strong>{t("empty")}</strong>
      <p>{t("emptyHint")}</p>
      <button type="button" className="btn" data-action="add" data-value={type}>
        <Markup html={icon("plus")} />
        <span>{t("add")}</span>
      </button>
    </div>
  );
}
function Markup({ html }: { html: string }) {
  return <span className="legacy-markup" dangerouslySetInnerHTML={{ __html: html }} />;
}
