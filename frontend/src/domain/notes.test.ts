import { describe, expect, it } from "vitest";
import type { Note } from "../types";
import { backlinks, highlight, linkedTitles, outgoingLinks, searchNotes } from "./notes";

const note = (id: string, title: string, body = "", extra: Partial<Note> = {}): Note => ({ id, title, body, ...extra });

const notes = [
  note("a", "Trip to Samarkand", "Book the hotel and train tickets. See [[Packing list]]."),
  note("b", "Packing list", "Passport, charger. Part of [[Trip to Samarkand]] and [[Missing note|alias]]", { tags: "travel" }),
  note("c", "Groceries", "milk, bread, a long passport joke", { pinned: true }),
];

describe("searchNotes", () => {
  it("returns everything in order without a query", () => {
    expect(searchNotes(notes, "  ").map((hit) => hit.note.id)).toEqual(["a", "b", "c"]);
  });

  it("requires every word and ranks title matches above body matches", () => {
    // Both only mention it in the body; the pinned note wins the tie.
    expect(searchNotes(notes, "passport").map((hit) => hit.note.id)).toEqual(["c", "b"]);
    expect(searchNotes(notes, "packing").map((hit) => hit.note.id)).toEqual(["b", "a"]);
    expect(searchNotes(notes, "passport joke").map((hit) => hit.note.id)).toEqual(["c"]);
    expect(searchNotes(notes, "samarkand packing").map((hit) => hit.note.id)).toEqual(["b", "a"]);
    expect(searchNotes(notes, "zebra")).toEqual([]);
  });

  it("builds a snippet around the first body match", () => {
    const long = note("l", "Long", `${"filler ".repeat(40)}needle ${"tail ".repeat(40)}`);
    const [hit] = searchNotes([long], "needle");
    expect(hit.snippet.startsWith("…")).toBe(true);
    expect(hit.snippet).toContain("needle");
    expect(hit.snippet.length).toBeLessThanOrEqual(141);
  });
});

describe("highlight", () => {
  it("marks matches case-insensitively and escapes regex characters", () => {
    expect(highlight("Hello World", "world")).toEqual([
      { text: "Hello ", match: false },
      { text: "World", match: true },
    ]);
    expect(highlight("cost (usd)", "(usd")).toEqual([
      { text: "cost ", match: false },
      { text: "(usd", match: true },
      { text: ")", match: false },
    ]);
    expect(highlight("plain", "")).toEqual([{ text: "plain", match: false }]);
    // A match at the very start must not shift which part is marked.
    expect(highlight("Passport renewal", "passport")).toEqual([
      { text: "Passport", match: true },
      { text: " renewal", match: false },
    ]);
  });
});

describe("wiki links", () => {
  it("extracts titles with optional aliases", () => {
    expect(linkedTitles("a [[One]] b [[Two|second]] [[ spaced ]]")).toEqual(["One", "Two", "spaced"]);
  });

  it("finds outgoing links to existing notes only, without duplicates or self-links", () => {
    expect(outgoingLinks(notes, notes[1]).map((item) => item.id)).toEqual(["a"]);
    const selfish = note("s", "Self", "[[Self]] [[Packing list]] [[packing LIST]]");
    expect(outgoingLinks([...notes, selfish], selfish).map((item) => item.id)).toEqual(["b"]);
  });

  it("finds notes that link back, ignoring case", () => {
    expect(backlinks(notes, notes[0]).map((item) => item.id)).toEqual(["b"]);
    expect(backlinks(notes, notes[2])).toEqual([]);
  });
});
