import { useEffect, useState } from "react";
import { smsApi } from "../api";

interface Props {
  label: (key: string) => string;
  /** Defaults to the current origin; injectable for tests. */
  origin?: string;
}

/** Placeholders used by the open-source "SMS Forwarder" Android app; other forwarders use similar ones. */
export const FORWARDER_BODY = '{"from":"%from%","text":"%text%","sentStamp":"%sentStamp%"}';

type Pending = "rotate" | "revoke" | null;

export function LegacySmsSetup({ label: t, origin }: Props) {
  const [exists, setExists] = useState<boolean | null>(null);
  const [token, setToken] = useState("");
  const [pending, setPending] = useState<Pending>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const endpoint = `${origin ?? (typeof location === "undefined" ? "" : location.origin)}/api/v1/sms/ingest`;

  useEffect(() => {
    smsApi
      .tokenState()
      .then((state) => setExists(state.exists))
      .catch(() => setError(t("smsLoadError")));
  }, [t]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await action();
      setPending(null);
    } catch {
      setError(t("smsUpdateError"));
    } finally {
      setBusy(false);
    }
  };
  const create = () =>
    run(async () => {
      setToken((await smsApi.createToken()).token);
      setExists(true);
    });
  const revoke = () =>
    run(async () => {
      await smsApi.revokeToken();
      setToken("");
      setExists(false);
    });
  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
    } catch {
      setCopied("");
    }
  };

  const rows: Array<[string, string, string]> = [
    ["endpoint", t("smsEndpoint"), endpoint],
    ...(token ? ([["header", t("smsHeader"), `Authorization: Bearer ${token}`]] as Array<[string, string, string]>) : []),
    ["body", t("smsBody"), FORWARDER_BODY],
  ];

  return (
    <article className="card glass pad sms-setup" style={{ marginTop: 18 }}>
      <h2>{t("smsPhone")}</h2>
      <p className="meta" style={{ marginTop: 10 }}>
        {t("smsPhoneHint")}
      </p>
      <p className="sms-setup-state">
        <strong>{exists === null ? t("loading") : t(exists ? "smsTokenActive" : "smsTokenNone")}</strong>
      </p>
      {token && <p className="form-note">{t("smsTokenOnce")}</p>}
      {(exists || token) && (
        <dl className="sms-setup-values">
          {rows.map(([key, name, value]) => (
            <div key={key}>
              <dt>{name}</dt>
              <dd>
                <code>{value}</code>
                <button type="button" className="btn" onClick={() => void copy(key, value)}>
                  <span>{t(copied === key ? "copied" : "copy")}</span>
                </button>
              </dd>
            </div>
          ))}
        </dl>
      )}
      {error && <p className="form-error">{error}</p>}
      {pending ? (
        <div className="data-actions">
          <p className="meta">{t(pending === "rotate" ? "smsConfirmRotate" : "smsConfirmRevoke")}</p>
          <button type="button" className="btn" disabled={busy} onClick={() => setPending(null)}>
            <span>{t("cancel")}</span>
          </button>
          <button type="button" className="btn primary" disabled={busy} onClick={() => void (pending === "rotate" ? create() : revoke())}>
            <span>{t(pending === "rotate" ? "smsTokenRotate" : "smsTokenRevoke")}</span>
          </button>
        </div>
      ) : (
        exists !== null && (
          <div className="data-actions">
            <button type="button" className="btn primary" disabled={busy} onClick={() => (exists ? setPending("rotate") : void create())}>
              <span>{t(exists ? "smsTokenRotate" : "smsTokenCreate")}</span>
            </button>
            {exists && (
              <button type="button" className="btn" disabled={busy} onClick={() => setPending("revoke")}>
                <span>{t("smsTokenRevoke")}</span>
              </button>
            )}
          </div>
        )
      )}
    </article>
  );
}
