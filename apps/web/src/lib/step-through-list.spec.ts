// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { stepThroughList } from "@/lib/step-through-list";

const rows = (): HTMLButtonElement[] => {
  document.body.innerHTML = `
    <ul>
      <li><button data-row type="button">one</button><button type="button">edit</button></li>
      <li><button data-row type="button">two</button><button type="button">edit</button></li>
      <li><button data-row type="button">three</button><button type="button">edit</button></li>
      <li>4 more not listed</li>
    </ul>`;
  return [...document.querySelectorAll<HTMLButtonElement>("button[data-row]")];
};

const focused = (): string => document.activeElement?.textContent ?? "";

describe("stepThroughList", () => {
  it("walks the rows, not the buttons that act on them", () => {
    const list = rows();
    stepThroughList(list[0] as HTMLElement, "ArrowDown");

    expect(focused()).toBe("two");
  });

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
