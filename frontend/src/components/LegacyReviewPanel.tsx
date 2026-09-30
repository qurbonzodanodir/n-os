import type { Review } from "../types";

interface Bucket { label: string; count: number }
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
  label: (key: string) => string;
}

export function LegacyReviewPanel({ period, start, rangeLabel, completed, consistency, notes, buckets, reflection, label: t }: Props) {
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
    <div className="settings-grid">
      <article className="card glass pad"><h2>{t("periodProgress")}</h2><div className="review-chart">{buckets.map((bucket, index) => <div className="chart-column" key={`${bucket.label}-${index}`}><small>{bucket.count}</small><i style={{ height: `${bucket.count / max * 125}px` }} /><small>{bucket.label}</small></div>)}</div></article>
      <article className="card glass pad"><h2>{t("reflection")}</h2><form id="reflection-form" data-week={start}>
        {(["wins", "improve", "nextFocus"] as const).map((key) => <div className="field" key={key}><label htmlFor={key}>{t(key)}</label><textarea name={key} id={key} defaultValue={reflection[key] || ""} /></div>)}
        <div className="form-footer"><button type="button" className="btn primary" data-action="save-reflection"><span>{t("save")}</span></button></div>
      </form></article>
    </div>
  </>;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <article className="card glass stat"><small>{label}</small><strong>{value}</strong></article>;
}
