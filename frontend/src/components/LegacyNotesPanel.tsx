import { highlight, type NoteHit } from "../domain/notes";

interface Props {
  hits: NoteHit[];
  filter: string;
  query: string;
  label: (key: string) => string;
  formatDate: (value?: string) => string;
}

export function LegacyNotesPanel({ hits, filter, query, label: t, formatDate }: Props) {
  return (
    <>
      <div className="toolbar">
        <div className="segments">
          {["active", "pinned", "archived"].map((value) => (
            <button type="button" key={value} className={filter === value ? "active" : ""} data-action="note-filter" data-value={value}>
              <span>{t(value)}</span>
            </button>
          ))}
        </div>
        <span className="spacer" />
        <input className="filter" id="note-query" placeholder={t("search")} defaultValue={query} aria-label={t("search")} />
      </div>
      <div className="cards">
        {hits.map(({ note, snippet }) => (
          <button
            type="button"
            className="card glass note-card"
            data-action="detail"
            data-type="note"
            data-id={note.id}
            data-color={note.color}
            key={note.id}
          >
            <span className="meta">
              {note.pinned ? "●" : "▧"} {note.folder || ""}
            </span>
            <h3>{query.trim() ? <Marked text={note.title} query={query} /> : note.title}</h3>
            <div className="snippet">{query.trim() ? <Marked text={snippet} query={query} /> : note.body}</div>
            <footer>
              {(note.tags || "")
                .split(",")
                .filter(Boolean)
                .map((tag) => (
                  <span className="tag" key={tag}>
                    {tag.trim()}
                  </span>
                ))}
              <small>{formatDate(note.updatedAt || note.createdAt)}</small>
            </footer>
          </button>
        ))}
        {!hits.length && (
          <div className="empty">
            <strong>{t("empty")}</strong>
            <p>{t("emptyHint")}</p>
            <button type="button" className="btn" data-action="add" data-value="note">
              <span>{t("add")}</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function Marked({ text, query }: { text: string; query: string }) {
  return <>{highlight(text, query).map((part, index) => (part.match ? <mark key={index}>{part.text}</mark> : part.text))}</>;
}
