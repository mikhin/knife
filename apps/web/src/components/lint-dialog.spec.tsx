// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LintRunDialog } from "@/components/lint-dialog";

const close = vi.fn<() => void>();

describe("LintRunDialog", () => {
  afterEach(cleanup);

  it("says what the run found and how much of the universe it read", () => {
    render(
      <LintRunDialog
        checked={2265}
        chunksWithNotes={132}
        findings={189}
        onClose={close}
        tools={["vale", "proselint"]}
        total={2265}
      />,
    );

    expect(screen.getByText("189 findings on 132 chunks")).toBeDefined();
    expect(screen.getByText("from vale, proselint")).toBeDefined();
    expect(screen.getByText("read 2265 of 2265 chunks")).toBeDefined();
  });

  it("names the chunk a broken run stopped on", () => {
    render(
      <LintRunDialog
        checked={900}
        chunksWithNotes={40}
        findings={51}
        onClose={close}
        tools={["vale"]}
        total={2265}
      />,
    );

    expect(screen.getByText("stopped after 900 of 2265 chunks")).toBeDefined();
  });
});
