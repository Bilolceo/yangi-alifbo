import { describe, expect, it } from "vitest";
import {
  convert, convertSegments, convertWithReport, detectScript, normalizeForSearch, toOldLatin,
} from "../src/index.js";

const cases: [string, string][] = [
  // Asosiy harflar
  ["oʻzbek", "özbek"],
  ["bogʻ", "boğ"],
  ["shahar", "şahar"],
  ["choy", "çoy"],
  ["kecha", "keça"],
  ["ishlash", "işlaş"],
  ["tong", "tong"],
  ["ming", "ming"],
  // Apostrof variantlari
  ["o'zbek", "özbek"],
  ["o‘zbek", "özbek"],
  ["o’zbek", "özbek"],
  ["o`zbek", "özbek"],
  ["oʼzbek", "özbek"],
  ["g'alaba", "ğalaba"],
  ["tog´", "toğ"],
  // Tutuq
  ["ma'no", "maʼno"],
  ["san'at", "sanʼat"],
  ["she'r", "şeʼr"],
  ["ta’lim", "taʼlim"],
  ["mas'uliyat", "masʼuliyat"],
  ["Is'hoq", "Isʼhoq"],
  // Registr
  ["Shahar", "Şahar"],
  ["SHAHAR", "ŞAHAR"],
  ["O'zbekiston", "Özbekiston"],
  ["OʻZBEKISTON", "ÖZBEKISTON"],
  ["G'ulom", "Ğulom"],
  ["Chorshanba", "Çorşanba"],
  ["TOSHKENT", "TOŞKENT"],
  // Istisnolar
  ["Ishoq", "Isʼhoq"],
  ["Ishoqning", "Isʼhoqning"],
  ["ashob", "asʼhob"],
  // Gaplar
  ["O'zbekiston Respublikasi Prezidentining qarori", "Özbekiston Respublikasi Prezidentining qarori"],
  ["Toshkent shahridagi bog'da o'quvchilar choy ichishdi.", "Toşkent şahridagi boğda öquvçilar çoy içişdi."],
  ["G'afur G'ulom ko'chasi, 5-uy", "Ğafur Ğulom köçasi, 5-uy"],
  // Qoʻshtirnoq
  ["'salom' dedi", "'salom' dedi"],
  ["«o'zbek tili»", "«özbek tili»"],
  ["\"shahar\"", "\"şahar\""],
  // 2021 loyiha belgilari, combining
  ["ózbek", "özbek"],
  ["ǵalaba", "ğalaba"],
  ["özbek", "özbek"],
  // Kirill
  ["Ўзбекистон", "Özbekiston"],
  ["ўзбек тили", "özbek tili"],
  ["Тошкент шаҳри", "Toşkent şahri"],
  ["ғалаба", "ğalaba"],
  ["чой", "çoy"],
  ["Ёқуб", "Yoqub"],
  ["ЁҚУБ", "YOQUB"],
  ["ер", "yer"],
  ["поезд", "poyezd"],
  ["кеча", "keça"],
  ["цирк", "sirk"],
  ["милиция", "militsiya"],
  ["съезд", "sʼyezd"],
  ["маъно", "maʼno"],
  ["Исҳоқ", "Isʼhoq"],
  ["юлдуз", "yulduz"],
  ["Ярослав", "Yaroslav"],
  ["батальон", "batalyon"],
  ["ЎЗБЕКИСТОН РЕСПУБЛИКАСИ", "ÖZBEKISTON RESPUBLIKASI"],
  // Himoyalangan
  ["https://gov.uz/oz/shahar", "https://gov.uz/oz/shahar"],
  ["info@o'zbek.uz", "info@özbek.uz"],
  ["shahar@mail.uz", "shahar@mail.uz"],
  ["Chevrolet", "Chevrolet"],
  ["Chevroletning", "Chevroletning"],
  ["Microsoft Teams", "Microsoft Teams"],
  ["Washington", "Washington"],
  ["Facebook", "Facebook"],
  ["`shell`", "`shell`"],
  ["#shahar", "#shahar"],
  ["pushti", "puşti"],
];

describe("convert", () => {
  it.each(cases)("%s → %s", (input, expected) => {
    expect(convert(input)).toBe(expected);
  });

  it("idempotent", () => {
    for (const [input] of cases) {
      const once = convert(input);
      expect(convert(once)).toBe(once);
    }
  });

  it("natija NFC", () => {
    for (const [input] of cases) {
      const r = convert(input);
      expect(r).toBe(r.normalize("NFC"));
    }
  });

  it("from=latin kirillni oʻzgartirmaydi", () => {
    expect(convert("Тошкент shahri", { from: "latin" })).toBe("Тошкент şahri");
  });

  it("from=cyrillic lotinni oʻzgartirmaydi", () => {
    expect(convert("Тошкент shahri", { from: "cyrillic" })).toBe("Toşkent shahri");
  });

  it("normalizeTutuq=false", () => {
    expect(convert("ma'no", { normalizeTutuq: false })).toBe("ma'no");
  });

  it("protectForeign=false", () => {
    expect(convert("Washington", { protectForeign: false })).toBe("Waşington");
  });

  it("foydalanuvchi lugʻati", () => {
    expect(convert("Ashraf Shohruh", { protectedWords: ["Shohruh"] })).toBe("Aşraf Shohruh");
    expect(convert("Ashraf", { exceptions: ["as|hraf"], insertTutuq: false })).toBe("Ashraf");
  });

  it("boʻsh va belgisiz matn", () => {
    expect(convert("")).toBe("");
    expect(convert("123 — !?")).toBe("123 — !?");
  });
});

describe("convertWithReport", () => {
  it("ogohlantirishlar", () => {
    const r = convertWithReport("Washington shahri, Ishoq");
    expect(r.text).toBe("Washington şahri, Isʼhoq");
    expect(r.warnings.map((w) => [w.word, w.reason])).toEqual([
      ["Washington", "foreign"],
      ["Ishoq", "exception"],
    ]);
    expect(r.changes).toBeGreaterThan(0);
  });
});

describe("convertSegments (Word run'lari)", () => {
  it("s | h turli run'larda", () => {
    expect(convertSegments(["s", "hahar"])).toEqual(["ş", "ahar"]);
  });
  it("o | ' turli run'larda", () => {
    expect(convertSegments(["Bo", "'", "g'da"])).toEqual(["Bö", "", "ğda"]);
  });
  it("uzunlik va bo'sh segmentlar saqlanadi", () => {
    const r = convertSegments(["", "Toshkent ", "", "shahri"]);
    expect(r).toHaveLength(4);
    expect(r.join("")).toBe("Toşkent şahri");
    expect(r).toEqual(["", "Toşkent ", "", "şahri"]);
  });
  it("natija join = convert(join)", () => {
    const segs = ["O'z", "bekis", "ton Res", "publikasi ch", "orsh", "anba"];
    expect(convertSegments(segs).join("")).toBe(convert(segs.join("")));
  });
});

describe("toOldLatin", () => {
  it("teskari", () => {
    expect(toOldLatin("Özbekiston şahri, boğ, Çorşanba")).toBe("Oʻzbekiston shahri, bogʻ, Chorshanba");
    expect(toOldLatin("TOŞKENT")).toBe("TOSHKENT");
  });
});

describe("normalizeForSearch", () => {
  it("barcha variantlar bir xil", () => {
    const v = ["oʻzbek", "o'zbek", "O‘zbek", "ўзбек", "özbek", "ÖZBEK"].map(normalizeForSearch);
    expect(new Set(v).size).toBe(1);
  });
});

describe("detectScript", () => {
  it.each([
    ["Ўзбекистон Республикаси", "cyrillic"],
    ["O'zbekiston shahri", "latin-old"],
    ["Özbekiston şahri", "latin-new"],
    ["123", "unknown"],
  ])("%s", (t, s) => expect(detectScript(t)).toBe(s));
});
