import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";
import { type JSX, useEffect, useRef } from "react";
import type { CanvasLink, CanvasNode } from "@/types/canvas-graph";

const TONE_COLORS: Record<CanvasNode["tone"], string> = {
  dangling: "#7a7f8c",
  duplicate: "#e0603a",
  plain: "#5b8def",
  selected: "#f5c542",
  water: "#8f6bd6",
};

const LABEL_ZOOM = 1.4;
const MAX_LABELS = 120;

type Placed = CanvasNode & SimulationNodeDatum;
type Wired = SimulationLinkDatum<Placed> & { strength: number };

type Props = {
  links: CanvasLink[];
  nodes: CanvasNode[];
  onPick: (id: string) => void;
};

type View = {
  scale: number;
  x: number;
  y: number;
};

const draw = (
  canvas: HTMLCanvasElement,
  placed: Placed[],
  wired: Wired[],
  view: View,
): void => {
  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  const ratio = window.devicePixelRatio || 1;
  context.save();
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.scale(ratio, ratio);
  context.translate(view.x, view.y);
  context.scale(view.scale, view.scale);

  context.lineWidth = 1 / view.scale;
  for (const link of wired) {
    const from = link.source as Placed;
    const to = link.target as Placed;
    context.strokeStyle = `rgba(140, 150, 170, ${0.15 + link.strength * 0.5})`;
    context.beginPath();
    context.moveTo(from.x ?? 0, from.y ?? 0);
    context.lineTo(to.x ?? 0, to.y ?? 0);
    context.stroke();
  }

  for (const node of placed) {
    context.fillStyle = TONE_COLORS[node.tone];
    context.beginPath();
    context.arc(node.x ?? 0, node.y ?? 0, node.radius, 0, Math.PI * 2);
    context.fill();
  }

  if (view.scale >= LABEL_ZOOM || placed.length <= MAX_LABELS) {
    context.fillStyle = "#dfe3ec";
    context.font = `${11 / view.scale}px ui-sans-serif, system-ui, sans-serif`;
    for (const node of placed.slice(0, MAX_LABELS)) {
      context.fillText(
        node.label,
        (node.x ?? 0) + node.radius + 3 / view.scale,
        (node.y ?? 0) + 3 / view.scale,
      );
    }
  }

  context.restore();
};

const nearest = (
  placed: Placed[],
  pointX: number,
  pointY: number,
): Placed | undefined => {
  let best: Placed | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const node of placed) {
    const dx = (node.x ?? 0) - pointX;
    const dy = (node.y ?? 0) - pointY;
    const distance = dx * dx + dy * dy;
    if (distance < bestDistance && distance <= (node.radius + 6) ** 2) {
      best = node;
      bestDistance = distance;
    }
  }

  return best;
};

/**
 * Canvas rather than SVG, and a simulation that is stopped rather than looped
 * forever: a universe of thousands of nodes has to open, not crawl.
 */
export const GraphCanvas = ({ links, nodes, onPick }: Props): JSX.Element => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewRef = useRef<View>({ scale: 1, x: 0, y: 0 });
  const placedRef = useRef<Placed[]>([]);
  const wiredRef = useRef<Wired[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }

    const resize = (): void => {
      const ratio = window.devicePixelRatio || 1;
      const box = canvas.getBoundingClientRect();
      canvas.width = box.width * ratio;
      canvas.height = box.height * ratio;
      viewRef.current = {
        ...viewRef.current,
        x: box.width / 2,
        y: box.height / 2,
      };
    };

    resize();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }

    const placed: Placed[] = nodes.map((node) => ({ ...node }));
    const byId = new Map(placed.map((node) => [node.id, node]));
    const wired: Wired[] = links
      .filter((link) => byId.has(link.source) && byId.has(link.target))
      .map((link) => ({
        source: link.source,
        strength: link.strength,
        target: link.target,
      }));

    placedRef.current = placed;
    wiredRef.current = wired;

    const simulation = forceSimulation(placed)
      .force(
        "link",
        forceLink<Placed, Wired>(wired)
          .id((node) => node.id)
          .distance(40)
          .strength((link) => Math.min(1, link.strength)),
      )
      .force("charge", forceManyBody<Placed>().strength(-60).distanceMax(400))
      .force("center", forceCenter(0, 0))
      .force(
        "collide",
        forceCollide<Placed>((node) => node.radius + 2),
      )
      .alphaDecay(0.05)
      .on("tick", () => {
        draw(canvas, placed, wired, viewRef.current);
      });

    return () => {
      simulation.stop();
    };
  }, [links, nodes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }

    const toWorld = (event: MouseEvent | WheelEvent): [number, number] => {
      const box = canvas.getBoundingClientRect();
      const view = viewRef.current;
      return [
        (event.clientX - box.left - view.x) / view.scale,
        (event.clientY - box.top - view.y) / view.scale,
      ];
    };

    const redraw = (): void => {
      draw(canvas, placedRef.current, wiredRef.current, viewRef.current);
    };

    let dragging = false;
    let moved = false;

    const onWheel = (event: WheelEvent): void => {
      event.preventDefault();
      const view = viewRef.current;
      const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
      const box = canvas.getBoundingClientRect();
      const pointX = event.clientX - box.left;
      const pointY = event.clientY - box.top;
      viewRef.current = {
        scale: Math.min(8, Math.max(0.1, view.scale * factor)),
        x: pointX - (pointX - view.x) * factor,
        y: pointY - (pointY - view.y) * factor,
      };
      redraw();
    };

    const onDown = (): void => {
      dragging = true;
      moved = false;
    };

    const onMove = (event: MouseEvent): void => {
      if (!dragging) {
        return;
      }
      moved = true;
      const view = viewRef.current;
      viewRef.current = {
        ...view,
        x: view.x + event.movementX,
        y: view.y + event.movementY,
      };
      redraw();
    };

    const onUp = (event: MouseEvent): void => {
      dragging = false;
      if (moved) {
        return;
      }
      const [worldX, worldY] = toWorld(event);
      const hit = nearest(placedRef.current, worldX, worldY);
      if (hit) {
        onPick(hit.id);
      }
    };

    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);

    return () => {
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [onPick]);

  return <canvas className="block h-full w-full cursor-grab" ref={canvasRef} />;
};
