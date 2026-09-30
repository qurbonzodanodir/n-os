interface Settings { name: string; language: string; theme: string }
interface Props {
  view: string;
  nav: string[];
  settings: Settings;
  taskCount: number;
  online: boolean;
  syncLabel: string;
  syncError: string;
  conflict: boolean;
  contentHtml: string;
  label: (key: string) => string;
  icon: (key: string) => string;
}

const mobileViews = ["today", "tasks", "calendar", "notes"];

export function LegacyShellPanel({ view, nav, settings, taskCount, online, syncLabel, syncError, conflict, contentHtml, label: t, icon }: Props) {
  return <><div className="shell"><aside className="sidebar glass"><a href="#today" className="brand"><span className="logo">n</span><span>n-<em>os</em></span></a><p className="section-label">{t("workspace")}</p><nav className="nav">{nav.map((item) => <button type="button" data-action="view" data-value={item} className={view === item ? "active" : ""} aria-current={view === item ? "page" : undefined} key={item}><Markup html={icon(item)} /><span>{t(item)}</span>{item === "tasks" && <span className="count">{taskCount}</span>}</button>)}</nav><div className="sidebar-foot"><p><Markup html={icon("lock")} />{t("private")}</p><div className="profile"><span className="avatar">{(settings.name || "n").slice(0, 2).toUpperCase()}</span><div><strong>{settings.name || "n-os"}</strong><br /><small>{t("workspace")}</small></div></div></div></aside>
    <main className="main"><header className="topbar"><div className="breadcrumbs"><Markup html={icon(view)} /><span>{t(view)}</span></div><div className="mobile-brand"><span className="logo">n</span><span>n-os</span></div><div className="actions"><button type="button" className="btn search-trigger" data-action="search"><Markup html={icon("search")} /><span>{t("search")}</span><kbd>⌘ K</kbd></button><button type="button" className="btn" data-action="language" aria-label={t("language")}>{settings.language === "ru" ? "EN" : "RU"}</button><button type="button" className="btn icon-btn" data-action="theme" aria-label={t("theme")}><Markup html={icon(settings.theme === "dark" ? "moon" : "sun")} /></button><button type="button" className="btn icon-btn" data-action="notifications" aria-label={t("notifications")}><Markup html={icon("bell")} /></button><button type="button" className="btn primary" data-action="quick"><Markup html={icon("plus")} /><span>{t("add")}</span></button></div></header>
      <div className={`sync ${online ? "" : "offline"}`}><Markup html={icon(online ? "cloud" : "download")} /><span>{syncLabel}</span></div>
      {syncError && <div className="error-banner" role="alert">{t(syncError)}<div className="actions"><button type="button" className="btn" data-action="export"><span>{t("export")}</span></button><button type="button" className="btn" data-action={conflict ? "reload" : "retry"}><span>{t(conflict ? "reload" : "retry")}</span></button></div></div>}
      <section id="content" dangerouslySetInnerHTML={{ __html: contentHtml }} />
    </main></div>
    <button type="button" className="mobile-fab" data-action="quick" aria-label={t("add")}><Markup html={icon("plus")} /></button>
    <nav className="mobile-nav glass" aria-label={t("workspace")}>{mobileViews.map((item) => <button type="button" data-action="view" data-value={item} className={view === item ? "active" : ""} key={item}><Markup html={icon(item)} />{t(item)}</button>)}<button type="button" data-action="more" className={!mobileViews.includes(view) ? "active" : ""}><Markup html={icon("more")} />{t("more")}</button></nav>
  </>;
}

function Markup({ html }: { html: string }) { return <span className="legacy-markup" dangerouslySetInnerHTML={{ __html: html }} />; }
