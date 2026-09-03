import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: { target: "safari12" },
  test: { environment: "jsdom", globals: true, setupFiles: "./src/test/setup.ts" },
});
