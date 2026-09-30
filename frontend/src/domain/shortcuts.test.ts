import { describe, expect, it } from "vitest";
import { resolveShortcut, type KeyInput } from "./shortcuts";

const key = (value: string, extra: Partial<KeyInput> = {}): KeyInput => ({
  key: value,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  typing: false,
  dialogOpen: false,
  ...extra,
});

describe("resolveShortcut", () => {
  it("maps single keys to actions", () => {
    expect(resolveShortcut(false, key("n"))).toEqual({ action: { type: "new-task" }, pending: false });
    expect(resolveShortcut(false, key("J"))).toEqual({ action: { type: "next" }, pending: false });
    expect(resolveShortcut(false, key("?"))).toEqual({ action: { type: "help" }, pending: false });
  });

  it("supports two-key navigation and forgets unknown follow-ups", () => {
    const first = resolveShortcut(false, key("g"));
    expect(first).toEqual({ pending: true });
    expect(resolveShortcut(first.pending, key("f"))).toEqual({ action: { type: "view", value: "finance" }, pending: false });
    expect(resolveShortcut(true, key("z"))).toEqual({ pending: false });
  });

  it("stays out of the way while typing, in dialogs and with modifiers", () => {
    expect(resolveShortcut(false, key("n", { typing: true }))).toEqual({ pending: false });
    expect(resolveShortcut(false, key("n", { dialogOpen: true }))).toEqual({ pending: false });
    expect(resolveShortcut(false, key("n", { metaKey: true }))).toEqual({ pending: false });
    expect(resolveShortcut(true, key("t", { typing: true }))).toEqual({ pending: false });
  });
});
