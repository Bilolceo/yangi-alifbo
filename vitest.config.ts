import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@yangi-alifbo/core": r("./packages/core/src/index.ts"),
      "@yangi-alifbo/office": r("./packages/office/src/index.ts"),
    },
  },
  test: { include: ["packages/*/test/**/*.test.ts", "apps/*/test/**/*.test.ts"] },
});
