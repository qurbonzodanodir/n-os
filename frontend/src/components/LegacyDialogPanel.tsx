interface Props {
  title: string;
  bodyHtml: string;
  closeLabel: string;
  icon: (key: string) => string;
}

export function LegacyDialogPanel({ title, bodyHtml, closeLabel, icon }: Props) {
  return <><header className="dialog-head"><h2 id="dialog-title">{title}</h2><button type="button" className="btn icon-btn" data-action="close" aria-label={closeLabel}><Markup html={icon("close")} /></button></header><div className="dialog-body" dangerouslySetInnerHTML={{ __html: bodyHtml }} /></>;
}

function Markup({ html }: { html: string }) { return <span className="legacy-markup" dangerouslySetInnerHTML={{ __html: html }} />; }
