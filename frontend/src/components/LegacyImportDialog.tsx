import { useState } from "react";
import { parseBankCsv, type BankImport, type BankRow } from "../domain/csv";

interface AccountOption {
  id: string;
  title: string;
  currency: string;
}
interface Props {
  accounts: AccountOption[];
  plan: (accountId: string, rows: BankRow[]) => { fresh: number; duplicates: number };
  onConfirm: (accountId: string, rows: BankRow[]) => void | Promise<void>;
  label: (key: string) => string;
  formatMoney: (minor: number, currency?: string) => string;
}

const MAX_FILE_BYTES = 1_000_000;

export function LegacyImportDialog({ accounts, plan, onConfirm, label: t, formatMoney }: Props) {
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [result, setResult] = useState<BankImport | null>(null);
  const [error, setError] = useState("");
  const currency = accounts.find((account) => account.id === accountId)?.currency;
  const summary = result?.recognised && accountId ? plan(accountId, result.rows) : null;

  return (
    <div className="import-dialog">
      <div className="field">
        <label htmlFor="import-account">{t("account")}</label>
        <select id="import-account" value={accountId} onChange={(event) => setAccountId(event.target.value)}>
          {accounts.map((account) => (
            <option value={account.id} key={account.id}>
              {account.title} · {account.currency}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="import-file">{t("csvFile")}</label>
        <input
          id="import-file"
          type="file"
          accept=".csv,text/csv,text/plain"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            setError("");
            setResult(null);
            if (!file) return;
            if (file.size > MAX_FILE_BYTES) return setError(t("fileTooLarge"));
            setResult(parseBankCsv(await file.text()));
          }}
        />
      </div>
      <p className="meta">{t("importHint")}</p>
      {error && <p className="form-error">{error}</p>}
      {result && !result.recognised && <p className="form-error">{t("importUnrecognised")}</p>}
      {result?.recognised && summary && (
        <>
          <p>
            <strong>{summary.fresh}</strong> {t("importNew")} · {summary.duplicates} {t("importDuplicates")} · {result.skipped}{" "}
            {t("importSkipped")}
          </p>
          <div className="rows import-preview">
            {result.rows.slice(0, 5).map((row, index) => (
              <div className="row" key={`${row.date}-${index}`}>
                <div className="row-body">
                  <strong>{row.title}</strong>
                  <small>{row.date}</small>
                </div>
                <span className={`tx-amount ${row.amount < 0 ? "expense" : "income"}`}>{formatMoney(row.amount, currency)}</span>
              </div>
            ))}
          </div>
          <div className="form-footer">
            <button type="button" className="btn primary" disabled={!summary.fresh} onClick={() => void onConfirm(accountId, result.rows)}>
              {t("importRows")} ({summary.fresh})
            </button>
          </div>
        </>
      )}
    </div>
  );
}
