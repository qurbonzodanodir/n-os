interface HistoryCell {
  date: string;
  title: string;
  level: number;
}
interface History {
  title: string;
  subtitle: string;
  total: number;
  cells: HistoryCell[];
}
interface PrayerCard {
  key: string;
  name: string;
  time: string;
  done: boolean;
  iconName: string;
}
interface PrayerContent {
  state: "loading" | "error" | "empty" | "ready";
  nextName?: string;
  nextDescription?: string;
  city?: string;
  hijri?: string;
  reminderMinutes?: number;
  notifications?: boolean;
  cards?: PrayerCard[];
  history?: History;
  note?: string;
}
interface SurahItem {
  id: string;
  number: number;
  name: string;
  arabicName: string;
  verses: number;
  learned: boolean;
}
interface SurahContent {
  basmala: { arabic: string; tajik: string; russian: string };
  note: string;
  items: SurahItem[];
}
interface AzkarCategory {
  id: string;
  name: string;
  active: boolean;
}
interface ZikrItem {
  id: string;
  target: number;
  count: number;
  percent: number;
  complete: boolean;
  arabic: string;
  tajik: string;
  russian: string;
}
interface AzkarContent {
  categories: AzkarCategory[];
  completed: number;
  total: number;
  history: History;
  items: ZikrItem[];
}

interface Props {
  tab: string;
  learned: number;
  surahCount: number;
  prayer?: PrayerContent;
  surahs?: SurahContent;
  azkar?: AzkarContent;
  label: (key: string) => string;
  icon: (key: string) => string;
}

export function LegacyIslamPanel({ tab, learned, surahCount, prayer, surahs, azkar, label: t, icon }: Props) {
  return (
    <>
      <header className="hero islam-heading">
        <div>
          <div className="eyebrow">n-os / {t("workspace")}</div>
          <h1>{t("islam")}</h1>
          <p>{t("islamSub")}</p>
        </div>
        <div className="islam-progress">
          <strong>
            {learned}/{surahCount}
          </strong>
          <small>
            {t("surahs")} · {t("learned").toLowerCase()}
          </small>
        </div>
      </header>
      <div className="islam-tabs">
        <div className="segments">
          {["prayer", "surahs", "azkar"].map((value) => (
            <button type="button" className={tab === value ? "active" : ""} data-action="islam-tab" data-value={value} key={value}>
              <span>{t(value)}</span>
            </button>
          ))}
        </div>
      </div>
      {tab === "prayer" && prayer && <PrayerTab value={prayer} label={t} icon={icon} />}
      {tab === "surahs" && surahs && <SurahsTab value={surahs} label={t} icon={icon} />}
      {tab === "azkar" && azkar && <AzkarTab value={azkar} label={t} icon={icon} />}
    </>
  );
}

function PrayerTab({ value, label: t, icon }: { value: PrayerContent; label: (key: string) => string; icon: (key: string) => string }) {
  if (value.state === "loading")
    return (
      <article className="card glass islam-loading">
        <Markup html={icon("islam")} />
        <p>{t("loading")}</p>
      </article>
    );
  if (value.state === "error")
    return (
      <article className="card glass islam-loading">
        <p>{t("prayerLoadError")}</p>
        <button type="button" className="btn" data-action="prayer-retry">
          <span>{t("retry")}</span>
        </button>
      </article>
    );
  if (value.state !== "ready") return null;
  return (
    <>
      <section className="prayer-hero glass">
        <div>
          <span className="eyebrow">{t("nextPrayer")}</span>
          <h2>{value.nextName}</h2>
          <p>{value.nextDescription}</p>
        </div>
        <div className="prayer-meta">
          <strong>{value.city}</strong>
          <span>{value.hijri}</span>
          <small>{t("hanafi")}</small>
        </div>
      </section>
      <div className="prayer-toolbar">
        <p>{t("calculatedTimes")}</p>
        <div className="actions">
          <label className="reminder-select">
            {t("remindBefore")}{" "}
            <select id="prayer-reminder" defaultValue={value.reminderMinutes}>
              {[5, 10, 15, 30].map((minutes) => (
                <option value={minutes} key={minutes}>
                  {minutes} {t("minutes")}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn" data-action="prayer-notifications">
            <Markup html={icon("bell")} />
            <span>{t(value.notifications ? "notifications" : "enablePrayerReminders")}</span>
          </button>
        </div>
      </div>
      <div className="prayer-grid">
        {value.cards?.map((card) => (
          <article className={`card glass prayer-card ${card.done ? "complete" : ""}`} key={card.key}>
            <span className="prayer-orb">
              <Markup html={icon(card.iconName)} />
            </span>
            <div>
              <small>{t("prayer")}</small>
              <h3>{card.name}</h3>
            </div>
            <time>{card.time}</time>
            <button
              type="button"
              className={`check ${card.done ? "done" : ""}`}
              data-action="prayer-check"
              data-value={card.key}
              aria-label={`${t("prayed")} ${card.name}`}
            >
              {card.done && <Markup html={icon("check")} />}
            </button>
          </article>
        ))}
      </div>
      {value.history && <HistoryPanel value={value.history} />}
      {value.note && <p className="islam-note">{value.note}</p>}
    </>
  );
}

function SurahsTab({ value, label: t, icon }: { value: SurahContent; label: (key: string) => string; icon: (key: string) => string }) {
  return (
    <>
      <div className="surah-intro glass">
        <div className="arabic" dir="rtl" lang="ar">
          {value.basmala.arabic}
        </div>
        <strong>{value.basmala.tajik}</strong>
        <p>{value.basmala.russian}</p>
      </div>
      <p className="islam-note">{value.note}</p>
      <div className="surah-grid">
        {value.items.map((surah) => (
          <button type="button" className="card glass surah-card" data-action="open-surah" data-value={surah.id} key={surah.id}>
            <span className="surah-number">{surah.number}</span>
            <div>
              <h3>{surah.name}</h3>
              <small>
                {surah.verses} {t("verse").toLowerCase()}
              </small>
            </div>
            <strong className="arabic" dir="rtl" lang="ar">
              {surah.arabicName}
            </strong>
            {surah.learned && (
              <span className="learned-badge">
                <Markup html={icon("check")} /> {t("learned")}
              </span>
            )}
          </button>
        ))}
      </div>
    </>
  );
}

function AzkarTab({ value, label: t, icon }: { value: AzkarContent; label: (key: string) => string; icon: (key: string) => string }) {
  return (
    <>
      <div className="zikr-categories">
        {value.categories.map((category) => (
          <button
            type="button"
            className={category.active ? "active" : ""}
            data-action="zikr-category"
            data-value={category.id}
            key={category.id}
          >
            {category.name}
          </button>
        ))}
      </div>
      <div className="azkar-summary glass">
        <div>
          <strong>
            {value.completed}/{value.total}
          </strong>
          <small>{t("completed")}</small>
        </div>
        <p>{t("todayAzkar")}</p>
        <button type="button" className="btn" data-action="zikr-reset">
          <span>{t("reset")}</span>
        </button>
      </div>
      <HistoryPanel value={value.history} />
      <div className="azkar-grid">
        {value.items.map((item) => (
          <article className={`card glass zikr-card ${item.complete ? "complete" : ""}`} key={item.id}>
            <div className="zikr-top">
              <span className="tag">{item.target}×</span>
              {item.complete && (
                <span className="learned-badge">
                  <Markup html={icon("check")} /> {t("completed")}
                </span>
              )}
            </div>
            <div className="arabic" dir="rtl" lang="ar">
              {item.arabic}
            </div>
            <h3>{item.tajik}</h3>
            <p>{item.russian}</p>
            <button
              type="button"
              data-action="zikr-count"
              data-value={item.id}
              className="zikr-counter"
              style={{ "--value": item.percent } as React.CSSProperties}
            >
              <strong>{item.count}</strong>
              <small>/ {item.target}</small>
            </button>
          </article>
        ))}
      </div>
    </>
  );
}

function HistoryPanel({ value }: { value: History }) {
  return (
    <section className="card glass islam-history">
      <div className="section-title">
        <div>
          <h3>{value.title}</h3>
          <small>{value.subtitle}</small>
        </div>
        <strong>{value.total}</strong>
      </div>
      <div className="islam-history-cells">
        {value.cells.map((cell) => (
          <span style={{ "--level": cell.level } as React.CSSProperties} title={cell.title} key={cell.date} />
        ))}
      </div>
    </section>
  );
}

function Markup({ html }: { html: string }) {
  return <span className="legacy-markup" dangerouslySetInnerHTML={{ __html: html }} />;
}
