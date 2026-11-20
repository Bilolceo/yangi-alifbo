// Statik saytni yigʻish: veb-ilova (/) + Word add-in (/addin).
//   SITE_URL=https://user.github.io/yangi-alifbo node scripts/build-site.mjs
// Natija: ./site — istalgan statik hostingga (GitHub Pages, nginx, Docker) joylanadi.
import { execFileSync } from "node:child_process";
import { cp, rm, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const site = (process.env.SITE_URL ?? "https://localhost:3000").replace(/\/+$/, "");
const out = root + "site";

const run = (script, env = {}) =>
  execFileSync(process.execPath, [script], { cwd: root, stdio: "inherit", env: { ...process.env, ...env } });

await rm(out, { recursive: true, force: true });
run("apps/web/scripts/build.mjs");
run("apps/word-addin/scripts/build.mjs", { ADDIN_BASE_URL: site + "/addin" });

await mkdir(out, { recursive: true });
await cp(root + "apps/web/dist", out, { recursive: true });
await cp(root + "apps/word-addin/dist", out + "/addin", { recursive: true });
await writeFile(out + "/.nojekyll", "");
console.log(`\nSayt tayyor: ${out}\n  Veb-ilova: ${site}/\n  Add-in manifest: ${site}/addin/manifest.xml`);
