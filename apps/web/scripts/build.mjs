import * as esbuild from "esbuild";
import { cp, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const serve = process.argv.includes("--serve");
const out = root + "dist";

if (!serve) await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await cp(root + "public", out, { recursive: true });

const ctx = await esbuild.context({
  entryPoints: { app: root + "src/main.ts", style: root + "src/style.css" },
  bundle: true,
  format: "esm",
  target: "es2020",
  minify: !serve,
  sourcemap: serve,
  outdir: out,
  alias: {
    "@yangi-alifbo/core": root + "../../packages/core/src/index.ts",
    "@yangi-alifbo/office": root + "../../packages/office/src/index.ts",
  },
  logLevel: "info",
});

if (serve) {
  await ctx.watch();
  const { port } = await ctx.serve({ servedir: out, port: 5173 });
  console.log(`http://localhost:${port}`);
} else {
  await ctx.rebuild();
  await ctx.dispose();
}
