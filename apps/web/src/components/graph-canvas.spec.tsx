// @vitest-environment happy-dom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GraphCanvas } from "@/components/graph-canvas";
import type { CanvasNode } from "@/types/canvas-graph";

const node: CanvasNode = {
  id: "a",
  label: "A rule",
  radius: 5,
  tone: "plain",
};

const mouse = (type: string): MouseEvent =>
  new MouseEvent(type, { bubbles: true, clientX: 0, clientY: 0 });

describe("GraphCanvas", () => {
  afterEach(cleanup);

  /**
   * The node sits where the simulation starts it, which in an unlaid-out test
   * document is the same point every event reports. So a listener that reacts
   * to the whole window would pick it, and one bound to the canvas will not.
   */
  it("ignores a release of the mouse that happened outside it", () => {
    const onPick = vi.fn<(id: string) => void>();
    render(<GraphCanvas links={[]} nodes={[node]} onPick={onPick} />);

    window.dispatchEvent(mouse("mouseup"));

    expect(onPick).not.toHaveBeenCalled();
  });

  it("picks the node under a click on the canvas", () => {
    const onPick = vi.fn<(id: string) => void>();
    const { container } = render(
      <GraphCanvas links={[]} nodes={[node]} onPick={onPick} />,
    );
    const canvas = container.querySelector("canvas");

    canvas?.dispatchEvent(mouse("click"));

    expect(onPick).toHaveBeenCalledWith("a");
  });

  it("does not pick anything after the canvas was dragged", () => {
    const onPick = vi.fn<(id: string) => void>();
    const { container } = render(
      <GraphCanvas links={[]} nodes={[node]} onPick={onPick} />,
    );
    const canvas = container.querySelector("canvas");

    canvas?.dispatchEvent(mouse("mousedown"));
    window.dispatchEvent(
      new MouseEvent("mousemove", { buttons: 1, clientX: 40, clientY: 40 }),
    );
    canvas?.dispatchEvent(mouse("click"));

    expect(onPick).not.toHaveBeenCalled();
  });
});
