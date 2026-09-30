interface Stat {
  label: string;
  value: string | number;
}
interface RelatedItem {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  iconName: string;
}
interface CheckItem {
  title: string;
  done: boolean;
}
interface MetaItem {
  text: string;
  iconName: string;
}
interface HabitCell {
  date: string;
  checked: boolean;
  due: boolean;
  future: boolean;
  title: string;
}
interface WeekdayRate {
  label: string;
  percent: number;
}
interface GenericModel {
  kind: "generic";
  stats?: Stat[];
  meta?: MetaItem[];
  markdownHtml?: string;
  description?: string;
  progress?: number;
  checklistTitle?: string;
  checklist?: CheckItem[];
  relatedTitle?: string;
  related?: RelatedItem[];
  empty?: string;
}
interface HabitModel {
  kind: "habit";
  period: "month" | "year";
  periodLabel: string;
  stats: Stat[];
  cells: Array<HabitCell | null>;
  weekdays: WeekdayRate[];
}
type DetailModel = GenericModel | HabitModel;
interface Props {
  type: string;
  id: string;
  model: DetailModel;
  label: (key: string) => string;
  icon: (key: string) => string;
}

export function LegacyDetailPanel({ type, id, model, label: t, icon }: Props) {
  return (
    <>
      {model.kind === "habit" ? (
        <HabitDetail model={model} label={t} icon={icon} habitId={id} />
      ) : (
        <GenericDetail model={model} icon={icon} />
      )}
      <div className="form-footer">
        <button type="button" className="btn" data-action="close">
          <span>{t("close")}</span>
        </button>
        <button type="button" className="btn primary" data-action="edit-item" data-value={`${type}:${id}`}>
          <span>{t("edit")}</span>
        </button>
      </div>
    </>
  );
}

function Stats({ items = [] }: { items?: Stat[] }) {
  return items.length ? (
    <div className="detail-stats">
      {items.map((item, index) => (
        <div className="detail-stat" key={`${item.label}-${index}`}>
          <small>{item.label}</small>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  ) : null;
}

function Related({ title, items, icon }: { title?: string; items?: RelatedItem[]; icon: (key: string) => string }) {
  if (!items?.length) return null;
  return (
    <section className="detail-section">
      <h3>{title}</h3>
      <div className="related-list">
        {items.map((item) => (
          <button
            type="button"
            className="related-item"
            data-action="detail"
            data-type={item.type}
            data-id={item.id}
            key={`${item.type}-${item.id}`}
          >
            <Markup html={icon(item.iconName)} />
            <span>
              <strong>{item.title}</strong>
              {item.subtitle && <small>{item.subtitle}</small>}
            </span>
            <Markup html={icon("arrow")} />
          </button>
        ))}
      </div>
    </section>
  );
}

function GenericDetail({ model, icon }: { model: GenericModel; icon: (key: string) => string }) {
  return (
    <>
      {model.meta?.length ? (
        <div className="detail-meta">
          {model.meta.map((item, index) => (
            <span key={`${item.text}-${index}`}>
              <Markup html={icon(item.iconName)} /> {item.text}
            </span>
          ))}
        </div>
      ) : null}
      <Stats items={model.stats} />
      {model.progress !== undefined && (
        <div className="bar detail-progress">
          <i style={{ width: `${model.progress}%` }} />
        </div>
      )}
      {model.description && <p className="detail-copy">{model.description}</p>}
      {model.markdownHtml !== undefined && <article className="md detail-copy" dangerouslySetInnerHTML={{ __html: model.markdownHtml }} />}
      {model.checklist?.length ? (
        <section className="detail-section">
          <h3>{model.checklistTitle}</h3>
          {model.checklist.map((item, index) => (
            <div className={`detail-check ${item.done ? "done" : ""}`} key={`${item.title}-${index}`}>
              {item.done && <Markup html={icon("check")} />}
              <span>{item.title}</span>
            </div>
          ))}
        </section>
      ) : null}
      <Related title={model.relatedTitle} items={model.related} icon={icon} />
      {model.empty && <p className="meta">{model.empty}</p>}
    </>
  );
}

function HabitDetail({
  model,
  label: t,
  icon,
  habitId,
}: {
  model: HabitModel;
  label: (key: string) => string;
  icon: (key: string) => string;
  habitId: string;
}) {
  return (
    <>
      <div className="detail-toolbar">
        <div className="segments">
          {(["month", "year"] as const).map((period) => (
            <button
              type="button"
              className={model.period === period ? "active" : ""}
              data-action="detail-period"
              data-value={period}
              key={period}
            >
              <span>{t(period)}</span>
            </button>
          ))}
        </div>
        <span className="spacer" />
        <button type="button" className="btn icon-btn" data-action="detail-prev" aria-label={t("back")}>
          <Markup html={icon("arrow")} />
        </button>
        <strong>{model.periodLabel}</strong>
        <button type="button" className="btn icon-btn" data-action="detail-next" aria-label={t("next")}>
          <Markup html={icon("arrow")} />
        </button>
      </div>
      <Stats items={model.stats} />
      <section className="detail-section">
        <div className="section-title">
          <h3>{t("activity")}</h3>
          <small>{t("habitHistoryHint")}</small>
        </div>
        <div className="heatmap-wrap">
          <div className={`heatmap ${model.period}`}>
            {model.cells.map((cell, index) =>
              cell ? (
                <button
                  type="button"
                  className={`heat-cell ${cell.checked ? "checked" : ""} ${cell.due ? "due" : "off"} ${cell.future ? "future" : ""}`}
                  data-action={cell.due && !cell.future ? "habit-detail-check" : undefined}
                  data-id={cell.due && !cell.future ? habitId : undefined}
                  data-value={cell.due && !cell.future ? cell.date : undefined}
                  title={cell.title}
                  aria-label={cell.date}
                  key={cell.date}
                />
              ) : (
                <span className="heat-cell blank" key={`blank-${index}`} />
              ),
            )}
          </div>
        </div>
        <div className="heat-legend">
          <span>{t("notScheduled")}</span>
          <i className="heat-cell off" />
          <i className="heat-cell due" />
          <i className="heat-cell checked" />
          <span>{t("checked")}</span>
        </div>
      </section>
      <section className="detail-section">
        <h3>{t("weekdayConsistency")}</h3>
        <div className="weekday-rates">
          {model.weekdays.map((item) => (
            <div className="weekday-rate" key={item.label}>
              <span>{item.label}</span>
              <i>
                <b style={{ width: `${item.percent}%` }} />
              </i>
              <strong>{item.percent}%</strong>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function Markup({ html }: { html: string }) {
  return <span className="legacy-markup" dangerouslySetInnerHTML={{ __html: html }} />;
}

export type { DetailModel, GenericModel, HabitModel };
