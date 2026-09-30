interface PickerItem { key: string; label: string; action: string; value?: string; iconName: string }
interface Props { items: PickerItem[]; icon: (key: string) => string }

export function LegacyPickerDialog({ items, icon }: Props) {
  return <div className="picker">{items.map((item) => <button type="button" data-action={item.action} data-value={item.value || ""} key={item.key}><Markup html={icon(item.iconName)} /><span>{item.label}</span></button>)}</div>;
}

function Markup({ html }: { html: string }) { return <span className="legacy-markup" dangerouslySetInnerHTML={{ __html: html }} />; }
export type { PickerItem };
