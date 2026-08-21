export type CanvasNode = {
  id: string;
  label: string;
  radius: number;
  tone: "dangling" | "duplicate" | "plain" | "selected" | "water";
};

export type CanvasLink = {
  source: string;
  strength: number;
  target: string;
};
