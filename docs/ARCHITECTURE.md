# Arxitektura

## 1. Umumiy koʻrinish

```
                         ┌────────────────────────────────────────────┐
                         │          @yangi-alifbo/core (TS)            │
                         │  tokenizer → himoya → qoidalar → lugʻatlar  │
                         │  convert · convertSegments · toOldLatin ·   │
                         │  normalizeForSearch · detectScript          │
                         └──────────────────────┬─────────────────────┘
                                                │ (0 bogʻliqlik, ESM+CJS)
                         ┌──────────────────────┴─────────────────────┐
                         │        @yangi-alifbo/office (TS)            │
                         │  OOXML: DOCX <w:t>, PPTX <a:t>, XLSX <t>    │
                         │  paragraf → run'lar → convertSegments        │
                         └───┬──────────┬───────────┬───────────┬─────┘
                             │          │           │           │
                      Word Add-in     CLI       Web ilova     REST API
                      (Office.js:   (Node)     (Vite, faqat   (Node, Docker,
                       getOoxml →              brauzer)        on-premise)
                       insertOoxml)
```

**Asosiy tamoyil:** barcha qoidalar faqat `core` da. Boshqa hamma modullar — yupqa qobiq. Qoida oʻzgarsa, bitta joyda tuzatiladi, hamma integratsiya avtomatik yangilanadi.

## 2. Repozitoriy tuzilishi (npm workspaces monorepo)

```
yangi-alifbo/
├── docs/                 TZ.md, ARCHITECTURE.md
├── packages/
│   ├── core/             konvertatsiya yadrosi
│   │   ├── src/
│   │   │   ├── index.ts        public API
│   │   │   ├── chars.ts        apostroflar, harf toʻplamlari
│   │   │   ├── latin.ts        eski lotin → yangi qoidalari
│   │   │   ├── cyrillic.ts     kirill → yangi qoidalari
│   │   │   ├── tokenizer.ts    soʻz / himoyalangan boʻlaklar
│   │   │   ├── engine.ts       Piece[] generatsiya, segmentlarga taqsimlash
│   │   │   └── data.ts         istisnolar va himoyalangan soʻzlar lugʻati
│   │   └── test/
│   ├── office/           DOCX/XLSX/PPTX (JSZip asosida)
│   └── cli/              yangi-alifbo buyrugʻi
└── apps/
    ├── word-addin/       Office.js add-in (manifest.xml, ribbon, taskpane)
    └── web/              brauzer ilova
```

## 3. Yadro algoritmi

### 3.1. «Piece» modeli
Konvertatsiya natijasi — boʻlaklar roʻyxati: `{ start, end, text }`. Har bir boʻlak kirish matnining `[start, end)` oraligʻini `text` bilan almashtiradi. Masalan `"shahar"`:

```
[0,2)→"ş"  [2,3)→"a"  [3,4)→"h"  [4,5)→"a"  [5,6)→"r"
```

Bu model ikki narsani bir vaqtda beradi:
- `convert()` — boʻlaklar `text` ini qoʻshish;
- `convertSegments()` — har bir boʻlak `start` pozitsiyasi joylashgan segmentga yoziladi. Shuning uchun Word'da `s` (run 1, qalin) + `h` (run 2) → `ş` run 1 ga tushadi, run 2 dan `h` oʻchadi. Formatlash va run tuzilishi saqlanadi.

### 3.2. Bosqichlar
1. **Himoya:** regex bilan URL, email, `@`, `#`, backtick-kod oraliqlari topiladi → oʻzgarmaydigan boʻlak.
2. **Tokenizatsiya:** qolgan matnda soʻzlar ajratiladi: `harf (harf | apostrof+harf | [oOgG] dan keyingi apostrof)*`. Soʻz chegarasidagi qoʻshtirnoqlar soʻzga kirmaydi.
3. **Soʻz darajasidagi qarorlar:** skript aniqlash (kirill/lotin), himoyalangan soʻzlar, chet soʻz evristikasi, istisno oʻzaklari (`is|hoq` — `|` birlashtirmaslik nuqtasi).
4. **Harf darajasidagi skaner** (latin.ts / cyrillic.ts) — boʻlaklar hosil qiladi.
5. **Hisobot** — ogohlantirishlar pozitsiyalar bilan.

### 3.3. Nima uchun regex-replace emas
- Pozitsiya xaritasi yoʻqoladi → Word run'larini saqlab boʻlmaydi.
- Kontekst qoidalari (kirill `е`/`ц`, registr, istisnolar) zanjirli replace'da bir-biriga xalaqit beradi.
- Idempotentlik va hisobotni kafolatlash qiyin.

## 4. Office fayllar (M2)
- DOCX = ZIP + XML. `word/document.xml`, `header*.xml`, `footer*.xml`, `footnotes.xml`, `endnotes.xml`, `comments.xml` qayta ishlanadi.
- Har bir `<w:p>` (paragraf) ichidagi `<w:t>` matnlari bitta segmentlar massiviga yigʻiladi → `convertSegments` → natija xuddi oʻsha `<w:t>` larga qaytariladi. Boshqa XML (stillar, rasm, jadval) tegilmaydi.
- `<w:t>` da bosh/oxirgi boʻshliq boʻlsa `xml:space="preserve"` qoʻyiladi.
- PPTX: `<a:p>` ichidagi `<a:t>`; XLSX: `sharedStrings.xml` dagi `<si>` ichidagi `<t>` (formulalar `<f>` tegilmaydi).
- XML parser sifatida toʻliq DOM emas, **teglarga hurmat bilan ishlaydigan yengil skaner** — hujjat baytlari maksimal darajada oʻzgarmasdan qoladi, Word «faylni tiklash» oynasini koʻrsatmaydi.

## 5. Word Add-in (M3)
- **Office.js**, manifest (XML) — ribbon'da `Yangi alifbo` guruhi, `ExecuteFunction` tugmalari + taskpane.
- Oqim: `context.document.body.getOoxml()` → `@yangi-alifbo/office` (OOXML paket rejimi) → `body.insertOoxml(result, "Replace")`. Kolontitullar uchun `sections[i].getHeader/Footer(...)` xuddi shunday. Belgilangan qism uchun `getSelection()`.
- Afzalligi: DOCX fayl bilan **bitta va oʻsha** dvigatel ishlatiladi; formatlash saqlanadi.
- Fallback (eski Word API): paragraf boʻyicha `paragraph.getRange().getTextRanges` + `insertText(..., "Replace")`.
- Add-in statik fayllar (HTML/JS) — tashkilotning ichki serverida yoki GitHub Pages / Azure Static Web Apps'da joylashtiriladi. Tarmoqqa maʼlumot yuborilmaydi.

## 6. Texnologiyalar

| Qatlam | Tanlov | Sabab |
|---|---|---|
| Til | TypeScript (strict) | Bir kod — brauzer, Node, Office.js |
| Build | `tsc` (core), `esbuild` (add-in, web, CLI bundle) | Tez, oddiy |
| Test | `vitest` | TS bilan tayyor |
| ZIP | `jszip` | Brauzer va Node'da ishlaydi |
| Add-in | Office.js, Office Add-in manifest | Rasmiy Microsoft yoʻli, Win/Mac/Online |
| API | Node `http` + Docker | Minimal, on-premise |
| CI | GitHub Actions | test + build + release |

## 7. Kengaytirish nuqtalari
- Lugʻatlar alohida faylda (`data.ts`: EXCEPTIONS, PROTECTED_WORDS) — algoritmga tegmasdan kengaytiriladi; tashkilotlar oʻz lugʻatini qoʻsha oladi (`options.exceptions`).
- Yangi format qoʻshish = `office` paketiga yangi «part» handler.
- Yangi integratsiya = `core` ni import qilish.
