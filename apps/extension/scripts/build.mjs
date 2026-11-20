import * as esbuild from "esbuild";
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";

const root = fileURLToPath(new URL("..", import.meta.url));
const watch = process.argv.includes("--watch");
const zip = process.argv.includes("--zip");
const out = root + "dist";

if (!watch) await rm(out, { recursive: true, force: true });
await mkdir(out + "/icons", { recursive: true });
await cp(root + "public", out, { recursive: true });
for (const s of [16, 32, 48, 128]) await cp(`${root}icons/icon-${s}.png`, `${out}/icons/icon-${s}.png`);

// Versiya — package.json dan
const pkg = JSON.parse(await readFile(root + "package.json", "utf8"));
const manifest = JSON.parse(await readFile(root + "public/manifest.json", "utf8"));
manifest.version = pkg.version;
await writeFile(out + "/manifest.json", JSON.stringify(manifest, null, 2));

const ctx = await esbuild.context({
  entryPoints: {
    background: root + "src/background.ts",
    content: root + "src/content.ts",
    popup: root + "src/popup.ts",
  },
  bundle: true,
  format: "iife",
  target: "chrome110",
  minify: !watch,
  outdir: out,
  alias: { "@yangi-alifbo/core": root + "../../packages/core/src/index.ts" },
  logLevel: "info",
});
if (watch) await ctx.watch();
else { await ctx.rebuild(); await ctx.dispose(); }

if (zip) {
  const z = new JSZip();
  const add = async (dir, prefix = "") => {
    for (const name of await readdir(dir)) {
      const p = `${dir}/${name}`;
      if ((await stat(p)).isDirectory()) await add(p, prefix + name + "/");
      else z.file(prefix + name, await readFile(p));
    }
  };
  await add(out);
  const file = `${root}yangi-alifbo-extension-${pkg.version}.zip`;
  await writeFile(file, await z.generateAsync({ type: "uint8array", compression: "DEFLATE" }));
  console.log("Chrome Web Store uchun:", file);
}
