import { useRef, useState } from "react";

interface Option { value: string | number; label: string }
interface EditorField { name: string; value: string | number; type: string; label: string; options?: Option[]; full?: boolean; required?: boolean; maxLength?: number; min?: number; step?: number }
interface CheckItem { name: string; label: string; checked: boolean; value?: string | number }
interface CheckSection { key: string; label?: string; full?: boolean; items: CheckItem[] }
interface RelatedAction { key: string; label: string; action: string; value?: string; type?: string; id?: string }
interface Props { fields: EditorField[]; checks?: CheckSection[]; related?: RelatedAction[]; eventNote?: string; canDelete: boolean; canPreview: boolean; renderPreview?: (value: string) => string; label: (key: string) => string }

export function LegacyItemEditor({ fields, checks = [], related = [], eventNote, canDelete, canPreview, renderPreview, label: t }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [previewHtml, setPreviewHtml] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const preview = () => {
    const body = String(new FormData(formRef.current || undefined).get("body") || "");
    setPreviewHtml(renderPreview?.(body) || body);
    requestAnimationFrame(() => previewRef.current?.scrollIntoView({ block: "nearest" }));
  };
  return <form id="item-form" ref={formRef}><div className="form-grid">{fields.map((field) => <Field value={field} key={field.name} />)}{checks.map((section) => <div className={`field ${section.full ? "full" : ""}`} key={section.key}>{section.label && <label>{section.label}</label>}<div className="actions" style={{ flexWrap: "wrap" }}>{section.items.map((item) => <label className="check-field" key={`${item.name}-${item.value || item.label}`}><input type="checkbox" name={item.name} value={item.value} defaultChecked={item.checked} />{item.label}</label>)}</div></div>)}</div>{eventNote && <p className="form-note">{eventNote}</p>}{related.length > 0 && <div className="form-links">{related.map((item) => <button type="button" className="text-btn" data-action={item.action} data-value={item.value} data-type={item.type} data-id={item.id} key={item.key}><span>{item.label}</span></button>)}</div>}<p className="form-error" role="alert" />{previewHtml && <div id="note-preview" className="md" ref={previewRef} dangerouslySetInnerHTML={{ __html: previewHtml }} />}{confirmDelete && <div className="error-banner">{t("deleteAsk")}<div className="actions"><button type="button" className="btn danger" data-action="confirm-delete"><span>{t("delete")}</span></button><button type="button" className="btn" onClick={() => setConfirmDelete(false)}><span>{t("cancel")}</span></button></div></div>}<div className="form-footer">{canDelete && <button type="button" className="btn danger" onClick={() => setConfirmDelete(true)}><span>{t("delete")}</span></button>}{canPreview && <button type="button" className="btn" onClick={preview}><span>{t("preview")}</span></button>}<button type="button" className="btn" data-action="close"><span>{t("cancel")}</span></button><button type="submit" className="btn primary">{t("save")}</button></div></form>;
}

function Field({ value: field }: { value: EditorField }) {
  const id = `field-${field.name}`;
  const className = `field ${field.full ? "full" : ""}`;
  if (field.type === "textarea") return <div className={className}><label htmlFor={id}>{field.label}</label><textarea id={id} name={field.name} required={field.required} maxLength={field.maxLength || 50000} defaultValue={field.value} /></div>;
  if (field.type === "select") return <div className={className}><label htmlFor={id}>{field.label}</label><select id={id} name={field.name} required={field.required} defaultValue={String(field.value)}>{field.options?.map((option) => <option value={option.value} key={String(option.value)}>{option.label}</option>)}</select></div>;
  return <div className={className}><label htmlFor={id}>{field.label}</label><input id={id} name={field.name} type={field.type} required={field.required} maxLength={field.maxLength} min={field.min} step={field.step} defaultValue={field.value} /></div>;
}

export type { EditorField, CheckSection, RelatedAction };
