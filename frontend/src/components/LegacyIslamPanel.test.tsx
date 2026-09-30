import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LegacyIslamPanel } from "./LegacyIslamPanel";

const common = { learned: 1, surahCount: 3, label: (key: string) => key, icon: () => "<svg></svg>" };
describe("LegacyIslamPanel", () => {
  it("keeps prayer controls available", () => {
    const history = { title: "history", subtitle: "30 days", total: 1, cells: [{ date: "2026-09-30", title: "today", level: .2 }] };
    const html = renderToStaticMarkup(<LegacyIslamPanel {...common} tab="prayer" prayer={{ state: "ready", nextName: "Asr", nextDescription: "16:00", city: "Dushanbe", hijri: "date", reminderMinutes: 15, notifications: true, cards: [{ key: "Asr", name: "Asr", time: "16:00", done: false, iconName: "islam" }], history }} />);
    expect(html).toContain('data-action="islam-tab"');
    expect(html).toContain('id="prayer-reminder"');
    expect(html).toContain('data-action="prayer-check"');
    expect(html).toContain('data-action="prayer-notifications"');
  });

  it("keeps surah and azkar actions available", () => {
    const surahs = renderToStaticMarkup(<LegacyIslamPanel {...common} tab="surahs" surahs={{ basmala: { arabic: "بسم", tajik: "text", russian: "text" }, note: "note", items: [{ id: "one", number: 1, name: "One", arabicName: "ا", verses: 1, learned: true }] }} />);
    expect(surahs).toContain('data-action="open-surah"');
    const history = { title: "history", subtitle: "30 days", total: 0, cells: [] };
    const azkar = renderToStaticMarkup(<LegacyIslamPanel {...common} tab="azkar" azkar={{ categories: [{ id: "morning", name: "Morning", active: true }], completed: 0, total: 1, history, items: [{ id: "z", target: 3, count: 1, percent: 33, complete: false, arabic: "ا", tajik: "text", russian: "text" }] }} />);
    expect(azkar).toContain('data-action="zikr-category"');
    expect(azkar).toContain('data-action="zikr-count"');
    expect(azkar).toContain('data-action="zikr-reset"');
  });
});
