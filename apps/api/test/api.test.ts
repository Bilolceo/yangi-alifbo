import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AddressInfo } from "node:net";
import JSZip from "jszip";
import { createServer } from "../src/server.js";

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
let base = "";
let baseAuth = "";
const servers: ReturnType<typeof createServer>[] = [];

async function start(apiKeys: string[]) {
  process.env.LOG = "0";
  const s = createServer({ apiKeys, maxBody: 1024 * 1024, maxBatch: 3, corsOrigin: "*" });
  servers.push(s);
  await new Promise<void>((r) => s.listen(0, "127.0.0.1", r));
  return `http://127.0.0.1:${(s.address() as AddressInfo).port}`;
}

beforeAll(async () => {
  base = await start([]);
  baseAuth = await start(["maxfiy-kalit"]);
});
afterAll(() => servers.forEach((s) => s.close()));

const post = (url: string, body: unknown, headers: Record<string, string> = {}) =>
  fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });

describe("API", () => {
  it("health", async () => {
    const r = await fetch(base + "/health");
    expect(await r.json()).toMatchObject({ status: "ok" });
  });

  it("convert: bitta matn", async () => {
    const r = await post(base + "/v1/convert", { text: "Oʻzbekiston, Toshkent shahri" });
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ text: "Özbekiston, Toşkent şahri", changes: 3 });
  });

  it("convert: toʻplam va sozlamalar", async () => {
    const r = await post(base + "/v1/convert", { texts: ["choy", "Ўзбек", "Washington"], options: { protectForeign: false } });
    const j = await r.json();
    expect(j.results.map((x: { text: string }) => x.text)).toEqual(["çoy", "Özbek", "Waşington"]);
  });

  it("convert: teskari", async () => {
    const r = await post(base + "/v1/convert", { text: "Özbekiston şahri", direction: "old" });
    expect((await r.json()).text).toBe("Oʻzbekiston shahri");
  });

  it("convert: xatolar", async () => {
    expect((await post(base + "/v1/convert", {})).status).toBe(400);
    expect((await post(base + "/v1/convert", { text: 5 })).status).toBe(400);
    expect((await post(base + "/v1/convert", { text: "a", options: { hack: 1 } })).status).toBe(400);
    expect((await post(base + "/v1/convert", { texts: ["a", "b", "c", "d"] })).status).toBe(400);
    const bad = await fetch(base + "/v1/convert", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" });
    expect(bad.status).toBe(400);
    const big = await post(base + "/v1/convert", { text: "x".repeat(2 * 1024 * 1024) });
    expect(big.status).toBe(413);
    expect((await fetch(base + "/v1/nope", { method: "POST" })).status).toBe(404);
  });

  it("normalize va detect", async () => {
    const n = await (await post(base + "/v1/normalize", { texts: ["oʻzbek", "ўзбек", "ÖZBEK"] })).json();
    expect(new Set(n.results).size).toBe(1);
    const d = await (await post(base + "/v1/detect", { text: "Тошкент шаҳри" })).json();
    expect(d.script).toBe("cyrillic");
  });

  it("convert/file: docx", async () => {
    const zip = new JSZip();
    zip.file("word/document.xml", `<w:document ${W}><w:body><w:p><w:r><w:t>Toshkent shahri</w:t></w:r></w:p></w:body></w:document>`);
    const input = await zip.generateAsync({ type: "uint8array" });
    const r = await fetch(base + "/v1/convert/file?filename=" + encodeURIComponent("buyruq.docx"), { method: "POST", body: input });
    expect(r.status).toBe(200);
    expect(r.headers.get("x-words-changed")).toBe("2");
    expect(r.headers.get("content-disposition")).toContain("buyruq.yangi.docx");
    const out = await JSZip.loadAsync(await r.arrayBuffer());
    expect(await out.file("word/document.xml")!.async("string")).toContain("Toşkent şahri");
  });

  it("convert/file: txt, notoʻgʻri fayllar", async () => {
    const r = await fetch(base + "/v1/convert/file?filename=a.txt", { method: "POST", body: "choy" });
    expect(await r.text()).toBe("çoy");
    expect((await fetch(base + "/v1/convert/file?filename=a.exe", { method: "POST", body: "x" })).status).toBe(415);
    expect((await fetch(base + "/v1/convert/file?filename=a.docx", { method: "POST", body: "x" })).status).toBe(422);
    expect((await fetch(base + "/v1/convert/file", { method: "POST", body: "x" })).status).toBe(400);
  });

  it("autentifikatsiya", async () => {
    expect((await post(baseAuth + "/v1/convert", { text: "a" })).status).toBe(401);
    expect((await post(baseAuth + "/v1/convert", { text: "a" }, { Authorization: "Bearer xato" })).status).toBe(403);
    expect((await post(baseAuth + "/v1/convert", { text: "a" }, { Authorization: "Bearer maxfiy-kalit" })).status).toBe(200);
    expect((await post(baseAuth + "/v1/convert", { text: "a" }, { "X-API-Key": "maxfiy-kalit" })).status).toBe(200);
    expect((await fetch(baseAuth + "/health")).status).toBe(200);
  });
});
