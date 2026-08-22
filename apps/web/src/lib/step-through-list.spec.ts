// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { stepThroughList } from "@/lib/step-through-list";

const rows = (): HTMLButtonElement[] => {
  document.body.innerHTML = `
    <ul>
      <li><button type="button">one</button></li>
      <li><button type="button">two</button></li>
      <li><button type="button">three</button></li>
      <li>4 more not listed</li>
    </ul>`;
  return [...document.querySelectorAll("button")];
};

const focused = (): string => document.activeElement?.textContent ?? "";

describe("stepThroughList", () => {
  it("opens the row below and takes it with the focus", () => {
    const list = rows();
    const opened = vi.fn<() => void>();
    list[1]?.addEventListener("click", opened);

    expect(stepThroughList(list[0] as HTMLElement, "ArrowDown")).toBe(true);

    expect(focused()).toBe("two");
    expect(opened).toHaveBeenCalledOnce();
  });

  it("walks back up", () => {
    const list = rows();
    stepThroughList(list[2] as HTMLElement, "ArrowUp");

    expect(focused()).toBe("two");
  });

  it("stays put at either end", () => {
    const list = rows();
    list[2]?.focus();
    stepThroughList(list[2] as HTMLElement, "ArrowDown");

    expect(focused()).toBe("three");
  });

  it("leaves every other key to whoever wants it", () => {
    expect(stepThroughList(rows()[0] as HTMLElement, "Enter")).toBe(false);
  });
});
