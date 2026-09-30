import type { WorkspaceSettings } from "../types";

interface Props {
  settings: WorkspaceSettings;
  label: (key: string) => string;
  installMessage: string;
  installAvailable: boolean;
  legacyImportAvailable: boolean;
  notificationsGranted: boolean;
}

const timezones = ["Asia/Dushanbe", "UTC", "Europe/Berlin", "Europe/London", "America/New_York"];
const currencies = ["TJS", "USD", "EUR", "RUB", "CNY"];

export function LegacySettingsPanel({ settings, label: t, installMessage, installAvailable, legacyImportAvailable, notificationsGranted }: Props) {
  return <>
    <form id="settings-form">
      <div className="settings-grid">
        <article className="card glass">
          <h2>{t("preferences")}</h2>
          <Field label={t("name")}><input name="name" defaultValue={settings.name} maxLength={250} /></Field>
          <Field label={t("timezone")}><select name="timezone" defaultValue={settings.timezone}>{timezones.map((zone) => <option key={zone}>{zone}</option>)}</select></Field>
          <Field label={t("currency")}><select name="currency" defaultValue={settings.currency}>{currencies.map((currency) => <option key={currency}>{currency}</option>)}</select></Field>
          <Field label={t("weekStart")}><select name="weekStart" defaultValue={String(settings.weekStart)}><option value="1">{t("monday")}</option><option value="0">{t("sunday")}</option></select></Field>
        </article>
        <article className="card glass">
          <h2>{t("appearance")}</h2>
          <Field label={t("language")}><select name="language" defaultValue={settings.language}><option value="ru">Русский</option><option value="en">English</option></select></Field>
          <Field label={t("theme")}><select name="theme" defaultValue={settings.theme}><option value="light">{t("light")}</option><option value="dark">{t("dark")}</option><option value="system">{t("system")}</option></select></Field>
          <label className="check-field"><input type="checkbox" name="reducedTransparency" defaultChecked={settings.reducedTransparency} />{t("glass")}</label>
          <div className="form-footer"><button type="button" className="btn primary" data-action="save-settings"><span>{t("save")}</span></button></div>
        </article>
        <article className="card glass">
          <h2>{t("notifications")}</h2>
          <label className="check-field"><input type="checkbox" name="remindersEnabled" defaultChecked={settings.remindersEnabled} />{t("dailyReminders")}</label>
          <Field label={t("morningSummary")}><input type="time" name="morningTime" defaultValue={settings.morningTime || "08:00"} /></Field>
          <Field label={t("eveningSummary")}><input type="time" name="eveningTime" defaultValue={settings.eveningTime || "20:30"} /></Field>
          <p className="form-note">{t("notificationOpen")}</p>
          <button type="button" className="btn" data-action="workspace-notifications"><span>{t(notificationsGranted ? "notifications" : "enableNotifications")}</span></button>
        </article>
      </div>
    </form>
    <article className="card glass pad install-card" style={{ marginTop: 18 }}>
      <div><h2>{t("installApp")}</h2><p className="meta">{installMessage}</p></div>
      {installAvailable && <button type="button" className="btn primary" data-action="install-app"><span>{t("installApp")}</span></button>}
    </article>
    <article className="card glass pad" style={{ marginTop: 18 }}>
      <h2>{t("data")}</h2><p className="meta" style={{ marginTop: 10 }}>{t("syncNote")}</p>
      <div className="data-actions">
        <button type="button" className="btn" data-action="workspace-history"><span>{t("versionHistory")}</span></button>
        <button type="button" className="btn" data-action="export"><span>{t("export")}</span></button>
        <button type="button" className="btn" data-action="import"><span>{t("import")}</span></button>
        {legacyImportAvailable && <button type="button" className="btn" data-action="migrate"><span>{t("migrate")}</span></button>}
      </div>
    </article>
  </>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="field"><label>{label}</label>{children}</div>;
}
