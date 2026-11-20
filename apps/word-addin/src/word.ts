/// <reference types="office-js" />
import { convert, type ConvertOptions, type ConvertWarning } from "@yangi-alifbo/core";
import { convertXml, DOCX } from "@yangi-alifbo/office-xml";

export type Scope = "document" | "selection";
export type Mode = "ooxml" | "text";

export interface Settings {
  from: NonNullable<ConvertOptions["from"]>;
  protectForeign: boolean;
  /** ooxml — formatlash toʻliq saqlanadi (standart); text — qidirib almashtirish (Track Changes bilan mos). */
  mode: Mode;
  includeHeaders: boolean;
  protectedWords: string[];
}

export const DEFAULT_SETTINGS: Settings = {
  from: "auto",
  protectForeign: true,
  mode: "ooxml",
  includeHeaders: true,
  protectedWords: [],
};

const KEY = "yangi-alifbo.settings";

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch { /* localStorage yoʻq boʻlishi mumkin */ }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(s: Settings) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* eʼtiborsiz */ }
}

export interface WordResult {
  changed: number;
  warnings: ConvertWarning[];
  emptySelection?: boolean;
}

const toOptions = (s: Settings): ConvertOptions => ({
  from: s.from,
  protectForeign: s.protectForeign,
  protectedWords: s.protectedWords,
});

/** Oʻgiriladigan barcha qismlar: asosiy matn + kolontitullar (yoki faqat belgilangan qism). */
async function collectTargets(ctx: Word.RequestContext, scope: Scope, s: Settings) {
  const bodies: Word.Body[] = [];
  if (scope === "selection") return { bodies, selection: ctx.document.getSelection() };
  bodies.push(ctx.document.body);
  if (s.includeHeaders) {
    const sections = ctx.document.sections;
    sections.load("items");
    await ctx.sync();
    const types = [Word.HeaderFooterType.primary, Word.HeaderFooterType.firstPage, Word.HeaderFooterType.evenPages];
    for (const sec of sections.items) {
      for (const t of types) bodies.push(sec.getHeader(t), sec.getFooter(t));
    }
  }
  return { bodies, selection: undefined as Word.Range | undefined };
}

/**
 * OOXML rejimi: getOoxml → @yangi-alifbo/office (DOCX fayl bilan bir xil dvigatel) → insertOoxml.
 * Har bir run formatlashi saqlanadi (qalin S + oddiy h → qalin Ş).
 */
async function runOoxml(ctx: Word.RequestContext, scope: Scope, s: Settings, dryRun: boolean): Promise<WordResult> {
  const opts = toOptions(s);
  const { bodies, selection } = await collectTargets(ctx, scope, s);
  const result: WordResult = { changed: 0, warnings: [] };

  if (selection) {
    selection.load("text");
    const ox = selection.getOoxml();
    await ctx.sync();
    if (!selection.text.trim()) return { ...result, emptySelection: true };
    const r = convertXml(ox.value, DOCX, opts);
    result.changed += r.words;
    result.warnings.push(...r.warnings);
    if (r.changed && !dryRun) selection.insertOoxml(r.xml, Word.InsertLocation.replace);
    await ctx.sync();
    return result;
  }

  const oxs = bodies.map((b) => b.getOoxml());
  const paras = bodies.map((b) => { const p = b.paragraphs; p.load("items/text"); return p; });
  await ctx.sync();

  const touched: number[] = [];
  bodies.forEach((b, k) => {
    const r = convertXml(oxs[k].value, DOCX, opts);
    if (!r.changed) return;
    result.changed += r.words;
    result.warnings.push(...r.warnings);
    if (!dryRun) { b.insertOoxml(r.xml, Word.InsertLocation.replace); touched.push(k); }
  });
  await ctx.sync();

  // insertOoxml(Replace) baʼzan oxiriga boʻsh paragraf qoʻshadi — tozalaymiz.
  if (touched.length) {
    const after = touched.map((k) => { const p = bodies[k].paragraphs; p.load("items/text"); return p; });
    await ctx.sync();
    touched.forEach((k, i) => {
      const before = paras[k].items.length;
      const items = after[i].items;
      if (items.length === before + 1 && items[items.length - 1].text === "" && before > 0) {
        items[items.length - 1].delete();
      }
    });
    await ctx.sync();
  }
  return result;
}

const TOKEN_RE = /[\p{L}\p{M}][\p{L}\p{M}'‘’ʻʼ`´]*/gu;

/**
 * Matn rejimi: soʻzlar boʻyicha qidirib almashtirish. Hujjat tuzilmasiga tegmaydi,
 * Track Changes yoqilgan boʻlsa har bir oʻzgarish tuzatish sifatida koʻrinadi.
 * Kamchiligi: bitta soʻz ichidagi aralash formatlash birinchi harf formatini oladi.
 */
async function runText(ctx: Word.RequestContext, scope: Scope, s: Settings, dryRun: boolean): Promise<WordResult> {
  const opts = toOptions(s);
  const { bodies, selection } = await collectTargets(ctx, scope, s);
  const containers: (Word.Body | Word.Range)[] = selection ? [selection] : bodies;
  containers.forEach((c) => c.load("text"));
  await ctx.sync();
  if (selection && !selection.text.trim()) return { changed: 0, warnings: [], emptySelection: true };

  const result: WordResult = { changed: 0, warnings: [] };
  const jobs: { results: Word.RangeCollection; to: string }[] = [];
  for (const c of containers) {
    const pairs = new Map<string, string>();
    for (const m of c.text.matchAll(TOKEN_RE)) {
      const w = m[0];
      if (pairs.has(w)) continue;
      const to = convert(w, opts);
      if (to !== w) pairs.set(w, to);
    }
    for (const [from, to] of pairs) {
      if (from.length > 255) continue;
      const r = c.search(from, { matchCase: true, matchWholeWord: true });
      r.load("items");
      jobs.push({ results: r, to });
    }
  }
  await ctx.sync();
  for (const j of jobs) {
    result.changed += j.results.items.length;
    if (!dryRun) for (const r of j.results.items) r.insertText(j.to, Word.InsertLocation.replace);
  }
  await ctx.sync();
  return result;
}

export async function convertInWord(scope: Scope, s: Settings = loadSettings(), dryRun = false): Promise<WordResult> {
  return Word.run(async (ctx) => {
    if (s.mode === "text") return runText(ctx, scope, s, dryRun);
    try {
      return await runOoxml(ctx, scope, s, dryRun);
    } catch (e) {
      // Eski Word versiyalari yoki himoyalangan hujjatlar: xavfsiz rejimga oʻtish
      console.warn("OOXML rejimi ishlamadi, matn rejimiga oʻtilmoqda", e);
      return runText(ctx, scope, s, dryRun);
    }
  });
}

/** Hujjatdan soʻzni topib belgilash (hisobotdagi ogohlantirishni bosganda). */
export async function selectWord(word: string) {
  await Word.run(async (ctx) => {
    const r = ctx.document.body.search(word, { matchCase: true });
    r.load("items");
    await ctx.sync();
    if (r.items.length) r.items[0].select();
    await ctx.sync();
  });
}
