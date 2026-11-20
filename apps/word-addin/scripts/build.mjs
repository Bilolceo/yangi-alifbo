import * as esbuild from "esbuild";
import { cp, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const watch = process.argv.includes("--watch");
const base = process.env.ADDIN_BASE_URL ?? "https://localhost:3000";

await mkdir(root + "dist", { recursive: true });
for (const f of ["taskpane.html", "commands.html", "taskpane.css"]) await cp(root + "src/" + f, root + "dist/" + f);
await cp(root + "assets", root + "dist/assets", { recursive: true });

const ctx = await esbuild.context({
  entryPoints: { taskpane: root + "src/taskpane.ts", commands: root + "src/commands.ts" },
  bundle: true,
  format: "iife",
  target: "es2017",
  minify: !watch,
  sourcemap: watch,
  outdir: root + "dist",
  alias: {
    "@yangi-alifbo/core": root + "../../packages/core/src/index.ts",
    "@yangi-alifbo/office-xml": root + "../../packages/office/src/xml.ts",
  },
  define: { __BASE_URL__: JSON.stringify(base) },
  logLevel: "info",
});
if (watch) await ctx.watch();
else { await ctx.rebuild(); await ctx.dispose(); }
