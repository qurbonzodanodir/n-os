interface HistoryRow { revision: number; createdAt: string }
interface HistoryProps { loading?: boolean; rows?: HistoryRow[]; label: (key: string) => string; icon: (key: string) => string }
interface PreviewProps { revision: number; records: number; tasks: number; notes: number; habits: number; label: (key: string) => string }

export function LegacyWorkspaceHistoryDialog({ loading = false, rows = [], label: t, icon }: HistoryProps) {
  if (loading) return <p className="form-note">{t("loading")}</p>;
  return <><p className="form-note">{t("historyHint")}</p><div className="related-list">{rows.map((row) => <button type="button" className="related-item" data-action="revision-preview" data-value={row.revision} key={row.revision}><Markup html={icon("history")} /><span><strong>{t("version")} {row.revision}</strong><small>{row.createdAt}</small></span><Markup html={icon("arrow")} /></button>)}{!rows.length && <p className="meta">{t("noData")}</p>}</div></>;
}

export function LegacyWorkspaceRevisionDialog({ revision, records, tasks, notes, habits, label: t }: PreviewProps) {
  return <><div className="detail-stats"><Stat label={t("records")} value={records} /><Stat label={t("tasks")} value={tasks} /><Stat label={t("notes")} value={notes} /><Stat label={t("habits")} value={habits} /></div><p className="form-note">{t("restoreHint")}</p><div className="form-footer"><button type="button" className="btn" data-action="workspace-history"><span>{t("cancel")}</span></button><button type="button" className="btn primary" data-action="restore-revision" data-value={revision}><span>{t("restore")}</span></button></div></>;
}

function Stat({ label, value }: { label: string; value: number }) { return <div className="detail-stat"><small>{label}</small><strong>{value}</strong></div>; }
function Markup({ html }: { html: string }) { return <span className="legacy-markup" dangerouslySetInnerHTML={{ __html: html }} />; }
