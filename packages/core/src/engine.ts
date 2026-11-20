import {
  LETTER_NORMALIZE, TUTUQ, isApostrophe, isCyrillic, isLetter, isMark, isUpper, lower1,
} from "./chars.js";
import { EXCEPTIONS, PROTECTED_WORDS, UZ_SUFFIX_RE } from "./data.js";

/** Kirish matnining [start, end) oraligʻi `text` bilan almashtiriladi. `same` — oʻzgarishsiz nusxa. */
export interface Piece {
  start: number;
  end: number;
  text: string;
  same?: boolean;
}

export type WarningReason = "foreign" | "protected" | "exception";

export interface ConvertWarning {
  start: number;
  end: number;
  word: string;
  reason: WarningReason;
}

export interface ConvertOptions {
  /** Manba yozuvi. `auto` — kirill va eski lotin bir vaqtda (standart). */
  from?: "auto" | "latin" | "cyrillic";
  /** Tutuq belgisining barcha variantlarini ʼ (U+02BC) ga keltirish. Standart: true. */
  normalizeTutuq?: boolean;
  /** Chet soʻz evristikasi (w, c, th, ph, ee, oo) boʻyicha soʻzni oʻgirmaslik. Standart: true. */
  protectForeign?: boolean;
  /** Qoʻshimcha himoyalangan soʻzlar (registrga befarq). */
  protectedWords?: readonly string[];
  /** Qoʻshimcha istisno oʻzaklari, masalan "is|hoq". */
  exceptions?: readonly string[];
  /** Oʻrnatilgan lugʻatlardan foydalanish. Standart: true. */
  useBuiltinLists?: boolean;
  /** Istisno nuqtasiga tutuq qoʻyish (Ishoq → Isʼhoq). Standart: true. */
  insertTutuq?: boolean;
  /** URL, email, @mention, #hashtag, `kod` ni himoyalash. Standart: true. */
  protectSpecial?: boolean;
}

interface Resolved {
  latin: boolean;
  cyrillic: boolean;
  normalizeTutuq: boolean;
  protectForeign: boolean;
  insertTutuq: boolean;
  protectSpecial: boolean;
  protectedSet: Set<string>;
  exceptions: { stem: string; cuts: number[] }[];
}

const cache = new WeakMap<ConvertOptions, Resolved>();
const DEFAULT_OPTS: ConvertOptions = {};

function resolve(o: ConvertOptions): Resolved {
  const hit = cache.get(o);
  if (hit) return hit;
  const builtin = o.useBuiltinLists !== false;
  const from = o.from ?? "auto";
  const exc = [...(builtin ? EXCEPTIONS : []), ...(o.exceptions ?? [])].map((e) => {
    const lowerE = e.toLowerCase();
    const cuts: number[] = [];
    let stem = "";
    for (const ch of lowerE) {
      if (ch === "|") cuts.push(stem.length);
      else stem += ch;
    }
    return { stem, cuts };
  });
  const r: Resolved = {
    latin: from !== "cyrillic",
    cyrillic: from !== "latin",
    normalizeTutuq: o.normalizeTutuq !== false,
    protectForeign: o.protectForeign !== false,
    insertTutuq: o.insertTutuq !== false,
    protectSpecial: o.protectSpecial !== false,
    protectedSet: new Set(
      [...(builtin ? PROTECTED_WORDS : []), ...(o.protectedWords ?? [])].map((w) => w.toLowerCase()),
    ),
    exceptions: exc,
  };
  cache.set(o, r);
  return r;
}

// URL, email, @mention, #hashtag, `inline code`
const SPECIAL_RE =
  /(?:https?:\/\/|ftp:\/\/|www\.)[^\s<>"]+|[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+|`[^`\n]*`|(?<![\p{L}\p{N}])[@#][\p{L}\p{N}_]+/gu;

const FOREIGN_RE = /w|c(?!h)|th|ph|ee|oo/;

const CYR_VOWELS = new Set("аеёиоуэюяўыАЕЁИОУЭЮЯЎЫ");
const CYR_SIGNS = new Set("ъьЪЬ");

const CYR_SIMPLE: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", ж: "j", з: "z", и: "i", й: "y", к: "k", л: "l",
  м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "x", э: "e",
  ы: "i", ў: "ö", ғ: "ğ", қ: "q", ҳ: "h", ш: "ş", ч: "ç", ъ: TUTUQ, ь: "",
  ё: "yo", ю: "yu", я: "ya", щ: "şç",
};

/** Oʻzbek lotin soʻzini tashkil etuvchi belgimi (harf yoki diakritik belgi). */
const isWordChar = (c: string | undefined) => isLetter(c) || isMark(c);

/** Matnni [start, end) soʻzlar va qolgan qismlarga ajratib, boʻlaklar hosil qiladi. */
export function buildPieces(
  text: string,
  options: ConvertOptions = DEFAULT_OPTS,
  warnings?: ConvertWarning[],
): Piece[] {
  const o = resolve(options);
  const pieces: Piece[] = [];
  const pushSame = (start: number, end: number) => {
    if (end <= start) return;
    const last = pieces[pieces.length - 1];
    if (last && last.same && last.end === start) {
      last.end = end;
      last.text += text.slice(start, end);
    } else {
      pieces.push({ start, end, text: text.slice(start, end), same: true });
    }
  };
  const push = (start: number, end: number, out: string) => {
    if (out === text.slice(start, end)) pushSame(start, end);
    else pieces.push({ start, end, text: out });
  };

  // 1. Himoyalangan oraliqlar
  const special: [number, number][] = [];
  if (o.protectSpecial) {
    SPECIAL_RE.lastIndex = 0;
    for (let m: RegExpExecArray | null; (m = SPECIAL_RE.exec(text)); ) {
      special.push([m.index, m.index + m[0].length]);
    }
  }

  let sp = 0;
  let i = 0;
  const n = text.length;
  while (i < n) {
    if (sp < special.length && i >= special[sp][0]) {
      const end = special[sp][1];
      pushSame(i, end);
      i = Math.max(i, end);
      sp++;
      continue;
    }
    const limit = sp < special.length ? special[sp][0] : n;
    const c = text[i];

    if (!isWordChar(c)) {
      // Soʻzdan tashqaridagi apostrof — qoʻshtirnoq yoki ajralib qolgan tutuq: oʻzgarmaydi.
      pushSame(i, i + 1);
      i++;
      continue;
    }

    // 2. Soʻz chegarasini topish
    let j = i + 1;
    while (j < limit) {
      const d = text[j];
      if (isWordChar(d)) { j++; continue; }
      if (isApostrophe(d)) {
        const next = text[j + 1];
        const prevBase = lower1(baseBefore(text, j, i));
        if (j + 1 < limit && isWordChar(next)) { j++; continue; }
        if (prevBase === "o" || prevBase === "g") {
          // Yopuvchi qoʻshtirnoq emasligini tekshirish: 'bog' → qoʻshtirnoq
          if (!isApostrophe(text[i - 1])) { j++; continue; }
        }
      }
      break;
    }
    convertWord(text, i, j, o, push, pushSame, warnings);
    i = j;
  }
  return pieces;
}

/** j pozitsiyadan oldingi asosiy harf (diakritik belgilarni oʻtkazib). */
function baseBefore(text: string, j: number, min: number): string {
  let k = j - 1;
  while (k > min && isMark(text[k])) k--;
  return text[k] ?? "";
}

type Push = (start: number, end: number, out: string) => void;

function convertWord(
  text: string, s: number, e: number, o: Resolved,
  push: Push, pushSame: (a: number, b: number) => void, warnings?: ConvertWarning[],
) {
  const word = text.slice(s, e);
  let key = "";
  let hasCyr = false;
  for (let k = 0; k < word.length; k++) {
    const ch = word[k];
    if (isCyrillic(ch)) hasCyr = true;
    key += isApostrophe(ch) ? "'" : lower1(ch);
  }

  if (!hasCyr && o.latin) {
    // Himoyalangan soʻz
    if (isProtected(key, o.protectedSet)) {
      warnings?.push({ start: s, end: e, word, reason: "protected" });
      pushSame(s, e);
      return;
    }
    if (o.protectForeign && FOREIGN_RE.test(key) && /sh|ch|[og]'/.test(key)) {
      warnings?.push({ start: s, end: e, word, reason: "foreign" });
      pushSame(s, e);
      return;
    }
  }

  // Istisnolar: s|h birlashtirilmaydigan pozitsiyalar
  let noMerge: Set<number> | undefined;
  if (!hasCyr && o.latin) {
    for (const ex of o.exceptions) {
      if (key.startsWith(ex.stem)) {
        noMerge ??= new Set();
        for (const cut of ex.cuts) noMerge.add(s + cut - 1);
      }
    }
    if (noMerge) warnings?.push({ start: s, end: e, word, reason: "exception" });
  }

  const allCaps = isAllCaps(word);
  let i = s;
  while (i < e) {
    const c = text[i];
    if (isCyrillic(c)) {
      if (!o.cyrillic) { pushSame(i, i + 1); i++; continue; }
      i = convertCyrChar(text, i, s, e, allCaps, push);
      continue;
    }
    if (!o.latin) { pushSame(i, i + 1); i++; continue; }

    // Diakritik belgili harf (combining) → NFC
    let j = i + 1;
    while (j < e && isMark(text[j])) j++;
    const ch = j > i + 1 ? text.slice(i, j).normalize("NFC") : c;
    const lc = lower1(ch);
    const up = isUpper(ch);

    if ((lc === "o" || lc === "g") && j < e && isApostrophe(text[j])) {
      const out = lc === "o" ? "ö" : "ğ";
      push(i, j + 1, up ? out.toUpperCase() : out);
      i = j + 1;
      continue;
    }
    if ((lc === "s" || lc === "c") && j === i + 1 && i + 1 < e && lower1(text[i + 1]) === "h" && !isMark(text[i + 2])) {
      if (noMerge?.has(i)) {
        push(i, i + 1, o.insertTutuq ? c + TUTUQ : c);
        i++;
        continue;
      }
      const out = lc === "s" ? "ş" : "ç";
      push(i, i + 2, up ? out.toUpperCase() : out);
      i += 2;
      continue;
    }
    if (isApostrophe(c)) {
      push(i, i + 1, o.normalizeTutuq ? TUTUQ : c);
      i++;
      continue;
    }
    const norm = LETTER_NORMALIZE[ch];
    if (norm) { push(i, j, norm); i = j; continue; }
    if (j > i + 1) { push(i, j, ch); i = j; continue; }
    pushSame(i, i + 1);
    i++;
  }
}

function isProtected(key: string, set: Set<string>): boolean {
  if (set.size === 0) return false;
  if (set.has(key)) return true;
  for (const w of set) {
    if (key.length > w.length && key.startsWith(w) && UZ_SUFFIX_RE.test(key.slice(w.length))) return true;
  }
  return false;
}

function isAllCaps(word: string): boolean {
  let letters = 0;
  for (const ch of word) {
    if (!isLetter(ch)) continue;
    if (!isUpper(ch)) return false;
    letters++;
  }
  return letters >= 2;
}

function convertCyrChar(
  text: string, i: number, s: number, e: number, allCaps: boolean, push: Push,
): number {
  const c = text[i];
  const lc = c.toLowerCase();
  const up = isUpper(c);
  const prev = i > s ? text[i - 1] : undefined;
  const atStart = i === s;
  const caseIt = (out: string) => {
    if (!up || out.length === 0) return out;
    if (allCaps || out.length === 1) return out.toUpperCase();
    return out[0].toUpperCase() + out.slice(1);
  };

  let out: string;
  if (lc === "е") {
    out = atStart || CYR_VOWELS.has(prev!) || CYR_SIGNS.has(prev!) ? "ye" : "e";
  } else if (lc === "ц") {
    out = atStart || !CYR_VOWELS.has(prev!) ? "s" : "ts";
  } else if (lc === "с" && i + 1 < e && (text[i + 1] === "ҳ" || text[i + 1] === "Ҳ")) {
    out = "s" + TUTUQ; // Исҳоқ → Isʼhoq
  } else if (lc === "ь" && i + 1 < e && "оО".includes(text[i + 1])) {
    out = "y"; // батальон → batalyon
  } else {
    out = CYR_SIMPLE[lc] ?? c;
  }
  push(i, i + 1, CYR_SIMPLE[lc] === undefined && out === c ? c : caseIt(out));
  return i + 1;
}
