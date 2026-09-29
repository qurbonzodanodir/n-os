import { describe, expect, it } from "vitest";
import { translate } from "./i18n";

describe("translations", () => {
  it("keeps navigation and shell messages paired", () => {
    expect(translate("ru", "tasks")).toBe("Задачи");
    expect(translate("en", "tasks")).toBe("Tasks");
    expect(translate("en", "saveError")).toContain("Could not save");
  });
});
