import { describe, expect, it } from "vitest";
import { stripInlineMarkup } from "./strip-inline-markup";

describe("stripInlineMarkup", () => {
  it("keeps the words of a link and drops its address", () => {
    expect(stripInlineMarkup("See [the rule](https://example.com/x).")).toBe(
      "See the rule.",
    );
  });

  it("keeps the alt text of an image", () => {
    expect(stripInlineMarkup("![night shift chart](/chart.png)")).toBe(
      "night shift chart",
    );
  });

  it("resolves a reference link to its text", () => {
    expect(stripInlineMarkup("See [the rule][ref] again.")).toBe(
      "See the rule again.",
    );
  });

  it("unwraps emphasis of every weight", () => {
    expect(
      stripInlineMarkup(
        "A **published** _snapshot_ is ***never*** __edited__.",
      ),
    ).toBe("A published snapshot is never edited.");
  });

  it("unwraps strikethrough", () => {
    expect(stripInlineMarkup("The ~~old~~ rule stands.")).toBe(
      "The old rule stands.",
    );
  });

  it("unwraps inline and fenced code spans", () => {
    expect(
      stripInlineMarkup("Call `formatHours()` and ```round()``` once."),
    ).toBe("Call formatHours() and round() once.");
  });

  it("removes html tags and comments", () => {
    expect(
      stripInlineMarkup("A <em>rule</em> stands <!-- for now --> today."),
    ).toBe("A rule stands today.");
  });

  it("removes template shortcodes of a site generator", () => {
    expect(
      stripInlineMarkup("{% sidenote %} The rule stands. {{ author }}"),
    ).toBe("The rule stands.");
  });

  it("collapses runs of whitespace", () => {
    expect(stripInlineMarkup("The   rule\tstands.  ")).toBe("The rule stands.");
  });

  it("leaves plain prose untouched", () => {
    expect(stripInlineMarkup("The night auditor closes the report.")).toBe(
      "The night auditor closes the report.",
    );
  });
});
