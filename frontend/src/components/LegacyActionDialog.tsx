interface Action {
  key: string;
  label: string;
  action: string;
  primary?: boolean;
}
interface Props {
  message: string;
  note?: string;
  actions: Action[];
}

export function LegacyActionDialog({ message, note, actions }: Props) {
  return (
    <>
      <p>{message}</p>
      {note && <p className="form-note">{note}</p>}
      <div className="form-footer">
        {actions.map((item) => (
          <button type="button" className={`btn ${item.primary ? "primary" : ""}`} data-action={item.action} key={item.key}>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </>
  );
}

export type { Action };
