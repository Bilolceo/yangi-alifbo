# Chrome Web Store'ga chiqarish

## 1. Tayyorgarlik (bir marta)
1. https://chrome.google.com/webstore/devconsole — Google hisobi bilan kiring, **$5** roʻyxatdan oʻtish toʻlovi.
2. Ishlab chiquvchi email manzilini tasdiqlang.

## 2. Paket
```bash
npm run zip -w apps/extension   # apps/extension/yangi-alifbo-extension-<versiya>.zip
```
Versiya `apps/extension/package.json` dagi `version` dan olinadi — har yangilashda oshiring.
Teg qoʻyilsa (`git tag v0.2.0`) ZIP GitHub Release'ga ham avtomatik qoʻshiladi.

## 3. Doʻkon sahifasi matnlari

**Nomi:** Yangi alifbo — özbek lotin 2026

**Qisqa tavsif (132 belgigacha):**
Eski lotin va kirill yozuvidagi matnni istalgan saytda 2026-yilgi yangi özbek alifbosiga öğiradi. Internetsiz işlaydi.

**Toʻliq tavsif:**
```
2026-yil 21-oktabrdagi OʻRQ-1184 Qonuni bilan tasdiqlangan yangi özbek alifbosi (28 harf: Ö, Ğ, Ş, Ç) uçun.

Imkoniyatlar:
• Matnni belgilang → öng tugma → «Yangi alifboga öğiriş». Gmail, Telegram Web, formalar va istalgan saytda işlaydi.
• Ctrl+Shift+Y — belgilangan matnni yoki yozayotgan maydoningizni bir zumda öğiradi.
• «Sahifani yangi alifboda körsatiş» — butun sahifani yangi alifboda öqiş.
• Kengaytma oynasida tezkor konvertor.
• Eski lotin (oʻ, gʻ, sh, ch — apostrofning barça turlari) va kirill yozuvini taniydi.
• Tutuq belgisi (maʼno, şeʼr), istisnolar (Isʼhoq), URL, email va çet sözlar (Microsoft, Washington) töğri işlanadi.

Maxfiylik: matn heç qayerga yuborilmaydi, hammasi brauzeringiz içida bajariladi. Reklama va kuzatuv yöq.
Oçiq kod (MIT): https://github.com/Bilolceo/yangi-alifbo
```

**Kategoriya:** Productivity (Tools) · **Til:** Uzbek

**Maxfiylik siyosati URL:** https://bilolceo.github.io/yangi-alifbo/privacy.html

## 4. «Privacy practices» boʻlimi (ruxsatlar asosi)
| Ruxsat | Asos (doʻkon formasiga) |
|---|---|
| `activeTab` | Foydalanuvchi buyruq berganda (menyu, tugma, qisqa tugma) faqat joriy varaqdagi matnni oʻgirish uchun. |
| `scripting` | Oʻgirish skriptini foydalanuvchi buyrugʻi bilan joriy varaqqa kiritish uchun. |
| `contextMenus` | Oʻng tugma menyusida «Yangi alifboga öğiriş» bandi uchun. |
| `storage` | Foydalanuvchi sozlamalarini (manba yozuvi, himoyalangan soʻzlar) saqlash uchun. |
| Remote code | **Yoʻq** — barcha kod paket ichida. |
| Data usage | Hech qanday foydalanuvchi maʼlumoti yigʻilmaydi va uzatilmaydi. |

`host_permissions` soʻralmaydi — bu tekshiruvni tezlashtiradi (odatda 1–3 kun).

## 5. Rasmlar
- Ikonka 128×128: `apps/extension/icons/icon-128.png`
- Skrinshotlar 1280×800 (kamida 1 ta): popup, Gmail'da kontekst menyu, sahifa oʻgirilgan holati.
- Kichik promo 440×280 (ixtiyoriy).

## 6. Microsoft Edge Add-ons
Xuddi shu ZIP: https://partner.microsoft.com/dashboard/microsoftedge — bepul.

## 7. Tashkilotda majburiy oʻrnatish
Google Admin Console → Devices → Chrome → Apps & extensions → kengaytma ID'si → *Force install*.
Windows GPO: `ExtensionInstallForcelist` siyosati.
