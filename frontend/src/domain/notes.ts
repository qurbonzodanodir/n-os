import type { Note } from "../types";

export interface NoteHit {
  note: Note;
  score: number;
  snippet: string;
}

export interface Segment {
  text: string;
  match: boolean;
}

const terms = (query: string) => query.toLowerCase().split(/\s+/).filter(Boolean);

const SNIPPET = 140;

function snippetAround(body: string, words: string[]): string {
  const flat = body.replace(/\s+/g, " ").trim();
  const lower = flat.toLowerCase();
  const at = words
    .map((word) => lower.indexOf(word))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0];
  if (at === undefined || at < SNIPPET / 3) return flat.slice(0, SNIPPET);
  const start = Math.max(0, at - 40);
  return `…${flat.slice(start, start + SNIPPET)}`;
}

/** Every word must appear somewhere; title matches rank above tags, folder and body. */
export function searchNotes(notes: Note[], query: string): NoteHit[] {
  const words = terms(query);
  if (!words.length) return notes.map((note) => ({ note, score: 0, snippet: note.body.replace(/\s+/g, " ").trim().slice(0, SNIPPET) }));
  const hits: NoteHit[] = [];
  for (const note of notes) {
    const title = note.title.toLowerCase();
    const tags = (note.tags || "").toLowerCase();
    const folder = (note.folder || "").toLowerCase();
    const body = note.body.toLowerCase();
    let score = 0;
    let all = true;
    for (const word of words) {
      const here =
        (title.includes(word) ? 5 : 0) + (tags.includes(word) ? 3 : 0) + (folder.includes(word) ? 2 : 0) + (body.includes(word) ? 1 : 0);
      if (!here) {
        all = false;
        break;
      }
      score += here + (title.startsWith(word) ? 2 : 0);
    }
    if (all) hits.push({ note, score: score + (note.pinned ? 1 : 0), snippet: snippetAround(note.body, words) });
  }
  return hits.sort((a, b) => b.score - a.score);
}

/** Splits text into plain and matching parts so the UI can wrap matches without using HTML. */
export function highlight(text: string, query: string): Segment[] {
  const words = [...new Set(terms(query))].sort((a, b) => b.length - a.length).map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!words.length) return [{ text, match: false }];
  const pattern = new RegExp(`(${words.join("|")})`, "gi");
  // split() with a capture group puts matches at odd indexes, including when the text starts with a match.
  return text
    .split(pattern)
    .map((part, index) => ({ text: part, match: index % 2 === 1 }))
    .filter((segment) => segment.text);
}

const LINK = /\[\[([^\]|\n]+)(?:\|([^\]\n]+))?\]\]/g;

/** Titles referenced as [[Title]] or [[Title|label]]. */
export function linkedTitles(body: string): string[] {
  return [...body.matchAll(LINK)].map((match) => match[1].trim());
}

export const WIKI_LINK = LINK;

const sameTitle = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export function findNoteByTitle(notes: Note[], title: string): Note | undefined {
  return notes.find((note) => sameTitle(note.title, title));
}

export function outgoingLinks(notes: Note[], note: Note): Note[] {
  const seen = new Set<string>();
  return linkedTitles(note.body)
    .map((title) => findNoteByTitle(notes, title))
    .filter((target): target is Note => !!target && target.id !== note.id && !seen.has(target.id) && !!seen.add(target.id));
}

export function backlinks(notes: Note[], note: Note): Note[] {
  return notes.filter((other) => other.id !== note.id && linkedTitles(other.body).some((title) => sameTitle(title, note.title)));
}
