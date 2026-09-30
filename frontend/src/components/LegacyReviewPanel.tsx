import type { Review } from "../types";

interface Bucket { label: string; count: number }
interface ComparisonRow { key: string; current: string; previous: string; percent: string; tone: "good" | "bad" | "neutral"; trend: "up" | "down" | "flat" }
interface ProgressItem { id: string; title: string; percent: number; done: number; total: number; overdue: number }
interface ReportView { text: string; range: string; auto: boolean }
interface Props {
  period: string;
  start: string;
  end: string;
  rangeLabel: string;
  completed: number;
  consistency: number;
  notes: number;
  buckets: Bucket[];
  reflection: Partial<Review>;
  comparison: ComparisonRow[];
  previousLabel: string;
  goals: ProgressItem[];
  projects: ProgressItem[];
  report: ReportView | null;
  label: (key: string) => string;
}

export function LegacyReviewPanel({ period, start, rangeLabel, completed, consistency, notes, buckets, reflection, comparison, previousLabel, goals, projects, report, label: t }: Props) {
  const max = Math.max(1, ...buckets.map((bucket) => bucket.count));
  return <>
    <div className="toolbar">
      <div className="segments">{["week", "month", "quarter", "year"].map((value) => <button type="button" key={value} className={period === value ? "active" : ""} data-action="review-period" data-value={value}><span>{t(value)}</span></button>)}</div>
      <button type="button" className="btn" data-action="review-prev"><span>{t("back")}</span></button>
      <button type="button" className="btn" data-action="review-next"><span>{t("next")}</span></button>
      <span className="meta">{rangeLabel}</span><span className="spacer" /><span className="tag">{t("actualData")}</span>
    </div>
    <div className="stat-grid">
      <Stat label={t("completed")} value={completed} />
      <Stat label={t("consistency")} value={`${consistency}%`} />
      <Stat label={t("notes")} value={notes} />
    </div>
    <article className="card glass pad review-compare"><div className="section-title"><h2>{t("comparePeriods")}</h2><small>{t("vs")} {previousLabel}</small></div>
      <div className="compare-grid">{comparison.map((row) => <div className={`compare-row ${row.tone}`} key={row.key}><span>{t(row.key)}</span><strong>{row.current}</strong><small>{row.previous}</small><b aria-label={row.percent}>{row.trend === "up" ? "▲" : row.trend === "down" ? "▼" : "•"} {row.percent}</b></div>)}</div></article>
    <div className="settings-grid">
      <ProgressCard type="goal" title={t("goals")} items={goals} label={t} />
      <ProgressCard type="project" title={t("projects")} items={projects} label={t} />
    </div>
    {report && <article className="card glass pad weekly-report"><div className="section-title"><h2>{t("weeklyReport")}</h2><small>{report.range}{report.auto ? ` · ${t("automatic")}` : ""}</small></div><pre>{report.text}</pre><div className="form-footer"><button type="button" className="btn" data-action="report-copy"><span>{t("copy")}</span></button><button type="button" className="btn" data-action="report-download"><span>{t("download")}</span></button></div></article>}
    <div className="settings-grid">
      <article className="card glass pad"><h2>{t("periodProgress")}</h2><div className="review-chart">{buckets.map((bucket, index) => <div className="chart-column" key={`${bucket.label}-${index}`}><small>{bucket.count}</small><i style={{ height: `${bucket.count / max * 125}px` }} /><small>{bucket.label}</small></div>)}</div></article>
      <article className="card glass pad"><h2>{t("reflection")}</h2><form id="reflection-form" data-week={start}>
        {(["wins", "improve", "nextFocus"] as const).map((key) => <div className="field" key={key}><label htmlFor={key}>{t(key)}</label><textarea name={key} id={key} defaultValue={reflection[key] || ""} /></div>)}
        <div className="form-footer"><button type="button" className="btn primary" data-action="save-reflection"><span>{t("save")}</span></button></div>
      </form></article>
    </div>
  </>;
}

function ProgressCard({ type, title, items, label: t }: { type: "goal" | "project"; title: string; items: ProgressItem[]; label: (key: string) => string }) {
  return <article className="card glass pad"><h2>{title}</h2>{items.length ? <div className="progress-list">{items.map((item) => <button type="button" className="progress-row" data-action="detail" data-type={type} data-id={item.id} key={item.id}><span><strong>{item.title}</strong><small>{item.done}/{item.total}{item.overdue > 0 ? ` · ${t("overdue")}: ${item.overdue}` : ""}</small></span><i><b style={{ width: `${item.percent}%` }} /></i><em>{item.percent}%</em></button>)}</div> : <p className="meta">{t("empty")}</p>}</article>;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <article className="card glass stat"><small>{label}</small><strong>{value}</strong></article>;
}

export type { ComparisonRow, ProgressItem, ReportView };
