import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LegacySurahReader } from "./LegacySurahReader";

describe("LegacySurahReader", () => {
  it("renders multilingual verses and learned action", () => {
    const html = renderToStaticMarkup(
      <LegacySurahReader
        verses={[{ arabic: "ا", tajik: "tajik", russian: "russian" }]}
        learned={false}
        note="note"
        label={(key) => key}
        surahId="one"
        icon={() => "<svg></svg>"}
      />,
    );
    expect(html).toContain('dir="rtl"');
    expect(html).toContain("tajik");
    expect(html).toContain("russian");
    expect(html).toContain('data-action="surah-learned"');
    expect(html).toContain('data-value="one"');
  });
});
