import * as esbuild from "esbuild";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const watch = process.argv.includes("--watch");
const base = (process.env.ADDIN_BASE_URL ?? "https://localhost:3000").replace(/\/+$/, "");
if (!/^https:\/\//.test(base)) throw new Error("ADDIN_BASE_URL https:// bilan boshlanishi kerak (Office talabi)");

if (!watch) await rm(root + "dist", { recursive: true, force: true });
await mkdir(root + "dist", { recursive: true });
for (const f of ["taskpane.html", "commands.html", "taskpane.css"]) await cp(root + "src/" + f, root + "dist/" + f);
await cp(root + "assets", root + "dist/assets", { recursive: true });

// Manifest: localhost manzillari ADDIN_BASE_URL bilan almashtiriladi.
// AppDomain faqat origin (yoʻlsiz) boʻlishi kerak.
const origin = new URL(base).origin;
const manifest = (await readFile(root + "manifest.xml", "utf8"))
  .replace("<AppDomain>https://localhost:3000</AppDomain>", `<AppDomain>${origin}</AppDomain>`)
  .replaceAll("https://localhost:3000", base);
await writeFile(root + "dist/manifest.xml", manifest);

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
