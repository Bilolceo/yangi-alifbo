# Yangi alifbo

Eski oʻzbek lotin (1995) va kirill yozuvidagi matn va hujjatlarni **2026-yilgi yangi lotin alifbosiga**
(OʻRQ-1184, kuchga kirishi 22.04.2027) avtomatik oʻgirish tizimi.

```
Oʻzbekiston → Özbekiston   bogʻ → boğ   shahar → şahar   choy → çoy   Ўзбекистон → Özbekiston
```

- 📄 [Texnik topshiriq (TZ)](docs/TZ.md)
- 🏗 [Arxitektura](docs/ARCHITECTURE.md)

## Tarkibi

| Paket | Vazifa |
|---|---|
| `packages/core` | Konvertatsiya yadrosi — 0 bogʻliqlik, brauzer + Node |
| `packages/office` | DOCX / XLSX / PPTX — formatlashni saqlagan holda |
| `packages/cli` | `yangi-alifbo` buyrugʻi — fayl va papkalarni ommaviy oʻgirish |
| `apps/word-addin` | Word lentasida «Yangi alifbo» tugmasi (Office.js) |

## Tez boshlash

```bash
npm install
npm test                      # barcha testlar
npm run build                 # core, office, cli

# CLI
node packages/cli/dist/cli.js hujjat.docx          # → hujjat.yangi.docx
node packages/cli/dist/cli.js papka/ -o natija/ -v  # butun papka
echo "Oʻzbekiston" | node packages/cli/dist/cli.js -
```

## Kutubxona sifatida

```ts
import { convert, convertWithReport, convertSegments, toOldLatin, normalizeForSearch } from "@yangi-alifbo/core";

convert("Toshkent shahridagi bogʻlar");          // "Toşkent şahridagi boğlar"
convert("Ўзбекистон Республикаси");              // "Özbekiston Respublikasi"
toOldLatin("Özbekiston");                         // "Oʻzbekiston"
normalizeForSearch("o'zbek") === normalizeForSearch("ўзбек"); // true — qidiruv uchun

import { convertOfficeFile } from "@yangi-alifbo/office";
const { data, report } = await convertOfficeFile(docxBytes);
```

## Word Add-in

```bash
cd apps/word-addin
npm run certs        # bir marta: localhost uchun HTTPS sertifikat
npm run build
npm run dev          # https://localhost:3000
npm run sideload     # Word Desktop'ga yuklash (Windows/Mac)
```

Word Online: *Insert → Add-ins → Upload My Add-in* → `apps/word-addin/manifest.xml`.
Tashkilot boʻyicha: Microsoft 365 Admin Center → *Integrated apps* → manifestni yuklash
(oldin manifestdagi `https://localhost:3000` ni oʻz serveringiz manziliga almashtiring va `ADDIN_BASE_URL` bilan build qiling).

Lentada: **Hujjatni öğiriş** · **Belgilanganni öğiriş** · **Sozlamalar** (panel: hisobot, şubhali sözlar, matn konvertori).

## Qoidalar (qisqa)

- `oʻ gʻ` (har qanday apostrof: `' ‘ ’ ʻ ʼ \``) → `ö ğ`; `sh ch` → `ş ç`; `ng` oʻzgarmaydi.
- Boshqa harflardan keyingi apostrof — tutuq → `ʼ` (U+02BC): `maʼno`, `şeʼr`.
- `Isʼhoq` (tutuq bilan) birlashtirilmaydi; tutuqsiz `Ishoq` — istisno lugʻati orqali → `Isʼhoq`.
- URL, email, `@`/`#`, `kod`, brendlar va chet soʻzlar (`w`, `c`, `th`, `ph`, `ee`, `oo`) oʻgirilmaydi va hisobotda koʻrsatiladi.
- Natija idempotent va Unicode NFC.

Litsenziya: MIT
