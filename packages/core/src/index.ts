import { OKINA, isCyrillic, isLetter, isUpper } from "./chars.js";
import { buildPieces, type ConvertOptions, type ConvertStats, type ConvertWarning, type Piece } from "./engine.js";

export type { ConvertOptions, ConvertStats, ConvertWarning, Piece, WarningReason } from "./engine.js";
export { APOSTROPHES, TUTUQ, OKINA } from "./chars.js";
export { EXCEPTIONS, PROTECTED_WORDS } from "./data.js";
export { buildPieces } from "./engine.js";

/** 2026-yilgi yangi alifbo harflari (OʻRQ-1184, 1-modda). */
export const ALPHABET = [
  "A", "B", "D", "E", "F", "G", "Ğ", "H", "I", "J", "K", "L", "M", "N",
  "O", "Ö", "P", "Q", "R", "S", "Ş", "Ç", "T", "U", "V", "X", "Y", "Z",
] as const;

export interface ConvertReport {
  text: string;
  /** Oʻzgargan soʻzlar soni. */
  changes: number;
  warnings: ConvertWarning[];
}

/** Eski lotin (1995) yoki kirill matnni yangi (2026) lotin alifbosiga oʻgiradi. */
export function convert(text: string, options?: ConvertOptions): string {
  return join(buildPieces(text, options));
}

/** `convert` + hisobot (ogohlantirishlar, oʻzgarishlar soni). */
export function convertWithReport(text: string, options?: ConvertOptions): ConvertReport {
  const warnings: ConvertWarning[] = [];
  const stats: ConvertStats = { words: 0 };
  const pieces = buildPieces(text, options, warnings, stats);
  return { text: join(pieces), changes: stats.words, warnings };
}

function join(pieces: Piece[]): string {
  let out = "";
  for (const p of pieces) out += p.text;
  return out;
}

/**
 * Boʻlaklarga (masalan Word run'lariga) boʻlingan matnni oʻgiradi.
 * Natija massivi uzunligi kirish bilan bir xil; har bir oʻgirilgan harf
 * oʻzining birinchi belgisi joylashgan boʻlakka yoziladi — formatlash saqlanadi.
 */
export function convertSegments(
  segments: readonly string[],
  options?: ConvertOptions,
  warnings?: ConvertWarning[],
  stats?: ConvertStats,
): string[] {
  const text = segments.join("");
  const pieces = buildPieces(text, options, warnings, stats);
  const out = segments.map(() => "");
  const bounds: number[] = [];
  let acc = 0;
  for (const s of segments) { bounds.push(acc); acc += s.length; }

  let seg = 0;
  const segAt = (pos: number) => {
    while (seg + 1 < segments.length && bounds[seg + 1] <= pos) seg++;
    return seg;
  };
  for (const p of pieces) {
    if (!p.same) {
      out[segAt(p.start)] += p.text;
      continue;
    }
    let pos = p.start;
    while (pos < p.end) {
      const k = segAt(pos);
      const segEnd = bounds[k] + segments[k].length;
      const stop = Math.min(segEnd, p.end);
      out[k] += text.slice(pos, stop);
      if (stop === pos) break; // xavfsizlik
      pos = stop;
    }
  }
  return out;
}

/** Yangi alifbodagi matnni eski (1995) lotin yozuviga qaytaradi. */
export function toOldLatin(text: string): string {
  const MAP: Record<string, string> = { ö: "o" + OKINA, ğ: "g" + OKINA, ş: "sh", ç: "ch" };
  return text.replace(/\p{L}+/gu, (word) => {
    if (!/[öğşçÖĞŞÇ]/.test(word)) return word;
    const caps = [...word].filter(isLetter).length > 1 && [...word].every((c) => !isLetter(c) || isUpper(c));
    let r = "";
    for (const c of word) {
      const m = MAP[c.toLowerCase()];
      if (!m) { r += c; continue; }
      if (!isUpper(c)) r += m;
      else r += caps ? m.toUpperCase() : m[0].toUpperCase() + m.slice(1);
    }
    return r;
  });
}

/**
 * Qidiruv uchun kanonik shakl: istalgan yozuv (kirill, eski/yangi lotin, har xil apostroflar)
 * → yangi lotin, kichik harf. `oʻzbek`, `o'zbek`, `ўзбек`, `özbek` → `özbek`.
 */
export function normalizeForSearch(text: string): string {
  return convert(text, { protectForeign: false, useBuiltinLists: false, protectSpecial: false, insertTutuq: false })
    .toLowerCase();
}

export type Script = "cyrillic" | "latin-old" | "latin-new" | "mixed" | "unknown";

/** Matn qaysi yozuvda ekanini aniqlaydi. */
export function detectScript(text: string): Script {
  let cyr = 0, lat = 0;
  for (const c of text) {
    if (!isLetter(c)) continue;
    if (isCyrillic(c)) cyr++; else lat++;
  }
  if (cyr + lat === 0) return "unknown";
  if (cyr && lat && Math.min(cyr, lat) / (cyr + lat) > 0.2) return "mixed";
  if (cyr > lat) return "cyrillic";
  const neu = (text.match(/[öğşçÖĞŞÇ]/g) ?? []).length;
  const old = (text.match(/[oOgG][''`ʻʼ‘’]|[sScC][hH]/g) ?? []).length;
  if (neu === 0 && old === 0) return "latin-new";
  return neu >= old ? "latin-new" : "latin-old";
}
