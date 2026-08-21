import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/App";
import { loadDevTools } from "@/dev-tools";
import "@/index.css";

if (import.meta.env.DEV) {
  loadDevTools().catch((error: unknown) => {
    console.error("react-grab did not load", error);
  });
}

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
