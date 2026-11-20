# Joylashtirish (deploy)

Uchta usul — tashkilot ehtiyojiga qarab.

| Usul | Nima beradi | Kimga |
|---|---|---|
| **A. GitHub Pages** | Veb-ilova + Word Add-in (statik, bepul, HTTPS) | Ommaviy foydalanish, demo |
| **B. Docker + Caddy** | Veb-ilova + Word Add-in + REST API, oʻz serveringizda | Davlat tashkilotlari (maʼlumot ichkarida qoladi) |
| **C. Statik hosting** | `site/` papkasi — nginx, IIS, S3 | Mavjud veb-server boʻlsa |

---

## A. GitHub Pages (avtomatik)

1. Repozitoriyni GitHub'ga joylang (`main` branch).
2. **Settings → Pages → Source: GitHub Actions**.
3. Har bir `main` ga push → `.github/workflows/pages.yml` testlarni oʻtkazadi, saytni yigʻadi va joylaydi:
   - Veb-ilova: `https://<user>.github.io/<repo>/`
   - Word manifest: `https://<user>.github.io/<repo>/addin/manifest.xml`
4. Oʻz domeningiz boʻlsa: **Settings → Pages → Custom domain**, keyin **Settings → Variables → Actions** da `SITE_URL=https://alifbo.example.uz`.

> GitHub Pages bepul tarifda faqat **public** repozitoriyda ishlaydi.

## B. Oʻz serveringiz (Docker + avtomatik HTTPS)

Talab: Linux server, Docker, domen (masalan `alifbo.tashkilot.uz`) serverga yoʻnaltirilgan, 80/443 portlar ochiq.

```bash
git clone <repo> yangi-alifbo && cd yangi-alifbo/deploy
cat > .env <<ENV
DOMAIN=alifbo.tashkilot.uz
API_KEYS=$(openssl rand -hex 24)
IMAGE=ghcr.io/<owner>/<repo>:main
ENV
docker compose -f docker-compose.prod.yml up -d
```

- Image `ghcr.io/<owner>/<repo>` ni `.github/workflows/docker.yml` har push'da yigʻadi (amd64 + arm64).
- **Muhim:** Word Add-in manifesti build paytida domenga bogʻlanadi. GHCR image uchun repo'da
  `DOCKER_SITE_URL=https://alifbo.tashkilot.uz` oʻzgaruvchisini oʻrnating yoki serverda mahalliy build qiling
  (`docker-compose.prod.yml` dagi `build:` blokini yoqing).
- Internetsiz (yopiq tarmoq): image'ni `docker save` / `docker load` bilan koʻchiring; Caddy oʻrniga ichki sertifikat bilan nginx.

Tekshirish:

```bash
curl https://alifbo.tashkilot.uz/health
curl -X POST https://alifbo.tashkilot.uz/v1/convert -H "Authorization: Bearer $API_KEYS" \
     -H 'Content-Type: application/json' -d '{"text":"Toshkent shahri"}'
```

## C. Statik hosting

```bash
SITE_URL=https://alifbo.tashkilot.uz node scripts/build-site.mjs   # → site/
```

`site/` ni veb-server ildiziga koʻchiring. HTTPS majburiy (Office talabi).

---

## Word Add-in'ni tarqatish

**Bitta foydalanuvchi:** Word → Insert → Add-ins → *Upload My Add-in* → `…/addin/manifest.xml` (yuklab olingan fayl).

**Butun tashkilot (tavsiya):**
1. Microsoft 365 Admin Center → **Settings → Integrated apps → Upload custom apps**.
2. *Office Add-in* → manifest URL: `https://<domen>/addin/manifest.xml`.
3. Foydalanuvchilar/guruhlarni tanlang → **Deploy**. 24 soat ichida hammaning Word'ida «Yangi alifbo» guruhi paydo boʻladi.

**Microsoft 365 boʻlmagan (on-premise Office 2016/2019):** tarmoq papkasi (SMB share) orqali
*Trusted Add-in Catalog* — Word → File → Options → Trust Center → Trusted Add-in Catalogs.

## Yangilash

- Kod `main` ga push qilinsa: CI → Pages va GHCR avtomatik yangilanadi. Add-in fayllari serverdan yuklanadi —
  foydalanuvchilarda **qayta oʻrnatish shart emas**. Manifest oʻzgarsa (tugmalar, URL) — `<Version>` ni oshiring.
- Versiya chiqarish: `git tag v0.2.0 && git push --tags` → GitHub Release (CLI, manifest, sayt ZIP) + Docker `:0.2.0`.
