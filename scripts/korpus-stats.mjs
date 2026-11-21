// Korpus statistikasi — Sankey diagrammasi va aniqlik oʻlchovi uchun.
//   npm run build -w packages/core && node scripts/korpus-stats.mjs [papka]
// Natija: soʻzlar toifalari, harf almashinuvlari, Mermaid sankey-beta CSV.
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildPieces, APOSTROPHES } from "../packages/core/dist/index.js";

const dir = process.argv[2] ?? fileURLToPath(new URL("../docs/korpus", import.meta.url));
const WORD_RE = /[\p{L}\p{M}](?:[\p{L}\p{M}]|['‘’ʻʼ`´](?=\p{L}))*/gu;
const SPECIAL_RE = /(?:https?:\/\/|www\.)[^\s<>"]+|[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+|(?<![\p{L}\p{N}])[@#][\p{L}\p{N}_]+/gu;
const CYR = /[Ѐ-ӿ]/;

const words = { jami: 0, kirill: 0, lotin: 0, ogirildi: 0, istisno: 0, ozgarishsiz: 0, chet: 0, himoyalangan: 0, maxsus: 0 };
const letters = new Map(); // "manba → natija" → soni
const bump = (m, k, n = 1) => m.set(k, (m.get(k) ?? 0) + n);

const files = (await readdir(dir)).filter((f) => f.endsWith(".txt")).sort();
for (const f of files) {
  const text = await readFile(join(dir, f), "utf8");
  const warnings = [];
  const pieces = buildPieces(text, {}, warnings);
  const changedAt = new Uint8Array(text.length);
  for (const p of pieces) if (!p.same) for (let i = p.start; i < p.end; i++) changedAt[i] = 1;
  const special = [...text.matchAll(SPECIAL_RE)].map((m) => [m.index, m.index + m[0].length]);
  const warnAt = new Map(warnings.map((w) => [w.start, w.reason]));

  for (const m of text.matchAll(WORD_RE)) {
    const s = m.index, e = s + m[0].length;
    words.jami++;
    CYR.test(m[0]) ? words.kirill++ : words.lotin++;
    if (special.some(([a, b]) => s >= a && e <= b)) { words.maxsus++; continue; }
    const reason = warnAt.get(s);
    if (reason === "foreign") { words.chet++; continue; }
    if (reason === "protected") { words.himoyalangan++; continue; }
    let changed = false;
    for (let i = s; i < e; i++) if (changedAt[i]) { changed = true; break; }
    if (!changed) { words.ozgarishsiz++; continue; }
    words.ogirildi++;
    if (reason === "exception") words.istisno++;
  }

  for (const p of pieces) {
    if (p.same) continue;
    const src = text.slice(p.start, p.end);
    const out = p.text.toLowerCase();
    const isCyr = CYR.test(src);
    let from;
    if (out.length > 1 && out.endsWith("ʼ")) from = isCyr ? "Kirill сҳ" : "Eski sh (istisno)";
    else if (isCyr && src.toLowerCase() === "ъ") from = "Kirill ъ";
    else if (isCyr) from = ["ў", "ғ", "ш", "ч"].includes(src.toLowerCase()) ? `Kirill ${src.toLowerCase()}` : "Kirill (boshqa harflar)";
    else if (src.length === 2 && APOSTROPHES.has(src[1])) from = `Eski ${src[0].toLowerCase()}ʻ`;
    else if (src.length === 2) from = `Eski ${src.toLowerCase()}`;
    else if (APOSTROPHES.has(src)) from = "Apostrof variantlari";
    else from = "Boshqa";
    const to = ["ö", "ğ", "ş", "ç"].includes(out) ? out.toUpperCase() + " " + out
      : out === "ʼ" ? "Tutuq ʼ"
      : out.endsWith("ʼ") ? "s + ʼ + h"
      : isCyr ? "Lotin harflari" : "Boshqa";
    bump(letters, `${from}|${to}`);
  }
}

const pct = (n) => ((100 * n) / words.jami).toFixed(1) + "%";
console.log(`Korpus: ${files.length} fayl, ${words.jami} soʻz (kirill ${words.kirill}, lotin ${words.lotin})`);
for (const [k, v] of Object.entries(words)) if (k !== "jami") console.log(`  ${k.padEnd(14)} ${String(v).padStart(5)}  ${pct(v)}`);

console.log("\n%% Mermaid sankey-beta — soʻzlar");
console.log("sankey-beta");
const rows = [
  ["Jami soʻzlar", "Oʻgirildi", words.ogirildi - words.istisno],
  ["Jami soʻzlar", "Oʻgirildi (istisno)", words.istisno],
  ["Jami soʻzlar", "Oʻzgarish shart emas", words.ozgarishsiz],
  ["Jami soʻzlar", "Himoyalandi", words.chet + words.himoyalangan + words.maxsus],
  ["Himoyalandi", "Chet soʻz", words.chet],
  ["Himoyalandi", "Brend / lugʻat", words.himoyalangan],
  ["Himoyalandi", "URL / email / #", words.maxsus],
];
for (const [a, b, n] of rows) if (n > 0) console.log(`${a},${b},${n}`);

console.log("\n%% Mermaid sankey-beta — harflar");
console.log("sankey-beta");
for (const [k, n] of [...letters].sort((a, b) => b[1] - a[1])) {
  const [a, b] = k.split("|");
  console.log(`${a},${b},${n}`);
}

// Diagramma uchun JSON (docs/diagrams/sankey.html oʻqiydi)
const letterRows = [...letters].filter(([k]) => !k.startsWith("Kirill (boshqa")).sort((a, b) => b[1] - a[1])
  .map(([k, n]) => [...k.split("|"), n]);
const json = { generated: new Date().toISOString().slice(0, 10), files: files.length, words, wordRows: rows.filter((r) => r[2] > 0), letterRows,
  otherCyrillic: [...letters].filter(([k]) => k.startsWith("Kirill (boshqa")).reduce((a, [, n]) => a + n, 0) };
const outJson = fileURLToPath(new URL("../docs/diagrams/sankey-data.json", import.meta.url));
await writeFile(outJson, JSON.stringify(json, null, 2) + "\n");
console.log("\nJSON:", outJson);
