/** Kirish matnida apostrof (oʻ/gʻ belgisi yoki tutuq) sifatida uchraydigan barcha belgilar. */
export const APOSTROPHES = new Set([
  "'", // U+0027 oddiy apostrof
  "`", // U+0060 grave
  "´", // U+00B4 acute
  "ʹ", // U+02B9
  "ʻ", // U+02BB modifier turned comma (oʻ, gʻ uchun rasmiy)
  "ʼ", // U+02BC modifier apostrophe (tutuq uchun rasmiy)
  "ʽ", // U+02BD
  "‘", // U+2018
  "’", // U+2019
  "′", // U+2032 prime
]);

/** Tutuq belgisining kanonik shakli. */
export const TUTUQ = "ʼ"; // U+02BC
/** Eski alifboda oʻ/gʻ uchun kanonik belgi (teskari konvertatsiyada). */
export const OKINA = "ʻ"; // U+02BB

export const isApostrophe = (c: string | undefined): boolean => c !== undefined && APOSTROPHES.has(c);

const LETTER_RE = /\p{L}/u;
const MARK_RE = /\p{M}/u;
const CYR_RE = /[Ѐ-ӿ]/;

export const isLetter = (c: string | undefined): boolean => c !== undefined && LETTER_RE.test(c);
export const isMark = (c: string | undefined): boolean => c !== undefined && MARK_RE.test(c);
export const isCyrillic = (c: string | undefined): boolean => c !== undefined && CYR_RE.test(c);
export const isUpper = (c: string): boolean => c !== c.toLowerCase() && c === c.toUpperCase();

/** Bir kod birligini kichik harfga oʻtkazadi, uzunlik oʻzgarsa asl belgini qaytaradi (indekslar mos qolishi uchun). */
export const lower1 = (c: string): string => {
  const l = c.toLowerCase();
  return l.length === c.length ? l : c;
};

/**
 * 2021-yilgi loyiha va norasmiy belgilar → 2026 rasmiy harflar.
 * Natija har doim NFC.
 */
export const LETTER_NORMALIZE: Record<string, string> = {
  "ó": "ö", "Ó": "Ö",
  "ŏ": "ö", "Ŏ": "Ö",
  "ǵ": "ğ", "Ǵ": "Ğ",
  "ǧ": "ğ", "Ǧ": "Ğ",
  "ş": "ş", "Ş": "Ş",
  "ç": "ç", "Ç": "Ç",
  "ö": "ö", "Ö": "Ö",
  "ğ": "ğ", "Ğ": "Ğ",
};
