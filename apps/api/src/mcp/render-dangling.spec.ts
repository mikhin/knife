import { describe, expect, it } from "vitest";
import { renderDangling } from "@/mcp/render-dangling";
import type { DanglingReport } from "@/mcp/render-dangling";

const report = (over: Partial<DanglingReport> = {}): DanglingReport => ({
  hanging: 1,
  listed: [
    {
      id: "c3d4e5f6-7a8b-4c9d-8e1f-2a3b4c5d6e7f",
      text: "Peacocks in the orangery are counted at dawn.",
    },
  ],
  project: "night-audit",
  size: 12480,
  ...over,
});

describe("renderDangling", () => {
  it("puts the text next to the id it hangs under", () => {
    const text = renderDangling(report());

    expect(text).toContain("c3d4e5f6-7a8b-4c9d-8e1f-2a3b4c5d6e7f");
    expect(text).toContain("Peacocks in the orangery are counted at dawn.");
  });

  /**
   * Without its reason the list reads as a verdict, and a chunk that hangs
   * is as often the only place something is said as it is a leftover.
   */
  it("says what hanging means before naming anything", () => {
    expect(renderDangling(report())).toContain(
      "A chunk hangs when not one of its words appears anywhere else in this universe.",
    );
  });

  it("counts one hanging chunk as one", () => {
    expect(renderDangling(report())).toContain("1 chunk hangs.");
  });

  it("counts the chunks that did not fit rather than passing over them", () => {
    expect(renderDangling(report({ hanging: 34 }))).toContain(
      "34 chunks hang, 1 listed, 33 not listed.",
    );
  });

  it("says a universe with nothing hanging is whole", () => {
    const text = renderDangling(report({ hanging: 0, listed: [] }));

    expect(text).toContain(
      "Nothing hangs: every chunk shares a word with another.",
    );
  });
});
