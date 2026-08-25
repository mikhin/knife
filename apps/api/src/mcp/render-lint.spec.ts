import { describe, expect, it } from "vitest";
import { renderLint } from "@/mcp/render-lint";
import type { LintRun } from "@/mcp/render-lint";

const run = (over: Partial<LintRun> = {}): LintRun => ({
  available: true,
  checked: 120,
  flagged: 1,
  listed: [
    {
      id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
      notes: [
        {
          message: '"very" is a weasel word',
          rule: "write-good",
          severity: "warning",
          tool: "textlint",
        },
      ],
      text: "A very good rule.",
    },
  ],
  project: "night-audit",
  remarks: 1,
  size: 120,
  tools: ["harper", "textlint", "vale"],
  ...over,
});

describe("renderLint", () => {
  it("gathers what was written under the chunk it was written on", () => {
    const text = renderLint(run());

    expect(text).toContain(
      "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d  A very good rule.",
    );
    expect(text).toContain(
      'warning  textlint/write-good  "very" is a weasel word',
    );
  });

  /** A pass reads the whole universe; saying so is how anyone knows it did. */
  it("says the linters read every chunk, and by what", () => {
    const text = renderLint(run());

    expect(text).toContain("The linters read all 120 chunks.");
    expect(text).toContain("Tools: harper, textlint, vale.");
  });

  it("counts the flagged chunks that did not fit", () => {
    const text = renderLint(run({ flagged: 9, remarks: 34 }));

    expect(text).toContain("34 remarks on 9 chunks, 1 listed, 8 not listed.");
  });

  it("counts one remark as one", () => {
    expect(renderLint(run())).toContain("1 remark on 1 chunk.");
  });

  /** Silence from an offline linter would read as a clean universe. */
  it("says the linters are offline instead of passing the universe as clean", () => {
    const text = renderLint(
      run({
        available: false,
        checked: 0,
        flagged: 0,
        listed: [],
        reason: "connect ECONNREFUSED",
        remarks: 0,
        tools: [],
      }),
    );

    expect(text).toContain(
      "The linters are offline: connect ECONNREFUSED. Nothing was read.",
    );
  });

  it("says how far a pass got when the linters went away mid-universe", () => {
    const text = renderLint(
      run({ checked: 500, reason: "HTTP 502", size: 12480 }),
    );

    expect(text).toContain(
      "The linters read 500 of 12480 chunks before stopping: HTTP 502.",
    );
  });

  it("says a universe nothing was written on is clean", () => {
    const text = renderLint(run({ flagged: 0, listed: [], remarks: 0 }));

    expect(text).toContain("Nothing was written on.");
  });
});
