// Mahalliy HTTPS server (Office add-in'lar faqat HTTPS orqali yuklanadi).
// Sertifikat: `npm run certs` (office-addin-dev-certs) → ~/.office-addin-dev-certs
import https from "node:https";
import { readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const dist = fileURLToPath(new URL("../dist", import.meta.url));
const certDir = join(homedir(), ".office-addin-dev-certs");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml", ".map": "application/json", ".xml": "application/xml" };

const server = https.createServer(
  { key: await readFile(join(certDir, "localhost.key")), cert: await readFile(join(certDir, "localhost.crt")) },
  async (req, res) => {
    const url = new URL(req.url ?? "/", "https://localhost");
    const p = normalize(join(dist, decodeURIComponent(url.pathname)));
    if (!p.startsWith(dist)) { res.writeHead(403).end(); return; }
    try {
      const file = (await stat(p)).isDirectory() ? join(p, "taskpane.html") : p;
      res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream", "Cache-Control": "no-store" });
      res.end(await readFile(file));
    } catch {
      res.writeHead(404).end("Topilmadi");
    }
  },
);
server.listen(3000, () => console.log("Add-in: https://localhost:3000/taskpane.html"));
