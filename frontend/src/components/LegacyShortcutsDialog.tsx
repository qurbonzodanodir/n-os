import { shortcutList } from "../domain/shortcuts";

interface Props {
  label: (key: string) => string;
}

export function LegacyShortcutsDialog({ label: t }: Props) {
  return (
    <dl className="shortcut-list">
      {shortcutList.map((item) => (
        <div key={item.label}>
          <dt>
            <kbd>{item.keys}</kbd>
          </dt>
          <dd>{t(item.label)}</dd>
        </div>
      ))}
    </dl>
  );
}
