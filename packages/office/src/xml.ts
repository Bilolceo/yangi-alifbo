import { convertSegments, type ConvertOptions, type ConvertWarning } from "@yangi-alifbo/core";

/** OOXML dialekti: qaysi teg paragraf, qaysi teg matn, qaysilari soʻz ajratuvchi. */
export interface XmlDialect {
  para: readonly string[];
  text: readonly string[];
  seps: readonly string[];
}

export const DOCX: XmlDialect = {
  para: ["w:p"],
  text: ["w:t"],
  seps: ["w:tab", "w:br", "w:cr", "w:sym", "w:drawing", "w:pict", "w:object", "w:ptab", "w:noBreakHyphen"],
};
export const PPTX: XmlDialect = { para: ["a:p"], text: ["a:t"], seps: ["a:br", "a:fld"] };
export const XLSX: XmlDialect = { para: ["si", "is", "text"], text: ["t"], seps: [] };
export const CORE_PROPS: XmlDialect = {
  para: [],
  text: ["dc:title", "dc:subject", "dc:description", "cp:keywords", "cp:category"],
  seps: [],
};

const TOKEN_RE =
  /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[[\s\S]*?\]\]>|<!(?:[^>"']|"[^"]*"|'[^']*')*>|<(\/?)([A-Za-z_][\w:.\-]*)((?:[^>"'\/]|"[^"]*"|'[^']*'|\/(?!>))*)(\/?)>/g;

type Item =
  | { kind: "text"; openStart: number; openEnd: number; contentEnd: number; openTag: string }
  | { kind: "sep" };

interface Replacement { start: number; end: number; text: string }

export interface XmlResult {
  xml: string;
  changed: number;
  warnings: ConvertWarning[];
}

const ENT: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
export const decodeXml = (s: string) =>
  s.indexOf("&") < 0
    ? s
    : s.replace(/&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g, (_, e: string) =>
        e[0] === "#"
          ? String.fromCodePoint(e[1] === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10))
          : ENT[e],
      );
export const encodeXml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * XML matnidagi barcha paragraflarni oʻgiradi. Faqat matn tugunlarining ichi oʻzgaradi —
 * qolgan baytlar (stillar, atributlar, tartib) aynan saqlanadi.
 */
export function convertXml(xml: string, dialect: XmlDialect, options?: ConvertOptions): XmlResult {
  const para = new Set(dialect.para);
  const text = new Set(dialect.text);
  const seps = new Set(dialect.seps);
  const stack: Item[][] = [];
  const reps: Replacement[] = [];
  const warnings: ConvertWarning[] = [];
  let changed = 0;

  const flush = (items: Item[]) => {
    const segs = items.map((it) =>
      it.kind === "sep" ? "\n" : decodeXml(xml.slice(it.openEnd, it.contentEnd)),
    );
    if (!segs.some((s) => s.length > 1 || /\p{L}/u.test(s))) return;
    const out = convertSegments(segs, options, warnings);
    items.forEach((it, k) => {
      if (it.kind !== "text" || out[k] === segs[k]) return;
      changed++;
      const needsPreserve = /^\s|\s$/.test(out[k]) && !/xml:space\s*=/.test(it.openTag);
      if (needsPreserve) {
        const tag = it.openTag.replace(/^<([\w:.\-]+)/, '<$1 xml:space="preserve"');
        reps.push({ start: it.openStart, end: it.openEnd, text: tag });
      }
      reps.push({ start: it.openEnd, end: it.contentEnd, text: encodeXml(out[k]) });
    });
  };

  TOKEN_RE.lastIndex = 0;
  for (let m: RegExpExecArray | null; (m = TOKEN_RE.exec(xml)); ) {
    const name = m[2];
    if (!name) continue; // izoh, PI, CDATA
    const closing = m[1] === "/";
    const selfClosing = m[4] === "/";
    const top = stack[stack.length - 1];

    if (para.has(name)) {
      if (selfClosing) continue;
      if (!closing) {
        top?.push({ kind: "sep" });
        stack.push([]);
      } else {
        const items = stack.pop();
        if (items) flush(items);
        stack[stack.length - 1]?.push({ kind: "sep" });
      }
      continue;
    }

    if (text.has(name) && !closing && !selfClosing) {
      const openStart = m.index;
      const openEnd = m.index + m[0].length;
      const closeIdx = xml.indexOf(`</${name}>`, openEnd);
      if (closeIdx < 0) break;
      const item: Item = { kind: "text", openStart, openEnd, contentEnd: closeIdx, openTag: m[0] };
      if (top) top.push(item);
      else flush([item]);
      TOKEN_RE.lastIndex = closeIdx + name.length + 3;
      continue;
    }

    if (seps.has(name) && !closing) top?.push({ kind: "sep" });
  }

  if (reps.length === 0) return { xml, changed: 0, warnings };
  reps.sort((a, b) => a.start - b.start);
  let out = "";
  let pos = 0;
  for (const r of reps) {
    out += xml.slice(pos, r.start) + r.text;
    pos = r.end;
  }
  out += xml.slice(pos);
  return { xml: out, changed, warnings };
}
