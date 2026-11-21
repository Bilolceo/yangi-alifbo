# IDEF0 diagrammalarini SVG koʻrinishida yaratish (A-0 va A0)
import html, sys
OUT = sys.argv[1]
FONT = "font-family='Segoe UI, Arial, sans-serif'"
def esc(s): return html.escape(s)

def head(w, h, title):
    return [f"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 {w} {h}' width='{w}' height='{h}' {FONT}>",
            "<defs><marker id='a' viewBox='0 0 10 10' refX='9' refY='5' markerWidth='8' markerHeight='8' orient='auto-start-reverse'><path d='M0,0 L10,5 L0,10 z' fill='#1b1f24'/></marker></defs>",
            f"<rect width='{w}' height='{h}' fill='#ffffff'/>",
            f"<text x='20' y='30' font-size='18' font-weight='700' fill='#1b1f24'>{esc(title)}</text>"]

def text_lines(x, y, lines, size=13, anchor="start", weight="400", color="#1b1f24"):
    out = []
    for i, l in enumerate(lines):
        out.append(f"<text x='{x}' y='{y + i*(size+4)}' font-size='{size}' text-anchor='{anchor}' font-weight='{weight}' fill='{color}'>{esc(l)}</text>")
    return out

def box(x, y, w, h, lines, code):
    o = [f"<rect x='{x}' y='{y}' width='{w}' height='{h}' fill='#e8f0fe' stroke='#1f6feb' stroke-width='2'/>"]
    o += text_lines(x + w/2, y + h/2 - (len(lines)-1)*8.5 + 4, lines, 14, "middle", "600")
    o += text_lines(x + w - 8, y + h - 8, [code], 12, "end", "700", "#1f6feb")
    return o

def arrow(pts, label=None, lx=None, ly=None, anchor="start", lines=None):
    d = "M" + " L".join(f"{x},{y}" for x, y in pts)
    o = [f"<path d='{d}' fill='none' stroke='#1b1f24' stroke-width='1.6' marker-end='url(#a)'/>"]
    if lines: o += text_lines(lx, ly, lines, 12.5, anchor)
    return o

def foot(w, h, node, title, num):
    return [f"<line x1='0' y1='{h-40}' x2='{w}' y2='{h-40}' stroke='#8c959f'/>",
            f"<text x='20' y='{h-15}' font-size='13' fill='#57606a'>NODE: {esc(node)}</text>",
            f"<text x='{w/2}' y='{h-15}' font-size='13' text-anchor='middle' font-weight='600' fill='#1b1f24'>{esc(title)}</text>",
            f"<text x='{w-20}' y='{h-15}' font-size='13' text-anchor='end' fill='#57606a'>NO.: {num}</text>",
            "</svg>"]

# ---------------- A-0 (kontekst) ----------------
W, H = 1200, 640
s = head(W, H, "IDEF0 · A-0 — Hujjatni yangi alifboga oʻgirish (kontekst diagrammasi)")
bx, by, bw, bh = 450, 250, 300, 150
s += box(bx, by, bw, bh, ["Hujjat va matnni", "yangi (2026) lotin", "alifbosiga oʻgirish"], "A0")
# Kirish (I) — chapdan
s += arrow([(60, 295), (bx, 295)], lines=["I1  Eski yozuvdagi hujjat / matn", "      (lotin 1995, kirill; DOCX, XLSX, PPTX, TXT)"], lx=60, ly=270)
s += arrow([(60, 360), (bx, 360)], lines=["I2  Foydalanuvchi sozlamalari", "      (manba yozuvi, himoyalangan soʻzlar)"], lx=60, ly=385)
# Boshqaruv (C) — yuqoridan
for x in (500, 600, 700): s += arrow([(x, 120), (x, by)])
s += text_lines(490, 175, ["C1  OʻRQ-1184 Qonuni", "(28 harf + tutuq)"], 12.5, "end")
s += text_lines(600, 100, ["C2  Imlo qoidalari (VM dasturi)"], 12.5, "middle")
s += text_lines(710, 175, ["C3  Istisno va himoyalangan", "soʻzlar lugʻati"], 12.5, "start")
# Chiqish (O) — oʻngga
s += arrow([(bx+bw, 295), (1140, 295)], lines=["O1  Yangi alifbodagi hujjat", "      (formatlash saqlangan)"], lx=bx+bw+20, ly=270)
s += arrow([(bx+bw, 360), (1140, 360)], lines=["O2  Hisobot: oʻgirilgan soʻzlar,", "      shubhali / himoyalangan soʻzlar"], lx=bx+bw+20, ly=385)
# Mexanizm (M) — pastdan (yuqoriga)
for x in (500, 600, 700): s += arrow([(x, 530), (x, by+bh)])
s += text_lines(490, 470, ["M1  @yangi-alifbo/core", "(konvertatsiya yadrosi)"], 12.5, "end")
s += text_lines(600, 550, ["M2  Word Add-in, veb, REST API, kengaytma, CLI"], 12.5, "middle")
s += text_lines(710, 470, ["M3  Foydalanuvchi /", "tekshiruvchi"], 12.5, "start")
s += text_lines(20, 60, ["Maqsad: eski yozuvdagi hujjatlarni qonunga muvofiq, formatlashni yoʻqotmasdan yangi alifboga oʻtkazish.",
                         "Nuqtai nazar: davlat tashkiloti hujjat aylanishi (ish yurituvchi)."], 12.5, "start", "400", "#57606a")
s += foot(W, H, "A-0", "Hujjatni yangi alifboga oʻgirish", 1)
open(f"{OUT}/idef0-a-0.svg", "w").write("\n".join(s))

# ---------------- A0 (dekompozitsiya) ----------------
W, H = 1400, 860
s = head(W, H, "IDEF0 · A0 — Oʻgirish funksiyasining dekompozitsiyasi")
B = [(140, 170, "A1", ["Hujjatni qabul", "qilish va oʻqish"]),
     (440, 300, "A2", ["Yozuvni aniqlash,", "himoya va tokenlash"]),
     (740, 430, "A3", ["Konvertatsiya", "qoidalarini qoʻllash"]),
     (1040, 560, "A4", ["Natijani yigʻish", "va hisobot"])]
bw, bh = 220, 110
for x, y, c, ls in B: s += box(x, y, bw, bh, ls, c)
def mid_r(i, dy=0): x, y, *_ = B[i]; return (x+bw, y+bh/2+dy)
def mid_l(i, dy=0): x, y, *_ = B[i]; return (x, y+bh/2+dy)
def top(i, dx=0): x, y, *_ = B[i]; return (x+bw/2+dx, y)
def bot(i, dx=0): x, y, *_ = B[i]; return (x+bw/2+dx, y+bh)
# Tashqi kirishlar
s += arrow([(20, 210), mid_l(0, -15)], lines=["I1 Eski hujjat"], lx=22, ly=200)
s += arrow([(20, 250), (110, 250), (110, 375), mid_l(1, 20)], lines=["I2 Sozlamalar"], lx=22, ly=268)
s += arrow([(110, 375), (110, 505), mid_l(2, 20)])
# Ichki oqimlar (ortogonal: chiqish → keyingi blokning chap tomoniga)
def flow(i, lines):
    x0, y0 = mid_r(i); x1, y1 = mid_l(i+1, -25)
    return arrow([(x0, y0), (x1 - 30, y0), (x1 - 30, y1), (x1, y1)], lines=lines, lx=x0 + 10, ly=y0 - 22)
s += flow(0, ["Matn segmentlari", "(Word run'lari, <w:t>)"])
s += flow(1, ["Soʻzlar + himoyalangan", "oraliqlar (URL, kod)"])
s += flow(2, ["Boʻlaklar (Piece[]):", "start, end, yangi matn"])
s += arrow([mid_r(3, -20), (1380, 595)], lines=["O1 Yangi hujjat"], lx=1270, ly=585)
s += arrow([mid_r(3, 25), (1380, 640)], lines=["O2 Hisobot"], lx=1270, ly=662)
# Boshqaruvlar (yuqoridan)
s += arrow([(610, 80), top(1, 60)])
s += arrow([(910, 80), top(2, 60)])
s += arrow([(950, 80), (950, 390), top(2, 100)])
s += text_lines(610, 70, ["C3 Lugʻatlar"], 12.5, "middle")
s += text_lines(860, 58, ["C1 OʻRQ-1184", "C2 Imlo qoidalari"], 12.5, "start")
# Mexanizmlar (pastdan)
s += arrow([(250, 820), bot(0)]); s += text_lines(255, 760, ["M2 office paketi /", "Office.js / brauzer DOM"], 12, "start")
s += arrow([(550, 820), bot(1)]); s += text_lines(555, 760, ["M1 core: tokenizer"], 12, "start")
s += arrow([(850, 820), bot(2)]); s += text_lines(855, 760, ["M1 core: qoidalar dvigateli"], 12, "start")
s += arrow([(1150, 820), bot(3)]); s += text_lines(1020, 760, ["M2 office / API / UI", "M3 Tekshiruvchi"], 12, "start")
# Teskari aloqa: hisobot → lugʻat (boshqaruv)
s += [f"<path d='M{1150+40},{560} L{1190},{140} L{650},{140} L{650},{300}' fill='none' stroke='#cf222e' stroke-width='1.6' stroke-dasharray='6 4' marker-end='url(#a)'/>"]
s += text_lines(1200, 300, ["Teskari aloqa:", "shubhali soʻzlar →", "lugʻatni yangilash"], 12.5, "start", "600", "#cf222e")
s += foot(W, H, "A0", "Hujjatni yangi alifboga oʻgirish — dekompozitsiya", 2)
open(f"{OUT}/idef0-a0.svg", "w").write("\n".join(s))
print("ok")
