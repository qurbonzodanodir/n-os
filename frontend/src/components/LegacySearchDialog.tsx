import type { ParsedTask } from "../domain/quickAdd";
import { useMemo, useRef, useState, type KeyboardEvent } from "react";

interface SearchRow {
  id: string;
  type: string;
  title: string;
  searchable: string;
  iconName: string;
}
interface CommandRow {
  key: string;
  title: string;
  subtitle?: string;
  searchable: string;
  iconName: string;
  action: string;
  value?: string;
}
interface Props {
  rows: SearchRow[];
  commands: CommandRow[];
  parseQuick: (text: string) => ParsedTask;
  label: (key: string) => string;
  icon: (key: string) => string;
}

export function LegacySearchDialog({ rows, commands, parseQuick, label: t, icon }: Props) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const resultsRef = useRef<HTMLDivElement>(null);
  const normalized = query.trim().toLowerCase();
  const matches = useMemo(() => {
    const commandMatches = commands
      .filter((row) => !normalized || row.searchable.includes(normalized))
      .map((row) => ({ ...row, kind: "command" as const }));
    const recordMatches = rows
      .filter((row) => !normalized || row.searchable.includes(normalized))
      .map((row) => ({ ...row, kind: "record" as const }));
    // Offered after real commands so that typing "finance" still opens Finance on Enter.
    const parsed = normalized.length > 2 ? parseQuick(query) : null;
    const quickAdd = parsed?.title
      ? [
          {
            key: "quick-task",
            title: `${t("addTaskNamed")}: ${parsed.title}`,
            subtitle: [parsed.date, parsed.time, parsed.priority && t(parsed.priority)].filter(Boolean).join(" · "),
            searchable: "",
            iconName: "tasks",
            action: "quick-task",
            value: query.trim(),
            kind: "command" as const,
          },
        ]
      : [];
    return [...commandMatches, ...quickAdd, ...recordMatches].slice(0, 30);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t is a stable translator for the dialog's lifetime
  }, [commands, normalized, parseQuick, query, rows]);
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setActive((current) => (current + (event.key === "ArrowDown" ? 1 : -1) + Math.max(matches.length, 1)) % Math.max(matches.length, 1));
    }
    if (event.key === "Enter" && matches.length) {
      event.preventDefault();
      resultsRef.current?.querySelectorAll<HTMLButtonElement>(".search-result")[active]?.click();
    }
  };
  return (
    <>
      <input
        className="search-input"
        id="global-search"
        aria-label={t("commandPalette")}
        placeholder={t("commandSearch")}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
        }}
        onKeyDown={onKeyDown}
        autoComplete="off"
      />
      <div id="search-results" ref={resultsRef}>
        {matches.map((row, index) =>
          row.kind === "command" ? (
            <button
              type="button"
              className={`search-result ${active === index ? "active" : ""}`}
              data-action={row.action}
              data-value={row.value}
              key={`command-${row.key}`}
            >
              <Markup html={icon(row.iconName)} />
              <span>
                <strong>{row.title}</strong>
                {row.subtitle && <small>{row.subtitle}</small>}
              </span>
              <kbd>↵</kbd>
            </button>
          ) : (
            <button
              type="button"
              className={`search-result ${active === index ? "active" : ""}`}
              data-action="detail"
              data-type={row.type}
              data-id={row.id}
              key={`${row.type}-${row.id}`}
            >
              <Markup html={icon(row.iconName)} />
              <span>
                <strong>{row.title}</strong>
              </span>
              <small>{t(row.type)}</small>
            </button>
          ),
        )}
        {!matches.length && <div className="empty">{t("noResults")}</div>}
      </div>
      <p className="command-hint">
        ↑↓ {t("select")} · Enter {t("open") || "Open"} · Esc {t("close")}
      </p>
    </>
  );
}

function Markup({ html }: { html: string }) {
  return <span className="legacy-markup" dangerouslySetInnerHTML={{ __html: html }} />;
}
export type { SearchRow, CommandRow };
