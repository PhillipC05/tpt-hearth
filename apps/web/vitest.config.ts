import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    globals: true,
    environment: "node",
    setupFiles: ["./src/app/__tests__/vitest-setup.ts"]
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@tpt-hearth/config": path.resolve(__dirname, "../../packages/config/src/index.ts"),
      "@tpt-hearth/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
      "@tpt-hearth/db": path.resolve(__dirname, "../../packages/db/src/index.ts"),
      "@tpt-hearth/crypto": path.resolve(__dirname, "../../packages/crypto/src/index.ts"),
      "@tpt-hearth/ui": path.resolve(__dirname, "../../packages/ui/src/index.ts")
    }
  }
});