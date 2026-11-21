import html, sys
out = sys.argv[1]
e = html.escape
W, H = 1160, 660
s = [f"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 {W} {H}' width='{W}' height='{H}' font-family='Segoe UI, Arial, sans-serif'>",
     "<defs><marker id='o' viewBox='0 0 10 10' refX='9' refY='5' markerWidth='9' markerHeight='9' orient='auto'><path d='M0,0 L10,5 L0,10' fill='none' stroke='#1b1f24' stroke-width='1.4'/></marker></defs>",
     f"<rect width='{W}' height='{H}' fill='#fff'/>",
     "<text x='20' y='30' font-size='18' font-weight='700' fill='#1b1f24'>UML · Use case diagramma — «Yangi alifbo» tizimi</text>"]
SX0, SX1, SY0, SY1 = 290, 880, 60, 620
s.append(f"<rect x='{SX0}' y='{SY0}' width='{SX1-SX0}' height='{SY1-SY0}' fill='#f6f8fa' stroke='#57606a' stroke-width='1.5'/>")
s.append(f"<text x='{(SX0+SX1)/2}' y='{SY0+24}' font-size='14' font-weight='700' text-anchor='middle' fill='#1b1f24'>«Yangi alifbo» tizimi</text>")
RX, RY = 112, 30
UC = {  # id: (cx, cy, matn qatorlari)
 "UC1": (420, 120, ["Word hujjatini oʻgirish"]),
 "UC2": (420, 215, ["Belgilangan matnni", "oʻgirish"]),
 "UC3": (420, 310, ["Faylni yuklab oʻgirish", "(DOCX, XLSX, PPTX, TXT)"]),
 "UC4": (420, 405, ["Saytdagi matnni oʻgirish", "(brauzer kengaytmasi)"]),
 "UC5": (750, 255, ["Hisobotni koʻrish"]),
 "UC6": (750, 120, ["Lugʻatni yuritish"]),
 "UC7": (750, 360, ["API orqali oʻgirish"]),
 "UC8": (750, 455, ["Qidiruv uchun", "normallashtirish"]),
 "UC9": (750, 560, ["Tizimni oʻrnatish", "(Docker, M365)"]),
}
for cx, cy, ls in UC.values():
    s.append(f"<ellipse cx='{cx}' cy='{cy}' rx='{RX}' ry='{RY}' fill='#e8f0fe' stroke='#1f6feb' stroke-width='1.6'/>")
    for i, l in enumerate(ls):
        s.append(f"<text x='{cx}' y='{cy + 5 + (i - (len(ls)-1)/2)*16}' font-size='13' text-anchor='middle' fill='#1b1f24'>{e(l)}</text>")
def actor(x, y, ls):
    o = [f"<circle cx='{x}' cy='{y-38}' r='11' fill='#fff' stroke='#1b1f24' stroke-width='1.6'/>",
         f"<path d='M{x},{y-27} L{x},{y+2} M{x-18},{y-16} L{x+18},{y-16} M{x},{y+2} L{x-14},{y+24} M{x},{y+2} L{x+14},{y+24}' stroke='#1b1f24' stroke-width='1.6' fill='none'/>"]
    for i, l in enumerate(ls):
        o.append(f"<text x='{x}' y='{y+44+i*16}' font-size='13' font-weight='600' text-anchor='middle' fill='#1b1f24'>{e(l)}</text>")
    return o
A = {"A1": (150, 210, ["Ish yurituvchi"]), "A2": (150, 400, ["Fuqaro"]),
     "A3": (1050, 200, ["Masʼul tekshiruvchi"]), "A4": (1050, 420, ["Tashqi axborot", "tizimi (EDO, 1C)"]),
     "A5": (1050, 575, ["Administrator"])}
for x, y, ls in A.values(): s += actor(x, y, ls)
def assoc(a, u):
    ax, ay, _ = A[a]; cx, cy, _ = UC[u]
    if ax < cx: x0, x1 = ax + 22, cx - RX
    else: x0, x1 = ax - 22, cx + RX
    s.append(f"<line x1='{x0}' y1='{ay-12}' x2='{x1}' y2='{cy}' stroke='#1b1f24' stroke-width='1.4'/>")
for a, u in [("A1","UC1"),("A1","UC2"),("A1","UC3"),("A2","UC3"),("A2","UC4"),
             ("A3","UC5"),("A3","UC6"),("A4","UC7"),("A4","UC8"),("A5","UC9")]: assoc(a, u)
def include(u1, u2, label):
    x1, y1, _ = UC[u1]; x2, y2, _ = UC[u2]
    s.append(f"<line x1='{x1+RX}' y1='{y1}' x2='{x2-RX}' y2='{y2}' stroke='#1b1f24' stroke-width='1.3' stroke-dasharray='6 4' marker-end='url(#o)'/>")
    lx = x1 + RX + 0.35 * ((x2 - RX) - (x1 + RX)); ly = y1 + 0.35 * (y2 - y1)
    s.append(f"<text x='{lx}' y='{ly - 6}' font-size='12' text-anchor='middle' fill='#57606a'>{e(label)}</text>")
include("UC1", "UC5", "«include»")
include("UC3", "UC5", "«include»")
include("UC2", "UC5", "«include»")
s.append("</svg>")
open(out, "w").write("\n".join(s))
print("ok")
