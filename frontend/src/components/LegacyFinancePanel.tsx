interface SeriesItem { label: string; incomeHeight: number; expenseHeight: number }
interface CategoryItem { name: string; width: number; value: string }
interface AccountItem { id: string; title: string; currency: string; balance: string }
interface TransactionItem { id: string; title: string; subtitle: string; kind: string; amount: string }
interface BudgetItem { id: string; title: string; category: string; spent: string; amount: string; remaining: string; percent: number }

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
  label: (key: string) => string;
  icon: (key: string) => string;
}

export function LegacyFinancePanel(props: Props) {
  const { range, month, currency, balance, income, expense, rangeLabel, series, categories, accounts, transactions, budgets, label: t, icon } = props;
  return <>
    <div className="toolbar"><div className="segments">{["month", "quarter", "year"].map((value) => <button type="button" className={range === value ? "active" : ""} data-action="finance-range" data-value={value} key={value}><span>{t(value)}</span></button>)}</div><input type="month" className="filter" id="finance-month" defaultValue={month} aria-label={t("month")} /><span className="spacer" /><AddButton type="account" label={t("account")} icon={icon} /><AddButton type="budget" label={t("budget")} icon={icon} /></div>
    <div className="stat-grid"><Stat label={`${t("balance")} · ${currency}`} value={balance} /><Stat label={`${t("income")} · ${currency}`} value={income} /><Stat label={`${t("expense")} · ${currency}`} value={expense} /></div>
    <article className="card glass finance-analytics"><div className="section-title"><h2>{t("cashFlow")}</h2><small>{rangeLabel}</small></div><div className="finance-bars">{series.map((item, index) => <div className="finance-bar" key={`${item.label}-${index}`}><div><i className="income" style={{ height: `${item.incomeHeight}px` }} /><i className="expense" style={{ height: `${item.expenseHeight}px` }} /></div><small>{item.label}</small></div>)}</div><div className="chart-legend"><span><i className="income" />{t("income")}</span><span><i className="expense" />{t("expense")}</span></div>{categories.length > 0 && <div className="category-list">{categories.map((item) => <div key={item.name}><span>{item.name}</span><i><b style={{ width: `${item.width}%` }} /></i><strong>{item.value}</strong></div>)}</div>}</article>
    <div className="account-list">{accounts.map((account) => <button type="button" className="card glass account-card" data-action="detail" data-type="account" data-id={account.id} key={account.id}><small>{account.title} · {account.currency}</small><strong>{account.balance}</strong></button>)}</div>
    <div className="finance-grid"><article className="card glass"><CardHead title={t("transaction")} iconName="finance" icon={icon} /><div className="rows">{transactions.map((transaction) => <div className="row" key={transaction.id}><button type="button" className="row-body" data-action="detail" data-type="transaction" data-id={transaction.id}><strong>{transaction.title}</strong><small>{transaction.subtitle}</small></button><span className={`tx-amount ${transaction.kind}`}>{transaction.amount}</span></div>)}{!transactions.length && <Empty type="transaction" label={t} icon={icon} />}</div></article>
      <aside className="card glass"><CardHead title={t("budget")} iconName="goals" icon={icon} /><div className="rows">{budgets.map((budget) => <div className="row" key={budget.id}><button type="button" className="row-body" data-action="detail" data-type="budget" data-id={budget.id}><strong>{budget.title}</strong><small>{budget.category} · {budget.spent} / {budget.amount}</small><div className="bar"><i style={{ width: `${budget.percent}%` }} /></div><small>{t("remaining")}: {budget.remaining}</small></button></div>)}{!budgets.length && <Empty type="budget" label={t} icon={icon} />}</div></aside>
    </div>
  </>;
}

function Stat({ label, value }: { label: string; value: string }) { return <article className="card glass stat"><small>{label}</small><strong>{value}</strong></article>; }
function AddButton({ type, label, icon }: { type: string; label: string; icon: (key: string) => string }) { return <button type="button" className="btn" data-action="add" data-value={type}><Markup html={icon("plus")} /><span>{label}</span></button>; }
function CardHead({ title, iconName, icon }: { title: string; iconName: string; icon: (key: string) => string }) { return <div className="card-head"><h2 className="card-title"><Markup html={icon(iconName)} />{title}</h2></div>; }
function Empty({ type, label: t, icon }: { type: string; label: (key: string) => string; icon: (key: string) => string }) { return <div className="empty"><Markup html={icon(type === "transaction" ? "finance" : "goals")} /><strong>{t("empty")}</strong><p>{t("emptyHint")}</p><button type="button" className="btn" data-action="add" data-value={type}><Markup html={icon("plus")} /><span>{t("add")}</span></button></div>; }
function Markup({ html }: { html: string }) { return <span className="legacy-markup" dangerouslySetInnerHTML={{ __html: html }} />; }
