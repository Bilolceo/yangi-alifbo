# BPMN 2.0: davlat tashkilotida hujjatni yangi alifboga oʻtkazish jarayoni (DI koordinatalari bilan)
import sys, html
out = sys.argv[1]
e = lambda s: html.escape(s, quote=True)

LANES = [("Lane_Xodim", "Ish yurituvchi (xodim)", 60), ("Lane_Tizim", "«Yangi alifbo» tizimi", 240), ("Lane_Tekshiruvchi", "Masʼul tekshiruvchi", 420)]
PX, PW, LH = 100, 1420, 180

# id: (tur, nom, lane, x, y, w, h)
N = {
 "Start":      ("startEvent", "Hujjatni yangi alifboga oʻtkazish kerak", "Lane_Xodim", 180, 132, 36, 36),
 "T_Open":     ("userTask", "Hujjatni Word'da ochish", "Lane_Xodim", 260, 110, 120, 80),
 "T_Click":    ("userTask", "«Hujjatni öğiriş» tugmasini bosish", "Lane_Xodim", 420, 110, 120, 80),
 "T_Convert":  ("serviceTask", "Yozuvni aniqlash va oʻgirish", "Lane_Tizim", 580, 290, 120, 80),
 "T_Report":   ("serviceTask", "Hisobot shakllantirish", "Lane_Tizim", 740, 290, 120, 80),
 "G_Susp":     ("exclusiveGateway", "Shubhali soʻzlar bormi?", "Lane_Tizim", 905, 305, 50, 50),
 "T_Review":   ("userTask", "Shubhali soʻzlarni tekshirish", "Lane_Tekshiruvchi", 1000, 470, 120, 80),
 "G_Dict":     ("exclusiveGateway", "Lugʻatga qoʻshish kerakmi?", "Lane_Tekshiruvchi", 1165, 485, 50, 50),
 "T_AddDict":  ("userTask", "Soʻzni lugʻatga qoʻshish", "Lane_Tekshiruvchi", 720, 470, 120, 80),
 "T_Save":     ("userTask", "Hujjatni saqlash va yuborish", "Lane_Xodim", 1240, 110, 120, 80),
 "End":        ("endEvent", "Hujjat yangi alifboda", "Lane_Xodim", 1412, 132, 36, 36),
}
# id: (manba, nishon, nom, nuqtalar)
F = {
 "F1": ("Start", "T_Open", "", [(216,150),(260,150)]),
 "F2": ("T_Open", "T_Click", "", [(380,150),(420,150)]),
 "F3": ("T_Click", "T_Convert", "", [(480,190),(480,330),(580,330)]),
 "F4": ("T_Convert", "T_Report", "", [(700,330),(740,330)]),
 "F5": ("T_Report", "G_Susp", "", [(860,330),(905,330)]),
 "F6": ("G_Susp", "T_Save", "Yoʻq", [(930,305),(930,150),(1240,150)]),
 "F7": ("G_Susp", "T_Review", "Ha", [(930,355),(930,510),(1000,510)]),
 "F8": ("T_Review", "G_Dict", "", [(1120,510),(1165,510)]),
 "F9": ("G_Dict", "T_Save", "Yoʻq", [(1215,510),(1300,510),(1300,190)]),
 "F10": ("G_Dict", "T_AddDict", "Ha", [(1190,535),(1190,580),(780,580),(780,550)]),
 "F11": ("T_AddDict", "T_Convert", "Qayta oʻgirish", [(720,510),(640,510),(640,370)]),
 "F12": ("T_Save", "End", "", [(1360,150),(1412,150)]),
}
STORE = ("DS_Dict", "Lugʻatlar (istisno, himoyalangan soʻzlar)", 560, 445, 50, 50)

x = ['<?xml version="1.0" encoding="UTF-8"?>',
'<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" '
'xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" '
'id="Defs_YangiAlifbo" targetNamespace="https://github.com/Bilolceo/yangi-alifbo" exporter="yangi-alifbo" exporterVersion="0.1">',
'  <bpmn:collaboration id="Collab_1">',
'    <bpmn:participant id="Pool_Tashkilot" name="Davlat tashkiloti: hujjatni yangi alifboga oʻtkazish" processRef="Process_Otkazish"/>',
'  </bpmn:collaboration>',
'  <bpmn:process id="Process_Otkazish" name="Hujjatni yangi alifboga oʻtkazish" isExecutable="false">',
'    <bpmn:laneSet id="LaneSet_1">']
for lid, name, _ in LANES:
    x.append(f'      <bpmn:lane id="{lid}" name="{e(name)}">')
    for nid, n in N.items():
        if n[2] == lid: x.append(f'        <bpmn:flowNodeRef>{nid}</bpmn:flowNodeRef>')
    x.append('      </bpmn:lane>')
x.append('    </bpmn:laneSet>')
for nid, (t, name, *_ ) in N.items():
    inc = [f for f, v in F.items() if v[1] == nid]; outg = [f for f, v in F.items() if v[0] == nid]
    x.append(f'    <bpmn:{t} id="{nid}" name="{e(name)}">')
    x += [f'      <bpmn:incoming>{f}</bpmn:incoming>' for f in inc]
    x += [f'      <bpmn:outgoing>{f}</bpmn:outgoing>' for f in outg]
    if nid == "T_Convert":
        x += ['      <bpmn:property id="Prop_Convert" name="__targetRef_placeholder"/>',
              '      <bpmn:dataInputAssociation id="DIA_1"><bpmn:sourceRef>DS_Dict</bpmn:sourceRef><bpmn:targetRef>Prop_Convert</bpmn:targetRef></bpmn:dataInputAssociation>']
    if nid == "T_AddDict":
        x += ['      <bpmn:dataOutputAssociation id="DOA_1"><bpmn:targetRef>DS_Dict</bpmn:targetRef></bpmn:dataOutputAssociation>']
    x.append(f'    </bpmn:{t}>')
for fid, (s, t, name, _) in F.items():
    nm = f' name="{e(name)}"' if name else ""
    x.append(f'    <bpmn:sequenceFlow id="{fid}"{nm} sourceRef="{s}" targetRef="{t}"/>')
x.append(f'    <bpmn:dataStoreReference id="{STORE[0]}" name="{e(STORE[1])}"/>')
x.append('  </bpmn:process>')
# DI
x += ['  <bpmndi:BPMNDiagram id="Diagram_1">', '    <bpmndi:BPMNPlane id="Plane_1" bpmnElement="Collab_1">',
      f'      <bpmndi:BPMNShape id="Pool_di" bpmnElement="Pool_Tashkilot" isHorizontal="true"><dc:Bounds x="{PX}" y="60" width="{PW}" height="{LH*3}"/></bpmndi:BPMNShape>']
for lid, _, y in LANES:
    x.append(f'      <bpmndi:BPMNShape id="{lid}_di" bpmnElement="{lid}" isHorizontal="true"><dc:Bounds x="{PX+30}" y="{y}" width="{PW-30}" height="{LH}"/></bpmndi:BPMNShape>')
for nid, (t, name, lane, bx, by, w, h) in N.items():
    extra = ' isMarkerVisible="true"' if t == "exclusiveGateway" else ""
    lab = ""
    if t in ("startEvent", "endEvent"):
        lab = f'<bpmndi:BPMNLabel><dc:Bounds x="{bx-32}" y="{by+h+5}" width="100" height="40"/></bpmndi:BPMNLabel>'
    if t == "exclusiveGateway":
        lx, ly = {"G_Susp": (bx+55, by+30), "G_Dict": (bx-95, by-55)}[nid]
        lab = f'<bpmndi:BPMNLabel><dc:Bounds x="{lx}" y="{ly}" width="110" height="27"/></bpmndi:BPMNLabel>'
    x.append(f'      <bpmndi:BPMNShape id="{nid}_di" bpmnElement="{nid}"{extra}><dc:Bounds x="{bx}" y="{by}" width="{w}" height="{h}"/>{lab}</bpmndi:BPMNShape>')
sid, sname, sx, sy, sw, sh = STORE
x.append(f'      <bpmndi:BPMNShape id="{sid}_di" bpmnElement="{sid}"><dc:Bounds x="{sx}" y="{sy}" width="{sw}" height="{sh}"/>'
         f'<bpmndi:BPMNLabel><dc:Bounds x="{sx-40}" y="{sy+sh+5}" width="130" height="27"/></bpmndi:BPMNLabel></bpmndi:BPMNShape>')
for fid, (s, t, name, pts) in F.items():
    wp = "".join(f'<di:waypoint x="{a}" y="{b}"/>' for a, b in pts)
    lab = ""
    LPOS = {"F6": (896, 283), "F11": (646, 430)}
    if name:
        (a, b) = LPOS.get(fid, pts[0]) if fid in LPOS else pts[0]
        if fid in LPOS: lab = f'<bpmndi:BPMNLabel><dc:Bounds x="{a}" y="{b}" width="80" height="14"/></bpmndi:BPMNLabel>'
    if name and fid not in LPOS:
        (a, b) = pts[0]
        lab = f'<bpmndi:BPMNLabel><dc:Bounds x="{a+6}" y="{b+(-22 if pts[1][1] < b else 6)}" width="80" height="14"/></bpmndi:BPMNLabel>'
    x.append(f'      <bpmndi:BPMNEdge id="{fid}_di" bpmnElement="{fid}">{wp}{lab}</bpmndi:BPMNEdge>')
x.append('      <bpmndi:BPMNEdge id="DIA_1_di" bpmnElement="DIA_1"><di:waypoint x="585" y="445"/><di:waypoint x="610" y="370"/></bpmndi:BPMNEdge>')
x.append('      <bpmndi:BPMNEdge id="DOA_1_di" bpmnElement="DOA_1"><di:waypoint x="720" y="500"/><di:waypoint x="610" y="475"/></bpmndi:BPMNEdge>')
x += ['    </bpmndi:BPMNPlane>', '  </bpmndi:BPMNDiagram>', '</bpmn:definitions>']
open(out, "w").write("\n".join(x) + "\n")
print("ok")
