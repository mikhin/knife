import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: Number(process.env.WEB_PORT ?? 5173),
    proxy: {
      "/api": {
        changeOrigin: true,
        target: process.env.API_URL ?? "http://localhost:3000",
      },
    },
  },
  worker: { format: "es" },
});
