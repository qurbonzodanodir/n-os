import type { Note } from "../types";

interface Props {
  notes: Note[];
  filter: string;
  query: string;
  label: (key: string) => string;
  formatDate: (value?: string) => string;
}

export function LegacyNotesPanel({ notes, filter, query, label: t, formatDate }: Props) {
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
        {notes.map((note) => (
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
            <h3>{note.title}</h3>
            <div className="snippet">{note.body}</div>
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
        {!notes.length && (
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
