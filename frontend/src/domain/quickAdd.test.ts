import { describe, expect, it } from "vitest";
import { parseQuickTask } from "./quickAdd";

// 2026-09-30 is a Wednesday.
const context = {
  today: "2026-09-30",
  projects: [
    { id: "p1", title: "Website" },
    { id: "p2", title: "Home Repair" },
  ],
};
const parse = (input: string) => parseQuickTask(input, context);

describe("parseQuickTask", () => {
  it("keeps plain text as the title", () => {
    expect(parse("Buy milk")).toEqual({ title: "Buy milk", tags: [] });
  });

  it("extracts date, time, priority and project in English", () => {
    expect(parse("call Ali tomorrow 18:00 #website !high")).toEqual({
      title: "call Ali",
      date: "2026-10-01",
      time: "18:00",
      priority: "high",
      projectId: "p1",
      tags: [],
    });
  });

  it("understands Russian phrases", () => {
    expect(parse("позвонить маме послезавтра в 9:30 !срочно")).toMatchObject({
      title: "позвонить маме",
      date: "2026-10-02",
      time: "09:30",
      priority: "urgent",
    });
    expect(parse("отчёт через 3 дня")).toMatchObject({ title: "отчёт", date: "2026-10-03" });
    expect(parse("ревью через 2 недели")).toMatchObject({ title: "ревью", date: "2026-10-14" });
  });

  it("resolves weekdays to the next occurrence, never today", () => {
    expect(parse("gym on friday").date).toBe("2026-10-02");
    expect(parse("sync wednesday").date).toBe("2026-10-07");
    expect(parse("встреча в пятницу")).toMatchObject({ title: "встреча", date: "2026-10-02" });
  });

  it("parses explicit dates and rolls past dates into next year", () => {
    expect(parse("pay rent 2026-10-05").date).toBe("2026-10-05");
    expect(parse("pay rent 5.10").date).toBe("2026-10-05");
    expect(parse("birthday 12.03").date).toBe("2027-03-12");
    expect(parse("archive 01.02.2028").date).toBe("2028-02-01");
  });

  it("supports am/pm and rejects impossible times or dates", () => {
    expect(parse("standup at 6pm")).toMatchObject({ title: "standup", time: "18:00" });
    expect(parse("standup 12am").time).toBe("00:00");
    expect(parse("meeting 25:99").time).toBeUndefined();
    expect(parse("meeting 25:99").title).toBe("meeting 25:99");
    expect(parse("odd 31.02").date).toBeUndefined();
  });

  it("matches projects by prefix or hyphenated name and keeps unknown hashtags as tags", () => {
    expect(parse("fix tap #home-repair").projectId).toBe("p2");
    expect(parse("fix tap #hom").projectId).toBe("p2");
    expect(parse("read #book")).toEqual({ tags: ["book"], title: "read" });
  });

  it("does not treat words that merely contain a keyword as commands", () => {
    expect(parse("Todayville report").date).toBeUndefined();
    expect(parse("Submarine!").title).toBe("Submarine!");
  });
});
