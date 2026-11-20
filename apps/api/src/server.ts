import http from "node:http";
import { timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
import {
  convertWithReport, detectScript, normalizeForSearch, toOldLatin, type ConvertOptions,
} from "@yangi-alifbo/core";
import { convertOfficeFile, MIME } from "@yangi-alifbo/office";
import { openapi } from "./openapi.js";

export interface ServerConfig {
  /** Ruxsat etilgan API kalitlari. Boʻsh boʻlsa autentifikatsiya oʻchirilgan. */
  apiKeys: string[];
  /** Maksimal soʻrov hajmi (bayt). */
  maxBody: number;
  /** CORS uchun ruxsat etilgan origin ("*" yoki aniq manzil). Boʻsh — CORS yoʻq. */
  corsOrigin?: string;
  /** Bitta JSON soʻrovdagi maksimal matnlar soni. */
  maxBatch: number;
  /** Web ilova fayllari papkasi ("/" da beriladi). Ixtiyoriy. */
  staticDir?: string;
}

const STATIC_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".png": "image/png", ".svg": "image/svg+xml", ".json": "application/json", ".ico": "image/x-icon",
};

async function serveStatic(dir: string, path: string, res: http.ServerResponse): Promise<boolean> {
  const root = resolve(dir);
  const file = resolve(join(root, path === "/" ? "index.html" : decodeURIComponent(path)));
  if (!file.startsWith(root + sep)) return false;
  try {
    const data = await readFile(file);
    res.writeHead(200, {
      "Content-Type": STATIC_TYPES[extname(file)] ?? "application/octet-stream",
      "Content-Length": data.length,
      "Cache-Control": file.endsWith(".html") ? "no-cache" : "public, max-age=3600",
    });
    res.end(data);
    return true;
  } catch {
    return false;
  }
}

export const VERSION = "0.1.0";

class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

const ALLOWED_OPTIONS = new Set(["from", "normalizeTutuq", "protectForeign", "protectedWords", "exceptions", "insertTutuq", "protectSpecial"]);

function pickOptions(raw: unknown): ConvertOptions {
  if (raw == null) return {};
  if (typeof raw !== "object" || Array.isArray(raw)) throw new HttpError(400, "`options` obyekt boʻlishi kerak");
  const o: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!ALLOWED_OPTIONS.has(k)) throw new HttpError(400, `Nomaʼlum sozlama: ${k}`);
    o[k] = v;
  }
  if (o.from !== undefined && !["auto", "latin", "cyrillic"].includes(o.from as string)) {
    throw new HttpError(400, "`from`: auto | latin | cyrillic");
  }
  for (const k of ["protectedWords", "exceptions"]) {
    if (o[k] !== undefined && (!Array.isArray(o[k]) || !(o[k] as unknown[]).every((x) => typeof x === "string"))) {
      throw new HttpError(400, `\`${k}\` satrlar massivi boʻlishi kerak`);
    }
  }
  return o as ConvertOptions;
}

async function readBody(req: http.IncomingMessage, max: number): Promise<Buffer> {
  const len = Number(req.headers["content-length"] ?? 0);
  if (len > max) throw new HttpError(413, `Soʻrov juda katta (maks. ${Math.round(max / 1048576)} MB)`);
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const c of req) {
    size += (c as Buffer).length;
    if (size > max) throw new HttpError(413, `Soʻrov juda katta (maks. ${Math.round(max / 1048576)} MB)`);
    chunks.push(c as Buffer);
  }
  return Buffer.concat(chunks);
}

async function readJson(req: http.IncomingMessage, max: number): Promise<Record<string, unknown>> {
  const ct = req.headers["content-type"] ?? "";
  if (!ct.includes("application/json")) throw new HttpError(415, "Content-Type: application/json kutilgan");
  const buf = await readBody(req, max);
  try {
    const v = JSON.parse(buf.toString("utf8"));
    if (typeof v !== "object" || v === null || Array.isArray(v)) throw new Error();
    return v;
  } catch {
    throw new HttpError(400, "Notoʻgʻri JSON");
  }
}

function send(res: http.ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) {
  const data = Buffer.from(JSON.stringify(body));
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Content-Length": data.length, ...headers });
  res.end(data);
}

function checkAuth(req: http.IncomingMessage, keys: string[]) {
  if (keys.length === 0) return;
  const h = req.headers.authorization;
  const given = (h?.startsWith("Bearer ") ? h.slice(7) : undefined) ?? (req.headers["x-api-key"] as string | undefined);
  if (!given) throw new HttpError(401, "API kalit kerak: Authorization: Bearer <kalit> yoki X-API-Key");
  const g = Buffer.from(given);
  const ok = keys.some((k) => {
    const kb = Buffer.from(k);
    return kb.length === g.length && timingSafeEqual(kb, g);
  });
  if (!ok) throw new HttpError(403, "API kalit notoʻgʻri");
}

const OFFICE_EXT = new Set(["docx", "xlsx", "pptx"]);
const TEXT_EXT = new Set(["txt", "md", "csv", "tsv", "json", "html", "htm", "xml", "srt"]);

function decodeText(b: Buffer): string {
  if (b[0] === 0xff && b[1] === 0xfe) return new TextDecoder("utf-16le").decode(b);
  if (b[0] === 0xfe && b[1] === 0xff) return new TextDecoder("utf-16be").decode(b);
  try { return new TextDecoder("utf-8", { fatal: true }).decode(b); }
  catch { return new TextDecoder("windows-1251").decode(b); }
}

/** RFC 5987 — fayl nomida oʻzbekcha harflar boʻlishi mumkin. */
const contentDisposition = (name: string) =>
  `attachment; filename="${name.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "")}"; filename*=UTF-8''${encodeURIComponent(name)}`;

export function createServer(cfg: ServerConfig) {
  const cors: Record<string, string> = cfg.corsOrigin
    ? {
        "Access-Control-Allow-Origin": cfg.corsOrigin,
        "Access-Control-Allow-Headers": "Authorization, X-API-Key, Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Expose-Headers": "X-Words-Changed, X-Warnings, Content-Disposition",
      }
    : {};

  return http.createServer(async (req, res) => {
    const started = Date.now();
    const url = new URL(req.url ?? "/", "http://localhost");
    const path = url.pathname.replace(/\/+$/, "") || "/";
    for (const [k, v] of Object.entries(cors)) res.setHeader(k, v);
    res.setHeader("X-Content-Type-Options", "nosniff");

    try {
      if (req.method === "OPTIONS") { res.writeHead(204).end(); return; }

      if (req.method === "GET" && path === "/health") return send(res, 200, { status: "ok", version: VERSION });
      if (req.method === "GET" && (path === "/openapi.json" || path === "/v1/openapi.json")) return send(res, 200, openapi);

      if (!path.startsWith("/v1/")) {
        if (req.method === "GET" && cfg.staticDir && (await serveStatic(cfg.staticDir, path, res))) return;
        throw new HttpError(404, "Topilmadi");
      }
      checkAuth(req, cfg.apiKeys);
      if (req.method !== "POST") throw new HttpError(405, "Faqat POST");

      switch (path) {
        case "/v1/convert": {
          const body = await readJson(req, cfg.maxBody);
          const options = pickOptions(body.options);
          const reverse = body.direction === "old";
          if (body.direction !== undefined && body.direction !== "new" && body.direction !== "old") {
            throw new HttpError(400, "`direction`: new | old");
          }
          const one = (t: unknown) => {
            if (typeof t !== "string") throw new HttpError(400, "`text` satr boʻlishi kerak");
            if (reverse) { const r = toOldLatin(t); return { text: r, changes: r === t ? 0 : 1, warnings: [] }; }
            return convertWithReport(t, options);
          };
          if (Array.isArray(body.texts)) {
            if (body.texts.length > cfg.maxBatch) throw new HttpError(400, `Bitta soʻrovda maks. ${cfg.maxBatch} ta matn`);
            return send(res, 200, { results: body.texts.map(one) });
          }
          if (body.text === undefined) throw new HttpError(400, "`text` yoki `texts` kerak");
          return send(res, 200, one(body.text));
        }

        case "/v1/normalize": {
          const body = await readJson(req, cfg.maxBody);
          if (Array.isArray(body.texts)) {
            if (body.texts.length > cfg.maxBatch) throw new HttpError(400, `Bitta soʻrovda maks. ${cfg.maxBatch} ta matn`);
            if (!body.texts.every((t) => typeof t === "string")) throw new HttpError(400, "`texts` satrlar massivi boʻlishi kerak");
            return send(res, 200, { results: (body.texts as string[]).map(normalizeForSearch) });
          }
          if (typeof body.text !== "string") throw new HttpError(400, "`text` satr boʻlishi kerak");
          return send(res, 200, { text: normalizeForSearch(body.text) });
        }

        case "/v1/detect": {
          const body = await readJson(req, cfg.maxBody);
          if (typeof body.text !== "string") throw new HttpError(400, "`text` satr boʻlishi kerak");
          return send(res, 200, { script: detectScript(body.text) });
        }

        case "/v1/convert/file": {
          const filename = url.searchParams.get("filename") ?? (req.headers["x-filename"] as string | undefined);
          if (!filename) throw new HttpError(400, "`filename` parametri kerak: /v1/convert/file?filename=hujjat.docx");
          const ext = (filename.split(".").pop() ?? "").toLowerCase();
          let options: ConvertOptions = {};
          const rawOpts = url.searchParams.get("options");
          if (rawOpts) {
            try { options = pickOptions(JSON.parse(rawOpts)); }
            catch (e) { throw e instanceof HttpError ? e : new HttpError(400, "`options` notoʻgʻri JSON"); }
          }
          const buf = await readBody(req, cfg.maxBody);
          if (buf.length === 0) throw new HttpError(400, "Fayl boʻsh");
          const outName = filename.replace(/(\.[^.]+)?$/, (m) => ".yangi" + m);

          if (OFFICE_EXT.has(ext)) {
            let r;
            try { r = await convertOfficeFile(buf, options); }
            catch { throw new HttpError(422, "Faylni oʻqib boʻlmadi — DOCX/XLSX/PPTX emas yoki shikastlangan"); }
            res.writeHead(200, {
              "Content-Type": MIME[r.report.kind],
              "Content-Length": r.data.length,
              "Content-Disposition": contentDisposition(outName),
              "X-Words-Changed": String(r.report.words),
              "X-Warnings": String(r.report.warnings.length),
            });
            res.end(r.data);
            return;
          }
          if (TEXT_EXT.has(ext)) {
            const r = convertWithReport(decodeText(buf), options);
            const data = Buffer.from(r.text, "utf8");
            res.writeHead(200, {
              "Content-Type": "text/plain; charset=utf-8",
              "Content-Length": data.length,
              "Content-Disposition": contentDisposition(outName),
              "X-Words-Changed": String(r.changes),
              "X-Warnings": String(r.warnings.length),
            });
            res.end(data);
            return;
          }
          throw new HttpError(415, `Qoʻllab-quvvatlanmaydigan format: .${ext}`);
        }

        default:
          throw new HttpError(404, "Topilmadi");
      }
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      if (status === 500) console.error(e);
      if (!res.headersSent) send(res, status, { error: e instanceof HttpError ? e.message : "Ichki xatolik" });
      else res.destroy();
    } finally {
      if (process.env.LOG !== "0") {
        res.on("finish", () =>
          console.log(`${new Date().toISOString()} ${req.method} ${path} ${res.statusCode} ${Date.now() - started}ms`),
        );
      }
    }
  });
}
