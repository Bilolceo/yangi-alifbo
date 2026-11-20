# TEXNIK TOPSHIRIQ (TZ)

## «Yangi alifbo» — eski oʻzbek yozuvidagi matnlarni 2026-yilgi yangi lotin alifbosiga avtomatik oʻgirish tizimi

| | |
|---|---|
| Versiya | 1.0 |
| Sana | 2026-11-20 |
| Holat | Tasdiqlash uchun |
| Huquqiy asos | OʻzR Qonuni OʻRQ-1184 (21.10.2026), kuchga kirishi: **22.04.2027** — https://lex.uz/uz/docs/8548754 |

---

## 1. Umumiy maʼlumot

### 1.1. Muammo
OʻRQ-1184 qonuni bilan oʻzbek lotin alifbosi 26 harf + 3 harf birikmasidan **28 harf + 1 tutuq belgisi**ga oʻtkazildi:

```
A B D E F G Ğ H I J K L M N O Ö P Q R S Ş Ç T U V X Y Z  +  ʼ (tutuq)
```

Qonun kuchga kirgach OAV, davlat organlari va rasmiy yozishmalar yangi alifboga oʻtadi. Bugungi kunda millionlab hujjatlar (Word, Excel, PowerPoint, maʼlumotlar bazalari, saytlar) eski lotin (1995) yoki kirill yozuvida. Ularni qoʻlda qayta yozish imkonsiz, oddiy «Find & Replace» esa xato beradi (apostrof turlari, tutuq belgisi, chet soʻzlar, formatlash).

### 1.2. Maqsad
Bitta **ishonchli konvertatsiya yadrosi** va uning ustiga qurilgan integratsiyalar yaratish:
foydalanuvchi Word'da **bitta tugmani bosadi** → hujjat toʻliq, formatlashi buzilmagan holda yangi alifboga oʻtadi. Xuddi shu yadro boshqa loyihalar (saytlar, davlat axborot tizimlari, bazalar) uchun kutubxona va API sifatida beriladi.

### 1.3. Foydalanuvchilar
1. Davlat tashkilotlari xodimlari (hujjat aylanishi, xatlar, buyruqlar).
2. OAV, nashriyotlar, tarjimonlar.
3. Oʻqituvchilar, talabalar, oddiy fuqarolar.
4. Dasturchilar va IT-kompaniyalar (oʻz tizimlariga integratsiya).

---

## 2. Konvertatsiya qoidalari (yadro spetsifikatsiyasi)

### 2.1. Eski lotin (1995) → yangi lotin (2026)

| Eski | Yangi | Misol |
|---|---|---|
| Oʻ oʻ | Ö ö | oʻzbek → özbek |
| Gʻ gʻ | Ğ ğ | bogʻ → boğ |
| Sh sh | Ş ş | shahar → şahar |
| Ch ch | Ç ç | choy → çoy |
| Ng ng | oʻzgarmaydi (n+g) | tong → tong |
| ʼ (tutuq) | ʼ (U+02BC) | maʼno → maʼno, sheʼr → şeʼr |

**Q-1. Apostrof variantlari.** Kirishda quyidagi belgilarning barchasi apostrof deb qabul qilinadi:
`'` U+0027, `` ` `` U+0060, `´` U+00B4, `ʻ` U+02BB, `ʼ` U+02BC, `ʹ` U+02B9, `‘` U+2018, `’` U+2019, `′` U+2032.

**Q-2. Oʻ/Gʻ aniqlash.** `o`/`g` (katta yoki kichik) dan keyin kelgan apostrof → `ö`/`ğ`. Boshqa harflardan keyin kelgan apostrof — **tutuq belgisi**; u `ʼ` (U+02BC) ga normallashtiriladi (sozlama orqali oʻchirish mumkin).

**Q-3. Soʻz chegarasidagi qoʻshtirnoq.** Soʻz boshidagi va oxiridagi apostroflar (agar oxirgi harf `o`/`g` boʻlmasa) qoʻshtirnoq hisoblanadi va oʻzgarmaydi: `'salom'` → `'salom'`.

**Q-4. Sh/Ch birlashtirish.** `s`+`h` → `ş`, `c`+`h` → `ç`. Agar ular orasida tutuq boʻlsa (`Isʼhoq`, `musʼhaf`), birlashtirilmaydi.

**Q-5. Istisnolar lugʻati.** Tutuqsiz yozilgan, lekin `s` va `h` alohida tovush boʻlgan soʻzlar (`Ishoq` → `Isʼhoq`, `ashob` → `asʼhob`) lugʻat orqali aniqlanadi. Lugʻat oʻzak (stem) boʻyicha ishlaydi, qoʻshimchalar bilan ham mos keladi (`Ishoqning` → `Isʼhoqning`). Lugʻat JSON faylda saqlanadi va foydalanuvchi uni kengaytira oladi.

**Q-6. Registr (katta-kichik harf).**
- `Sh`, `SH` → `Ş`; `sh`, `sH` → `ş` (birinchi harf registri boʻyicha).
- `Oʻ` → `Ö`, `oʻ` → `ö`.
- Toʻliq katta harfli soʻzlar katta harfligicha qoladi: `TOSHKENT` → `TOŞKENT`.

**Q-7. Himoyalangan matn (oʻgirilmaydi):**
- URL, email, fayl yoʻllari, `@mention`, `#hashtag`;
- dastur kodi (Word'da — maxsus «kod» stillari, Markdown'da — backtick ichidagi matn);
- himoyalangan soʻzlar roʻyxati (brendlar, xorijiy nomlar: `Chevrolet`, `Shell`, `Microsoft` ...);
- **chet soʻz evristikasi**: tarkibida `w`, `c` (keyin `h` boʻlmasa), `th`, `ph` boʻlgan soʻzlar oʻzbekcha emas deb hisoblanadi va oʻgirilmaydi (ogohlantirish beriladi). Bu qoidani oʻchirib qoʻyish mumkin.

**Q-8. 2021-yilgi loyiha belgilarini normallashtirish.** `ó`→`ö`, `ǵ`→`ğ`, `ŏ`→`ö`, `ğ` ning turli kombinatsiyali (combining) shakllari → NFC. Barcha natija **Unicode NFC** shaklida boʻladi.

**Q-9. Idempotentlik.** Yangi alifbodagi matnni qayta oʻgirish uni oʻzgartirmaydi: `convert(convert(x)) == convert(x)`.

### 2.2. Kirill → yangi lotin

| Kirill | Lotin | Izoh |
|---|---|---|
| а б в г д ж з и й к л м н о п р с т у ф х | a b v g d j z i y k l m n o p r s t u f x | |
| ў ғ қ ҳ | ö ğ q h | |
| ш ч | ş ç | |
| е | e / **ye** | soʻz boshida va unli, ъ, ь dan keyin → `ye` |
| ё ю я | yo yu ya | |
| ц | s / **ts** | soʻz boshida va undoshdan keyin `s`, unlidan keyin `ts` |
| щ | şç | |
| ъ | ʼ | tutuq |
| ь | (tushib qoladi) | |
| э | e | |
| ы | i | |

Koʻp harfli natijalarda registr: `Ёқуб` → `Yoqub`, `ЁҚУБ` → `YOQUB`.

### 2.3. Teskari yoʻnalish (yangi → eski lotin)
`ö→oʻ, ğ→gʻ, ş→sh, ç→ch` (eski tizimlar bilan moslik uchun). Oʻ/Gʻ uchun U+02BB ishlatiladi.

### 2.4. Qidiruv normallashtirish
`normalizeForSearch(text)` — istalgan variantdagi matnni (kirill, eski lotin, apostrofning har xil turlari, yangi lotin) bitta kanonik shaklga keltiradi (yangi lotin, kichik harf). Oʻtish davrida qidiruv tizimlari `oʻzbek`, `o'zbek`, `ўзбек`, `özbek` ni bir xil topishi uchun.

### 2.5. Hisobot
Har bir konvertatsiya ixtiyoriy ravishda hisobot qaytaradi: oʻgirilgan soʻzlar soni, himoyalangan soʻzlar, **shubhali joylar** (chet soʻz evristikasi, istisno lugʻatidan topilganlar) — pozitsiyasi bilan. Interfeys ularni foydalanuvchiga belgilab koʻrsatadi.

---

## 3. Tizim tarkibi (modullar)

| # | Modul | Tavsif | Bosqich |
|---|---|---|---|
| M1 | `@yangi-alifbo/core` | Konvertatsiya yadrosi (TypeScript, 0 bogʻliqlik, brauzer + Node) | 1 |
| M2 | `@yangi-alifbo/office` | DOCX / XLSX / PPTX fayllarni formatlashni saqlagan holda oʻgirish (OOXML) | 1 |
| M3 | Word Add-in | Word lentasida «Yangi alifbo» tugmasi (Office.js) | 1 |
| M4 | CLI | `yangi-alifbo fayl.docx` — fayl va papkalarni ommaviy oʻgirish | 1 |
| M5 | Web ilova | Matn kiritish / fayl yuklash → yuklab olish, **toʻliq brauzerda** (serverga yuborilmaydi) | 2 |
| M6 | REST API | `POST /v1/convert`, `POST /v1/convert/file` — davlat axborot tizimlari uchun, on-premise oʻrnatish (Docker) | 2 |
| M7 | Python paket | `pip install yangi-alifbo` — bazalar migratsiyasi, Django/1C integratsiya | 2 |
| M8 | Brauzer kengaytmasi | Sahifadagi / input'dagi matnni oʻgirish (Chrome, Edge, Firefox) | 3 |
| M9 | Telegram bot | Matn va fayllarni oʻgirish | 3 |
| M10 | Klaviatura sxemalari | Windows / macOS / Linux uchun Ö Ğ Ş Ç tugmalari | 3 |

---

## 4. Funksional talablar

### 4.1. Yadro (M1)
- F-1.1 `convert(text, options)` — 2-boʻlimdagi barcha qoidalar.
- F-1.2 `convertSegments(segments[], options)` — matn boʻlaklarga (Word «run»lariga) boʻlingan boʻlsa ham toʻgʻri oʻgiradi va natijani **asl boʻlaklar chegarasida** qaytaradi (`s` qalin, `h` oddiy boʻlsa ham `ş` hosil boʻladi).
- F-1.3 `toOldLatin(text)`, `normalizeForSearch(text)`, `detectScript(text)`.
- F-1.4 Sozlamalar: `from` (`auto`|`latin`|`cyrillic`), `normalizeTutuq`, `protectForeign`, `protectedWords`, `exceptions`, `report`.
- F-1.5 Istisno lugʻati va himoyalangan soʻzlar — alohida JSON fayllar, versiyalangan.

### 4.2. Office fayllar (M2)
- F-2.1 DOCX: asosiy matn, jadvallar, kolontitullar, izohlar (footnotes/endnotes), komentariyalar, matn bloklari (text box).
- F-2.2 Formatlash, stillar, rasmlar, hujjat tuzilishi **oʻzgarmaydi** — faqat `<w:t>` matnlari almashadi.
- F-2.3 XLSX (sharedStrings, inline strings; formulalar oʻgirilmaydi), PPTX (slaydlar, eslatmalar).
- F-2.4 Asl fayl hech qachon ustidan yozilmaydi (standart: `fayl.yangi.docx`).

### 4.3. Word Add-in (M3)
- F-3.1 Word lentasida «Yangi alifbo» guruhi: **«Hujjatni oʻgirish»**, **«Belgilanganni oʻgirish»**, «Sozlamalar» tugmalari.
- F-3.2 Ishlash muhiti: Word for Windows (Microsoft 365, 2016+), Word for Mac, Word Online.
- F-3.3 Bitta amal — bitta Undo (Ctrl+Z bilan qaytarish mumkin).
- F-3.4 Natija panelida hisobot: nechta soʻz oʻgirildi, shubhali soʻzlar roʻyxati (bosilganda hujjatdagi joyiga oʻtadi).
- F-3.5 Internetsiz ishlaydi (yadro add-in ichida); hujjat matni hech qayerga yuborilmaydi.
- F-3.6 Tashkilot boʻyicha markaziy oʻrnatish (Microsoft 365 Admin Center → Integrated Apps) va manifest orqali qoʻlda oʻrnatish.

### 4.4. CLI (M4)
- F-4.1 `yangi-alifbo <fayl|papka> [--out papka] [--from cyrillic] [--reverse] [--dry-run]`.
- F-4.2 Qoʻllab-quvvatlanadigan formatlar: `.txt .md .csv .json .html .docx .xlsx .pptx`.
- F-4.3 Papkani rekursiv oʻgirish, yakuniy hisobot.

### 4.5. Web (M5), API (M6)
- F-5.1 Matn maydoni (jonli oʻgirish), fayl yuklash (drag & drop), natijani yuklab olish.
- F-5.2 Barcha ishlov brauzerda (maxfiy hujjatlar uchun).
- F-6.1 REST API, OpenAPI spetsifikatsiyasi, Docker image, tashkilot ichida (on-premise) ishga tushirish, autentifikatsiya — API kalit.

---

## 5. Nofunksional talablar

| Talab | Koʻrsatkich |
|---|---|
| Aniqlik | Test korpusida ≥ 99.9 % soʻz toʻgʻri; barcha qoidalar unit-testlar bilan qoplangan |
| Tezlik | 1 MB matn < 200 ms (Node, oddiy noutbuk); 100 sahifali DOCX < 3 s |
| Xavfsizlik | Yadro va add-in tarmoqqa murojaat qilmaydi; telemetriya yoʻq; API — on-premise |
| Moslik | Node ≥ 18, zamonaviy brauzerlar, Office.js API 1.3+ |
| Hajm | `core` minified < 30 KB |
| Sifat | TypeScript strict, ESLint, CI (GitHub Actions), test qoplami ≥ 90 % (core) |
| Litsenziya | Ochiq kod (MIT) — davlat va xususiy loyihalar erkin integratsiya qilishi uchun |
| Til | Interfeys: yangi alifbo, eski lotin, kirill, rus |

---

## 6. Bosqichlar va muddatlar

| Bosqich | Ish | Natija | Muddat |
|---|---|---|---|
| 0 | TZ, arxitektura | Ushbu hujjat | 1 kun |
| 1 | core + office + CLI + Word Add-in (MVP) | Word'da tugma ishlaydi | 2 hafta |
| 2 | Web, REST API, Python paket, test korpusini kengaytirish | Ommaviy foydalanish, integratsiya | +2 hafta |
| 3 | Brauzer kengaytmasi, Telegram bot, klaviatura | Toʻliq ekotizim | +2 hafta |
| 4 | Pilot (1–2 davlat tashkiloti), lugʻatni boyitish, AppSource'ga chiqarish | Production | 22.04.2027 gacha |

## 7. Qabul qilish mezonlari
1. 2-boʻlimdagi har bir qoida uchun avtomatik test mavjud va oʻtadi.
2. Formatlash aralash boʻlgan (qalin/kursiv/rangli harflar, jadvallar, kolontitullar) test DOCX oʻgirilganda Word'da ochiladi, formatlash saqlanadi.
3. Word Add-in'da «Hujjatni oʻgirish» tugmasi butun hujjatni oʻgiradi, Ctrl+Z qaytaradi.
4. Idempotentlik testi oʻtadi.
5. Internet oʻchirilganda add-in va web ilova ishlaydi.

## 8. Ochiq masalalar va xavflar
- **Imlo qoidalari.** Qonunda faqat alifbo bor; `sh`/`ch`/tutuq imlo qoidalari Vazirlar Mahkamasi dasturi (dekabr 2026) bilan tasdiqlanishi kutilmoqda. Qoidalar chiqqach, yadro yangilanadi — shuning uchun istisnolar kodda emas, lugʻat fayllarida.
- **Shrift.** Baʼzi eski korporativ shriftlarda `Ğ ğ Ş ş Ç ç` boʻlmasligi mumkin → add-in shriftni tekshirib, ogohlantiradi.
- **Shaxs ismlari.** Pasportdagi ism eski yozuvda qoladi (Qonun 2-modda). Hujjatlarda ismlarni oʻgirmaslik sozlamasi kerak boʻlishi mumkin (himoyalangan soʻzlar roʻyxati orqali).
- **Chet soʻzlar.** Evristika 100 % emas — hisobot va qoʻlda tasdiqlash orqali yopiladi.
