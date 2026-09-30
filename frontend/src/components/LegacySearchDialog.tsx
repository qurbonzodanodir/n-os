import { useState } from "react";

interface SearchRow { id: string; type: string; title: string; searchable: string; iconName: string }
interface Props { rows: SearchRow[]; label: (key: string) => string; icon: (key: string) => string }

export function LegacySearchDialog({ rows, label: t, icon }: Props) {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();
  const matches = rows.filter((row) => !normalized || row.searchable.includes(normalized)).slice(0, 25);
  return <><input className="search-input" id="global-search" aria-label={t("search")} placeholder={t("search")} value={query} onChange={(event) => setQuery(event.target.value)} /><div id="search-results">{matches.map((row) => <button type="button" className="search-result" data-action="detail" data-type={row.type} data-id={row.id} key={`${row.type}-${row.id}`}><Markup html={icon(row.iconName)} /><span><strong>{row.title}</strong></span><small>{t(row.type)}</small></button>)}{!matches.length && <div className="empty">{t("noResults")}</div>}</div></>;
}

function Markup({ html }: { html: string }) { return <span className="legacy-markup" dangerouslySetInnerHTML={{ __html: html }} />; }
export type { SearchRow };
