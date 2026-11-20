# Yangi alifbo

[![CI](https://github.com/Bilolceo/yangi-alifbo/actions/workflows/ci.yml/badge.svg)](https://github.com/Bilolceo/yangi-alifbo/actions/workflows/ci.yml)
[![Pages](https://github.com/Bilolceo/yangi-alifbo/actions/workflows/pages.yml/badge.svg)](https://bilolceo.github.io/yangi-alifbo/)

**🌐 Veb-ilova: https://bilolceo.github.io/yangi-alifbo/** · Word manifest: https://bilolceo.github.io/yangi-alifbo/addin/manifest.xml

Eski oʻzbek lotin (1995) va kirill yozuvidagi matn va hujjatlarni **2026-yilgi yangi lotin alifbosiga**
(OʻRQ-1184, kuchga kirishi 22.04.2027) avtomatik oʻgirish tizimi.

```
Oʻzbekiston → Özbekiston   bogʻ → boğ   shahar → şahar   choy → çoy   Ўзбекистон → Özbekiston
```

- 📄 [Texnik topshiriq (TZ)](docs/TZ.md)
- 🏗 [Arxitektura](docs/ARCHITECTURE.md)
- 🚀 [Joylashtirish (deploy)](docs/DEPLOY.md)

## Tarkibi

| Paket | Vazifa |
|---|---|
| `packages/core` | Konvertatsiya yadrosi — 0 bogʻliqlik, brauzer + Node |
| `packages/office` | DOCX / XLSX / PPTX — formatlashni saqlagan holda |
| `packages/cli` | `yangi-alifbo` buyrugʻi — fayl va papkalarni ommaviy oʻgirish |
| `apps/word-addin` | Word lentasida «Yangi alifbo» tugmasi (Office.js) |
| `apps/web` | Veb-ilova: matn + fayl yuklash, **hammasi brauzerda** (fayl serverga yuborilmaydi) |
| `apps/api` | REST API + Docker — davlat axborot tizimlari uchun (on-premise) |

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

## Veb-ilova

```bash
npm run dev -w apps/web      # http://localhost:5173
npm run build -w apps/web    # apps/web/dist — istalgan statik hostingga (nginx, GitHub Pages)
```

Matn (jonli oʻgirish, eski↔yangi), fayllar (DOCX/XLSX/PPTX/TXT/CSV…, drag & drop, ZIP),
alifbo jadvali. Eski Windows-1251 kirill `.txt` fayllar ham avtomatik taniladi.

## REST API va Docker

```bash
docker compose up -d --build                 # http://localhost:8080 — veb-ilova + API
API_KEYS=kalit1,kalit2 docker compose up -d  # autentifikatsiya bilan
```

```bash
curl -X POST localhost:8080/v1/convert -H 'Content-Type: application/json' \
     -H 'Authorization: Bearer kalit1' -d '{"text":"Oʻzbekiston, Toshkent shahri"}'
# {"text":"Özbekiston, Toşkent şahri","changes":3,"warnings":[]}

curl -X POST 'localhost:8080/v1/convert/file?filename=buyruq.docx' \
     -H 'X-API-Key: kalit1' --data-binary @buyruq.docx -o buyruq.yangi.docx
```

| Endpoint | Vazifa |
|---|---|
| `POST /v1/convert` | `{text}` yoki `{texts:[…]}` (maks. 1000), `direction: new\|old`, `options` |
| `POST /v1/convert/file?filename=…` | Fayl (binary) → oʻgirilgan fayl; `X-Words-Changed` sarlavhasi |
| `POST /v1/normalize` | Qidiruv uchun kanonik shakl |
| `POST /v1/detect` | Yozuvni aniqlash |
| `GET /health`, `GET /openapi.json` | Holat, OpenAPI spetsifikatsiyasi |

Muhit oʻzgaruvchilari: `PORT` (8080), `API_KEYS`, `MAX_BODY_MB` (25), `MAX_BATCH` (1000), `CORS_ORIGIN`, `STATIC_DIR`.

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
