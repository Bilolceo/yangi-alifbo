# Tizim tahlili modellari

«Yangi alifbo» tizimining tizim tahlili modellari, oltita metodika boʻyicha. Mermaid diagrammalarini GitHub toʻgʻridan-toʻgʻri rasm qilib koʻrsatadi; IDEF0 va BPMN alohida fayllarda.

| Metodika | Nimani koʻrsatadi | Qachon tanlanadi | Ushbu hujjatda |
|---|---|---|---|
| **DFD** | Jarayon, maʼlumot ombori, tashqi obʼekt, oqim | Tizim tahlilining boshlanishi | [1-boʻlim](#1-dfd--maʼlumotlar-oqimi-diagrammasi): kontekst (0-daraja) va 1-daraja |
| **IDEF0** | Funksiya: kirish, boshqaruv, chiqish, mexanizm | Katta tashkilot jarayonlari | [2-boʻlim](#2-idef0--funksional-model): A-0 va A0 |
| **BPMN 2.0** | Jarayon bosqichlari, rollar, qarorlar | Buyurtmachi bilan kelishish | [3-boʻlim](#3-bpmn-20--biznes-jarayon): `.bpmn` + SVG |
| **UML** | Harakat va xabarlar ketma-ketligi | Dasturchilar bilan ishlash | [4-boʻlim](#4-uml): use case, komponent, ketma-ketlik ×2, sinf, holat |
| **Sankey** | Oqim hajmi (qalinligi), yoʻqotishlar | Hajm va yoʻqotishni koʻrsatish | [5-boʻlim](#5-sankey--oqim-hajmi): korpus boʻyicha haqiqiy raqamlar |
| **Data lineage** | Maʼlumotning manbadan hisobotgacha yoʻli | Ombor, analitika, audit | [6-boʻlim](#6-data-lineage--maʼlumot-kelib-chiqishi): DOCX va bazani koʻchirish |

Barcha modellar kodga mos keladi va kod oʻzgarganda shu hujjat yangilanadi.

| Fayl | Nima | Qayta yaratish |
|---|---|---|
| `diagrams/idef0-a-0.svg`, `idef0-a0.svg` | IDEF0 | `python3 scripts/diagrams/idef0.py docs/diagrams` |
| `diagrams/bpmn-hujjat-otkazish.bpmn` (+ `.svg`) | BPMN 2.0 XML | `python3 scripts/diagrams/bpmn.py docs/diagrams/bpmn-hujjat-otkazish.bpmn` → bpmn.io'da SVG eksport |
| `diagrams/uml-usecase.svg` | UML use case | `python3 scripts/diagrams/usecase.py docs/diagrams/uml-usecase.svg` |
| `diagrams/sankey-*.svg`, `sankey-data.json` | Sankey | `node scripts/korpus-stats.mjs` → `diagrams/sankey.html` |
| Mermaid bloklari (shu faylda) | DFD, UML, Data lineage | GitHub avtomatik chizadi |

---

## 1. DFD — maʼlumotlar oqimi diagrammasi

Belgilar: **toʻrtburchak** — tashqi obʼekt, **doira** — jarayon (raqamli, Yourdon–DeMarco), **silindr** — maʼlumot ombori (D1…D3), **strelka** — maʼlumot oqimi (nomi bilan).

### 1.1. Kontekst diagrammasi (0-daraja)

```mermaid
flowchart LR
  U["👤 Foydalanuvchi<br/>(ish yurituvchi, fuqaro)"]
  W["🗂 Microsoft Word"]
  B["🌐 Brauzer / istalgan sayt"]
  S["🏛 Tashkilot axborot tizimi<br/>(EDO, 1C, CRM, sayt)"]
  R["⚖️ Qonunchilik<br/>(OʻRQ-1184, imlo qoidalari)"]

  P(("0<br/>«Yangi alifbo»<br/>tizimi"))

  U -- "eski matn / fayl, sozlamalar" --> P
  P -- "yangi alifbodagi matn / fayl, hisobot" --> U
  W -- "hujjat OOXML" --> P
  P -- "oʻgirilgan OOXML" --> W
  B -- "belgilangan matn / sahifa DOM" --> P
  P -- "oʻgirilgan matn" --> B
  S -- "API soʻrov (JSON / fayl)" --> P
  P -- "API javob, X-Words-Changed" --> S
  R -. "alifbo va imlo qoidalari" .-> P
```

### 1.2. 1-daraja diagramma

```mermaid
flowchart TB
  U["👤 Foydalanuvchi"]
  W["🗂 Word"]
  S["🏛 Axborot tizimi"]
  R["⚖️ Qonunchilik"]

  P1(("1.0<br/>Kirishni qabul<br/>qilish va oʻqish"))
  P2(("2.0<br/>Yozuvni aniqlash,<br/>himoya, tokenlash"))
  P3(("3.0<br/>Konvertatsiya<br/>qoidalarini qoʻllash"))
  P4(("4.0<br/>Natijani yigʻish<br/>va hisobot"))
  P5(("5.0<br/>Lugʻatlarni<br/>yuritish"))

  D1[("D1 Istisnolar lugʻati<br/>(is|hoq, as|hob…)")]
  D2[("D2 Himoyalangan soʻzlar<br/>(brendlar, chet soʻzlar)")]
  D3[("D3 Foydalanuvchi sozlamalari<br/>(localStorage / chrome.storage)")]

  U -- "matn / DOCX, XLSX, PPTX" --> P1
  W -- "getOoxml()" --> P1
  S -- "POST /v1/convert, /v1/convert/file" --> P1
  P1 -- "matn segmentlari (run'lar)" --> P2
  D3 -- "manba yozuvi, chet soʻz himoyasi" --> P2
  D2 -- "himoyalangan soʻzlar" --> P2
  P2 -- "soʻzlar + himoyalangan oraliqlar" --> P3
  D1 -- "birlashtirmaslik nuqtalari" --> P3
  R -- "oʻ→ö, gʻ→ğ, sh→ş, ch→ç, tutuq" --> P3
  P3 -- "boʻlaklar (Piece[])" --> P4
  P4 -- "yangi hujjat / matn" --> U
  P4 -- "insertOoxml()" --> W
  P4 -- "JSON / fayl javobi" --> S
  P4 -- "shubhali soʻzlar hisoboti" --> P5
  U -- "tasdiqlangan istisno / himoya" --> P5
  P5 --> D1
  P5 --> D2
```

---

## 2. IDEF0 — funksional model

Strelkalar: **chapdan** — kirish (I), **yuqoridan** — boshqaruv (C), **oʻngga** — chiqish (O), **pastdan** — mexanizm (M).

### 2.1. A-0 — kontekst

![IDEF0 A-0](diagrams/idef0-a-0.svg)

| Strelka | Mazmuni |
|---|---|
| I1 | Eski yozuvdagi hujjat yoki matn (lotin 1995, kirill; DOCX, XLSX, PPTX, TXT) |
| I2 | Foydalanuvchi sozlamalari |
| C1 | OʻRQ-1184 Qonuni — 28 harf + tutuq belgisi |
| C2 | Imlo qoidalari (Vazirlar Mahkamasi dasturi) |
| C3 | Istisno va himoyalangan soʻzlar lugʻati |
| O1 | Yangi alifbodagi hujjat (formatlash saqlangan) |
| O2 | Hisobot: oʻgirilgan, shubhali va himoyalangan soʻzlar |
| M1 | `@yangi-alifbo/core` — konvertatsiya yadrosi |
| M2 | Integratsiyalar: Word Add-in, veb-ilova, REST API, brauzer kengaytmasi, CLI |
| M3 | Foydalanuvchi / masʼul tekshiruvchi |

### 2.2. A0 — dekompozitsiya

![IDEF0 A0](diagrams/idef0-a0.svg)

| Blok | Funksiya | Kodda |
|---|---|---|
| A1 | Hujjatni qabul qilish va oʻqish | `packages/office/src/xml.ts`, `apps/word-addin/src/word.ts`, `apps/extension/src/dom.ts` |
| A2 | Yozuvni aniqlash, himoya va tokenlash | `packages/core/src/engine.ts` → `buildPieces` (1–2-bosqich) |
| A3 | Konvertatsiya qoidalarini qoʻllash | `engine.ts` → `convertWord`, `convertCyrChar` |
| A4 | Natijani yigʻish va hisobot | `index.ts` → `convertSegments`, `convertWithReport`; `office` → ZIP |

---

## 3. BPMN 2.0 — biznes jarayon

**Jarayon:** davlat tashkilotida hujjatni yangi alifboga oʻtkazish. **Rollar (lane):** ish yurituvchi, «Yangi alifbo» tizimi, masʼul tekshiruvchi.

![BPMN 2.0](diagrams/bpmn-hujjat-otkazish.svg)

- Manba fayl: [`diagrams/bpmn-hujjat-otkazish.bpmn`](diagrams/bpmn-hujjat-otkazish.bpmn). Standart BPMN 2.0 XML formatida: [bpmn.io](https://demo.bpmn.io), Camunda Modeler va Bizagi'da ochiladi va tahrirlanadi.
- **Qaror nuqtalari:** «Shubhali soʻzlar bormi?» va «Lugʻatga qoʻshish kerakmi?».
- **Teskari aloqa sikli:** tekshiruvchi soʻzni lugʻatga qoʻshadi, hujjat qayta oʻgiriladi. Bu qadam keyingi barcha hujjatlarda aniqlikni oshiradi.

| Element | Turi | Bajaruvchi | Tizimdagi mos funksiya |
|---|---|---|---|
| Hujjatni Word'da ochish | User task | Ish yurituvchi | — |
| «Hujjatni öğiriş» tugmasini bosish | User task | Ish yurituvchi | Word lentasidagi tugma |
| Yozuvni aniqlash va oʻgirish | Service task | Tizim | `convertInWord()` → `convertXml()` |
| Hisobot shakllantirish | Service task | Tizim | `ConvertWarning[]` → panel |
| Shubhali soʻzlarni tekshirish | User task | Tekshiruvchi | Paneldagi roʻyxat (bosilganda soʻz belgilanadi) |
| Soʻzni lugʻatga qoʻshish | User task | Tekshiruvchi | Sozlamalar → «Oʻgirilmaydigan soʻzlar» |
| Hujjatni saqlash va yuborish | User task | Ish yurituvchi | — |

---

## 4. UML

### 4.1. Use case diagramma

![UML use case](diagrams/uml-usecase.svg)

| Aktor | Holatlar (use case) |
|---|---|
| Ish yurituvchi | Word hujjatini oʻgirish, belgilangan matnni oʻgirish, faylni yuklab oʻgirish |
| Fuqaro | Faylni yuklab oʻgirish, saytdagi matnni oʻgirish |
| Masʼul tekshiruvchi | Hisobotni koʻrish, lugʻatni yuritish |
| Tashqi axborot tizimi | API orqali oʻgirish, qidiruv uchun normallashtirish |
| Administrator | Tizimni oʻrnatish (Docker, Microsoft 365) |

Oʻgirish holatlari «Hisobotni koʻrish» holatini **«include»** qiladi: har bir oʻgirishdan keyin hisobot shakllanadi.

### 4.2. Komponent diagramma

```mermaid
flowchart TB
  subgraph Clients["Mijozlar"]
    WA["«component»<br/>Word Add-in<br/>(Office.js)"]
    WEB["«component»<br/>Veb-ilova"]
    EXT["«component»<br/>Brauzer kengaytmasi<br/>(MV3)"]
    CLI["«component»<br/>CLI"]
  end
  subgraph Server["Server (Docker)"]
    API["«component»<br/>REST API<br/>/v1/convert, /v1/convert/file"]
  end
  subgraph Libs["Kutubxonalar"]
    OFF["«component»<br/>@yangi-alifbo/office<br/>OOXML: DOCX, XLSX, PPTX"]
    CORE["«component»<br/>@yangi-alifbo/core<br/>convert · convertSegments ·<br/>toOldLatin · normalizeForSearch"]
    DATA[("«artifact»<br/>data.ts<br/>EXCEPTIONS, PROTECTED_WORDS")]
  end
  WA --> OFF
  WA --> CORE
  WEB --> OFF
  WEB --> CORE
  EXT --> CORE
  CLI --> OFF
  CLI --> CORE
  API --> OFF
  API --> CORE
  OFF --> CORE
  CORE --> DATA
```

### 4.3. Ketma-ketlik: Word'da «Hujjatni öğiriş» tugmasi

```mermaid
sequenceDiagram
  autonumber
  actor X as Ish yurituvchi
  participant R as Word lentasi
  participant C as commands.ts
  participant O as Office.js (Word API)
  participant XM as office/xml.ts
  participant K as core

  X->>R: «Hujjatni öğiriş» tugmasini bosadi
  R->>C: convertDocument(event)
  C->>O: Word.run(ctx)
  O-->>C: body + kolontitullar
  C->>O: getOoxml() (har bir qism)
  O-->>C: Flat OPC XML
  loop har bir paragraf (w:p)
    C->>XM: convertXml(xml, DOCX)
    XM->>K: convertSegments(run'lar)
    K-->>XM: yangi segmentlar + ogohlantirishlar
  end
  XM-->>C: yangi XML, words, warnings
  alt oʻzgarish bor
    C->>O: insertOoxml(xml, Replace)
    C->>O: ortiqcha boʻsh paragrafni oʻchirish
  else oʻzgarish yoʻq
    C-->>C: hech narsa qilmaydi
  end
  C->>R: event.completed()
  R-->>X: hujjat yangi alifboda
```

### 4.4. Ketma-ketlik: API orqali faylni oʻgirish

```mermaid
sequenceDiagram
  autonumber
  participant S as Tashqi tizim (EDO / 1C)
  participant A as REST API
  participant OF as office
  participant K as core

  S->>A: POST /v1/convert/file?filename=buyruq.docx<br/>Authorization: Bearer #lt;kalit#gt;
  A->>A: API kalitni tekshirish (timingSafeEqual)
  alt kalit notoʻgʻri
    A-->>S: 401 / 403
  end
  A->>A: hajm ≤ MAX_BODY_MB
  A->>OF: convertOfficeFile(bytes)
  OF->>OF: ZIP ochish, kerakli XML qismlarni tanlash
  loop har bir qism
    OF->>K: convertSegments(…)
    K-->>OF: natija
  end
  OF-->>A: yangi DOCX + hisobot
  A-->>S: 200, buyruq.yangi.docx<br/>X-Words-Changed, X-Warnings
```

### 4.5. Sinf diagrammasi (core API)

```mermaid
classDiagram
  class ConvertOptions {
    +from: "auto" | "latin" | "cyrillic"
    +normalizeTutuq: boolean
    +protectForeign: boolean
    +protectedWords: string[]
    +exceptions: string[]
    +insertTutuq: boolean
    +protectSpecial: boolean
  }
  class Piece {
    +start: number
    +end: number
    +text: string
    +same?: boolean
  }
  class ConvertWarning {
    +start: number
    +end: number
    +word: string
    +reason: "foreign" | "protected" | "exception"
  }
  class ConvertReport {
    +text: string
    +changes: number
    +warnings: ConvertWarning[]
  }
  class Core {
    <<module>>
    +convert(text, options) string
    +convertWithReport(text, options) ConvertReport
    +convertSegments(segments, options) string[]
    +toOldLatin(text) string
    +normalizeForSearch(text) string
    +detectScript(text) Script
    +buildPieces(text, options) Piece[]
  }
  class Office {
    <<module>>
    +convertOfficeFile(bytes, options) data, OfficeReport
    +convertXml(xml, dialect, options) XmlResult
  }
  Core ..> ConvertOptions : foydalanadi
  Core ..> Piece : yaratadi
  Core ..> ConvertReport : qaytaradi
  ConvertReport "1" *-- "0..*" ConvertWarning
  Office ..> Core : chaqiradi
```

### 4.6. Holat diagrammasi: hujjatning hayot sikli

```mermaid
stateDiagram-v2
  [*] --> EskiYozuvda: hujjat yaratilgan (lotin 1995 / kirill)
  EskiYozuvda --> Oʻgirilgan: «Hujjatni öğiriş»
  Oʻgirilgan --> Tekshiruvda: shubhali soʻzlar bor
  Oʻgirilgan --> Tayyor: shubhali soʻz yoʻq
  Tekshiruvda --> EskiYozuvda: lugʻat yangilandi → qayta oʻgirish
  Tekshiruvda --> Tayyor: tasdiqlandi
  Tayyor --> [*]: saqlandi / yuborildi
```

---

## 5. Sankey — oqim hajmi

Raqamlar `docs/korpus/` dagi 3 ta namuna hujjat (qaror, kirill xat, aralash yangilik — 304 soʻz) asosida **hisoblangan**:

```bash
node scripts/korpus-stats.mjs          # → docs/diagrams/sankey-data.json
# docs/diagrams/sankey.html — diagrammani qayta chizish va SVG eksport (d3-sankey)
```

> Sankey d3-sankey bilan chizilgan: Mermaid'ning `sankey-beta` moduli faqat ASCII belgilarni qabul qiladi, Ö Ğ Ş Ç va kirill harflarini koʻrsata olmaydi.

### 5.1. Soʻzlar: nimasi oʻgirildi, nimasi himoyalandi

![Sankey — soʻzlar](diagrams/sankey-sozlar.svg)

| Toifa | Soni | Ulushi |
|---|---:|---:|
| Oʻgirildi | 147 | 48,4 % |
| Oʻzgarish shart emas (oʻgiriladigan harf yoʻq) | 143 | 47,0 % |
| Himoyalandi (URL, email, hashtag, chet soʻz, brend) | 14 | 4,6 % |
| **Notoʻgʻri oʻgirilgan** (qoʻlda tekshirildi) | **0** | **0 %** |

**Yoʻqotishlar:** maʼlumot yoʻqolmaydi. Himoyalangan soʻzlar ataylab oʻzgarishsiz qoldiriladi va hisobotda koʻrsatiladi.

### 5.2. Harflar: eski → yangi

![Sankey — harflar](diagrams/sankey-harflar.svg)

Bundan tashqari, kirilldagi boshqa harflar (а→a, т→t va hokazo) boʻyicha 407 ta almashinuv bor. Ular diagrammani bosib ketmasligi uchun koʻrsatilmagan.

---

## 6. Data lineage — maʼlumot kelib chiqishi

### 6.1. Word hujjati: fayldan hisobotgacha

```mermaid
flowchart LR
  subgraph SRC["Manba"]
    F1["buyruq.docx<br/>(ZIP)"]
  end
  subgraph EXTRACT["Ajratish (office)"]
    X1["word/document.xml<br/>header*.xml, footer*.xml<br/>footnotes, endnotes, comments"]
    X2["docProps/core.xml<br/>(dc:title, dc:subject)"]
    X3["#lt;w:p#gt; paragraf → #lt;w:t#gt; run'lar<br/>(#lt;w:tab#gt;, #lt;w:br#gt; = ajratuvchi)"]
  end
  subgraph TRANSFORM["Oʻgirish (core)"]
    T1["segmentlar: string[]"]
    T2["buildPieces → Piece[]<br/>(start, end, text, same)"]
    T3["convertSegments → segmentlar<br/>(harf oʻz run'ida qoladi)"]
  end
  subgraph LOAD["Yigʻish"]
    L1["#lt;w:t#gt; ichi almashtiriladi<br/>(stil, rasm, jadval tegilmaydi)"]
    L2["buyruq.yangi.docx"]
  end
  subgraph REPORT["Hisobot / audit"]
    R1["words: oʻgirilgan soʻzlar"]
    R2["warnings: soʻz, sabab, qism<br/>(foreign / protected / exception)"]
    R3["X-Words-Changed, X-Warnings<br/>(API sarlavhalari)"]
  end
  F1 --> X1 --> X3 --> T1 --> T2 --> T3 --> L1 --> L2
  F1 --> X2 --> T1
  T2 --> R1
  T2 --> R2
  R1 --> R3
  R2 --> R3
  F1 -. "asl fayl oʻzgarmaydi" .-> L2
```

### 6.2. Maʼlumotlar bazasini koʻchirish (tavsiya etilgan sxema)

```mermaid
flowchart LR
  subgraph OLD["Eski jadval"]
    C1["fio (kirill / lotin)"]
    C2["manzil"]
    C3["izoh"]
  end
  subgraph API["Oʻgirish"]
    A1["POST /v1/convert<br/>texts: 1000 tagacha"]
    A2["POST /v1/normalize"]
  end
  subgraph NEW["Yangi jadval"]
    N1["fio_yangi"]
    N2["manzil_yangi"]
    N3["izoh_yangi"]
    N4["qidiruv_kaliti<br/>(normalizeForSearch)"]
    N5["ogirildi_at, warnings_json<br/>(audit)"]
  end
  C1 --> A1 --> N1
  C2 --> A1 --> N2
  C3 --> A1 --> N3
  C1 --> A2 --> N4
  C2 --> A2
  A1 --> N5
  C1 -. "asl ustun oʻchirilmaydi<br/>(pasport maʼlumoti — Qonun 2-modda)" .-> N1
```

**Audit qoidalari:**
1. Asl ustunlar saqlanadi. Qonunning 2-moddasiga koʻra, eski yozuvdagi hujjatlar kuchida qoladi.
2. Har bir yozuv uchun oʻgirilgan vaqt va ogohlantirishlar (`warnings_json`) yoziladi.
3. Qidiruv `qidiruv_kaliti` boʻyicha olib boriladi, shunda `oʻzbek`, `ўзбек` va `özbek` bir xil topiladi.
