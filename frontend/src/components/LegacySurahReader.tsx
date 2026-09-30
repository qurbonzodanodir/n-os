interface Verse {
  arabic: string;
  tajik: string;
  russian: string;
}
interface Props {
  verses: Verse[];
  learned: boolean;
  note: string;
  label: (key: string) => string;
  surahId: string;
  icon: (key: string) => string;
}

export function LegacySurahReader({ verses, learned, note, label: t, surahId, icon }: Props) {
  return (
    <div className="surah-reader">
      <div className="reading-key">
        <span>{t("originalArabic")}</span>
        <span>{t("tajikReading")}</span>
        <span>{t("russianMeaning")}</span>
      </div>
      {verses.map((verse, index) => (
        <section className="verse" key={index}>
          <span className="verse-number">{index + 1}</span>
          <p className="arabic" dir="rtl" lang="ar">
            {verse.arabic}
          </p>
          <p className="tajik">{verse.tajik}</p>
          <p className="meaning">{verse.russian}</p>
        </section>
      ))}
      <p className="islam-note">{note}</p>
      <div className="form-footer">
        <button type="button" className="btn primary" data-action="surah-learned" data-value={surahId}>
          <Markup html={icon("check")} />
          <span>{t(learned ? "learned" : "markLearned")}</span>
        </button>
      </div>
    </div>
  );
}

function Markup({ html }: { html: string }) {
  return <span className="legacy-markup" dangerouslySetInnerHTML={{ __html: html }} />;
}
