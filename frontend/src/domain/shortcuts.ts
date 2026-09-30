export type ShortcutAction =
  | { type: "view"; value: string }
  | { type: "new-task" }
  | { type: "focus-quick" }
  | { type: "help" }
  | { type: "next" }
  | { type: "previous" }
  | { type: "complete" }
  | { type: "edit" };

export interface KeyInput {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  /** True while a text field, select or editable element has focus. */
  typing: boolean;
  /** True while a dialog is open. */
  dialogOpen: boolean;
}

/** "g" followed by one of these letters opens a section. */
export const goKeys: Record<string, string> = {
  d: "today",
  t: "tasks",
  c: "calendar",
  h: "habits",
  i: "islam",
  n: "notes",
  g: "goals",
  p: "projects",
  f: "finance",
  r: "review",
  s: "settings",
};

export const shortcutList: Array<{ keys: string; label: string }> = [
  { keys: "⌘K / Ctrl K", label: "commandPalette" },
  { keys: "n", label: "shortcutNewTask" },
  { keys: "/", label: "shortcutQuickAdd" },
  { keys: "g  d t c h i n g p f r s", label: "shortcutGo" },
  { keys: "j / k", label: "shortcutMove" },
  { keys: "x", label: "shortcutComplete" },
  { keys: "e", label: "shortcutEdit" },
  { keys: "?", label: "shortcutHelp" },
];

/**
 * Pure key-to-action mapping for single-key shortcuts. `pending` is true right
 * after "g"; the caller owns the timeout that clears it.
 */
export function resolveShortcut(pending: boolean, input: KeyInput): { action?: ShortcutAction; pending: boolean } {
  if (input.typing || input.dialogOpen || input.ctrlKey || input.metaKey || input.altKey) return { pending: false };
  const key = input.key.length === 1 ? input.key.toLowerCase() : input.key;
  if (pending) return goKeys[key] ? { action: { type: "view", value: goKeys[key] }, pending: false } : { pending: false };
  switch (key) {
    case "g":
      return { pending: true };
    case "n":
      return { action: { type: "new-task" }, pending: false };
    case "/":
      return { action: { type: "focus-quick" }, pending: false };
    case "?":
      return { action: { type: "help" }, pending: false };
    case "j":
      return { action: { type: "next" }, pending: false };
    case "k":
      return { action: { type: "previous" }, pending: false };
    case "x":
      return { action: { type: "complete" }, pending: false };
    case "e":
      return { action: { type: "edit" }, pending: false };
    default:
      return { pending: false };
  }
}
