import { convert, convertSegments, convertWithReport, type ConvertOptions } from "@yangi-alifbo/core";

/** Ichidagi matn oʻgirilmaydigan elementlar. */
const SKIP = new Set([
  "SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT", "SELECT", "CODE", "PRE", "KBD", "SAMP", "VAR",
  "SVG", "MATH", "TEMPLATE", "IFRAME", "CANVAS", "OBJECT",
]);

/** Soʻzlarni ajratuvchi (blok) elementlar — ular orasidagi matnlar bitta soʻzga qoʻshilmaydi. */
const BLOCK = new Set([
  "P", "DIV", "LI", "UL", "OL", "TD", "TH", "TR", "TABLE", "THEAD", "TBODY", "H1", "H2", "H3", "H4", "H5", "H6",
  "SECTION", "ARTICLE", "HEADER", "FOOTER", "NAV", "ASIDE", "MAIN", "BLOCKQUOTE", "DD", "DT", "DL",
  "FIGCAPTION", "FIGURE", "FORM", "LABEL", "BUTTON", "OPTION", "BODY", "HTML", "CAPTION", "SUMMARY", "DETAILS",
]);

export type Mode = "selection" | "page";

export interface Result {
  words: number;
  method: "input" | "editable" | "text" | "page" | "clipboard" | "none";
  /** clipboard rejimida — nusxalangan matn. */
  text?: string;
}

function isSkipped(node: Node): boolean {
  for (let el = node.parentElement; el; el = el.parentElement) {
    if (SKIP.has(el.tagName.toUpperCase())) return true;
    if (el.isContentEditable) return true;
  }
  return false;
}

function blockOf(node: Node): Node | null {
  for (let el = node.parentElement; el; el = el.parentElement) {
    if (BLOCK.has(el.tagName.toUpperCase())) return el;
  }
  return null;
}

/**
 * Matn tugunlarini oʻgiradi. Bitta blok ichidagi qoʻshni tugunlar birgalikda oʻgiriladi
 * (<b>S</b>hahar → <b>Ş</b>ahar), shuning uchun formatlash saqlanadi.
 */
export function convertTextNodes(nodes: Text[], opts: ConvertOptions): number {
  let words = 0;
  let i = 0;
  while (i < nodes.length) {
    const block = blockOf(nodes[i]);
    let j = i + 1;
    while (j < nodes.length && blockOf(nodes[j]) === block) j++;
    const group = nodes.slice(i, j);
    const stats = { words: 0 };
    const out = convertSegments(group.map((n) => n.data), opts, undefined, stats);
    group.forEach((n, k) => { if (out[k] !== n.data) n.data = out[k]; });
    words += stats.words;
    i = j;
  }
  return words;
}

function collectTextNodes(root: Node, doc: Document, filter?: (n: Text) => boolean): Text[] {
  const nodes: Text[] = [];
  const walker = doc.createTreeWalker(root, 4 /* NodeFilter.SHOW_TEXT */);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = n as Text;
    if (!/\p{L}/u.test(t.data) || isSkipped(t)) continue;
    if (filter && !filter(t)) continue;
    nodes.push(t);
  }
  return nodes;
}

/** Butun sahifani (va sarlavhani) yangi alifboda koʻrsatadi. */
export function convertPage(doc: Document, opts: ConvertOptions): Result {
  if (!doc.body) return { words: 0, method: "none" };
  let words = convertTextNodes(collectTextNodes(doc.body, doc), opts);
  // Placeholder va title atributlari
  doc.body.querySelectorAll<HTMLElement>("[placeholder], [title], [aria-label]").forEach((el) => {
    for (const a of ["placeholder", "title", "aria-label"]) {
      const v = el.getAttribute(a);
      if (v) { const c = convert(v, opts); if (c !== v) el.setAttribute(a, c); }
    }
  });
  const t = convert(doc.title, opts);
  if (t !== doc.title) { doc.title = t; words++; }
  return { words, method: "page" };
}

const TEXT_INPUT = new Set(["text", "search", "url", "tel", "email", ""]);

function isTextField(el: Element | null): el is HTMLInputElement | HTMLTextAreaElement {
  if (!el) return false;
  if (el.tagName === "TEXTAREA") return true;
  return el.tagName === "INPUT" && TEXT_INPUT.has(((el as HTMLInputElement).type ?? "").toLowerCase());
}

function editableRoot(node: Node | null): HTMLElement | null {
  for (let el = node instanceof Element ? node : node?.parentElement ?? null; el; el = el.parentElement) {
    if ((el as HTMLElement).isContentEditable) return el as HTMLElement;
  }
  return null;
}

/** Belgilangan matnni oʻgiradi: input/textarea, contenteditable (Gmail, Telegram) yoki oddiy sahifa matni. */
export function convertSelection(doc: Document, opts: ConvertOptions): Result {
  // 1. Input / textarea
  const active = doc.activeElement;
  if (isTextField(active) && !active.readOnly && !active.disabled) {
    let s = active.selectionStart ?? 0;
    let e = active.selectionEnd ?? 0;
    if (s === e) { s = 0; e = active.value.length; } // belgilanmagan — butun maydon
    const r = convertWithReport(active.value.slice(s, e), opts);
    if (r.changes) {
      active.setRangeText(r.text, s, e, "select");
      active.dispatchEvent(new Event("input", { bubbles: true }));
      active.dispatchEvent(new Event("change", { bubbles: true }));
    }
    return { words: r.changes, method: "input" };
  }

  const sel = doc.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return { words: 0, method: "none" };
  const selected = sel.toString();

  // 2. Tahrirlanadigan joy (Gmail, Telegram Web, WhatsApp Web, CMS muharrirlari)
  if (editableRoot(sel.anchorNode)) {
    const r = convertWithReport(selected, opts);
    if (!r.changes) return { words: 0, method: "editable" };
    // execCommand muharrirning oʻz modelini yangilaydi va Ctrl+Z bilan qaytariladi.
    const ok = typeof doc.execCommand === "function" && doc.execCommand("insertText", false, r.text);
    if (ok) return { words: r.changes, method: "editable" };
    return { words: r.changes, method: "clipboard", text: r.text };
  }

  // 3. Oddiy sahifa matni — faqat belgilangan qism, formatlash saqlanadi
  const range = sel.getRangeAt(0);
  const nodes = textNodesInRange(range, doc);
  if (nodes.length === 0) {
    // Canvas (Google Docs), PDF va boshqalar — natijani buferga beramiz
    const r = convertWithReport(selected, opts);
    return { words: r.changes, method: "clipboard", text: r.text };
  }
  const words = convertTextNodes(nodes, opts);
  return { words, method: "text" };
}

/** Range ichidagi matn tugunlari; chetdagi tugunlar faqat belgilangan qismi qolguncha boʻlinadi. */
function textNodesInRange(range: Range, doc: Document): Text[] {
  let { startContainer, startOffset, endContainer, endOffset } = range;
  // Chetdagi tugunlarni ajratish (splitText)
  if (startContainer.nodeType === 3 && startContainer === endContainer) {
    const t = startContainer as Text;
    const mid = t.splitText(startOffset);
    mid.splitText(endOffset - startOffset);
    return /\p{L}/u.test(mid.data) && !isSkipped(mid) ? [mid] : [];
  }
  if (endContainer.nodeType === 3 && endOffset < (endContainer as Text).length) {
    (endContainer as Text).splitText(endOffset);
  }
  if (startContainer.nodeType === 3 && startOffset > 0) {
    startContainer = (startContainer as Text).splitText(startOffset);
    startOffset = 0;
  }
  const r = doc.createRange();
  r.setStart(startContainer, startOffset);
  r.setEnd(endContainer, endContainer.nodeType === 3 ? (endContainer as Text).length : endOffset);
  const root = r.commonAncestorContainer;
  const container = root.nodeType === 3 ? root.parentNode ?? root : root;
  return collectTextNodes(container, doc, (t) => r.intersectsNode(t));
}

/** Buferga nusxalash (navigator.clipboard boʻlmasa — eski usul). */
export async function copyText(doc: Document, text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = doc.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;top:-1000px;opacity:0";
    doc.body.append(ta);
    ta.select();
    const ok = doc.execCommand("copy");
    ta.remove();
    return ok;
  }
}
