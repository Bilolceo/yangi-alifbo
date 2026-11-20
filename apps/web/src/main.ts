import {
  ALPHABET, convertWithReport, toOldLatin, type ConvertOptions, type ConvertWarning,
} from "@yangi-alifbo/core";
import { convertOfficeFile, MIME } from "@yangi-alifbo/office";
import JSZip from "jszip";

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

// ---------- Sozlamalar ----------
const SKEY = "yangi-alifbo.web";
interface Prefs { from: NonNullable<ConvertOptions["from"]>; foreign: boolean; tutuq: boolean; protectedWords: string; tab: string; input: string }
const defaults: Prefs = { from: "auto", foreign: true, tutuq: true, protectedWords: "", tab: "text", input: "" };
let prefs: Prefs = (() => {
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(SKEY) ?? "{}") }; } catch { return { ...defaults }; }
})();
const save = () => { try { localStorage.setItem(SKEY, JSON.stringify(prefs)); } catch { /* yoʻq */ } };

const options = (): ConvertOptions => ({
  from: prefs.from,
  protectForeign: prefs.foreign,
  normalizeTutuq: prefs.tutuq,
  protectedWords: prefs.protectedWords.split(/[,\n]/).map((s) => s.trim()).filter(Boolean),
});

// ---------- Tablar ----------
function showTab(name: string) {
  document.querySelectorAll<HTMLButtonElement>(".tab").forEach((t) => t.setAttribute("aria-selected", String(t.dataset.tab === name)));
  document.querySelectorAll<HTMLElement>(".panel").forEach((p) => (p.hidden = p.id !== "tab-" + name));
  $("settings").hidden = name === "alphabet";
  prefs.tab = name; save();
}
document.querySelectorAll<HTMLButtonElement>(".tab").forEach((t) => t.addEventListener("click", () => showTab(t.dataset.tab!)));

// ---------- Matn ----------
const input = $<HTMLTextAreaElement>("in");
const output = $<HTMLTextAreaElement>("out");
const report = $("text-report");
let reverse = false;

const REASON: Record<ConvertWarning["reason"], string> = {
  foreign: "çet söz",
  protected: "himoyalangan",
  exception: "istisno",
};

function renderText() {
  const src = input.value;
  report.textContent = "";
  if (reverse) {
    output.value = toOldLatin(src);
    return;
  }
  const r = convertWithReport(src, options());
  output.value = r.text;
  if (!src.trim()) return;
  const info = document.createElement("span");
  info.className = r.changes ? "ok" : "muted";
  info.textContent = r.changes ? `✓ ${r.changes} ta söz öğirildi` : "Matn allaqaçon yangi alifboda";
  report.append(info);
  const seen = new Set<string>();
  for (const w of r.warnings) {
    if (seen.has(w.word)) continue;
    seen.add(w.word);
    const c = document.createElement("span");
    c.className = "chip";
    c.title = w.reason === "exception" ? "Istisno lugʻati boʻyicha sʼh ajratildi" : "Bu söz öğirilmadi";
    c.textContent = w.word + " ";
    const em = document.createElement("em");
    em.textContent = REASON[w.reason];
    c.append(em);
    report.append(c);
  }
}

let timer = 0;
input.addEventListener("input", () => {
  clearTimeout(timer);
  timer = window.setTimeout(() => { renderText(); prefs.input = input.value.slice(0, 20000); save(); }, 60);
});

document.querySelectorAll<HTMLButtonElement>(".seg-btn").forEach((b) =>
  b.addEventListener("click", () => {
    reverse = b.dataset.dir === "reverse";
    document.querySelectorAll<HTMLButtonElement>(".seg-btn").forEach((x) => {
      x.classList.toggle("active", x === b);
      x.setAttribute("aria-checked", String(x === b));
    });
    $("in-label").textContent = reverse ? "Yangi alifbo" : "Eski lotin yoki kirill";
    $("out-label").textContent = reverse ? "Eski lotin (1995)" : "Yangi alifbo";
    renderText();
  }),
);

const SAMPLE = `Oʻzbekiston Respublikasi Prezidentining qarori

Toshkent shahridagi bogʻlarni obodonlashtirish toʻgʻrisida.
Choshgohda oʻquvchilar maʼnaviyat va maʼrifat darsida sheʼr oʻqishdi.

Ўзбекистон Республикаси Вазирлар Маҳкамаси, Тошкент шаҳри.
Batafsil: https://gov.uz/oz — murojaat: info@example.uz`;

$("btn-sample").addEventListener("click", () => { input.value = SAMPLE; renderText(); input.focus(); });
$("btn-clear").addEventListener("click", () => { input.value = ""; prefs.input = ""; save(); renderText(); input.focus(); });
$("btn-copy").addEventListener("click", async () => {
  const b = $("btn-copy");
  try { await navigator.clipboard.writeText(output.value); }
  catch { output.select(); document.execCommand("copy"); }
  b.textContent = "Nusxalandi ✓";
  setTimeout(() => (b.textContent = "Nusxalaş"), 1500);
});

// ---------- Fayllar ----------
const OFFICE = new Set(["docx", "xlsx", "pptx"]);
const TEXT = new Set(["txt", "md", "csv", "tsv", "json", "html", "htm", "xml", "srt"]);
interface Done { name: string; blob: Blob }
const done: Done[] = [];
let total = 0, failed = 0;

const ext = (name: string) => (name.split(".").pop() ?? "").toLowerCase();
const outName = (name: string) => {
  const i = name.lastIndexOf(".");
  return i > 0 ? `${name.slice(0, i)}.yangi${name.slice(i)}` : name + ".yangi";
};

/** Matn faylini dekodlash: UTF-8, UTF-16 (BOM) yoki Windows-1251 (eski kirill fayllar). */
function decodeText(buf: ArrayBuffer): string {
  const b = new Uint8Array(buf);
  if (b[0] === 0xff && b[1] === 0xfe) return new TextDecoder("utf-16le").decode(b);
  if (b[0] === 0xfe && b[1] === 0xff) return new TextDecoder("utf-16be").decode(b);
  try { return new TextDecoder("utf-8", { fatal: true }).decode(b); }
  catch { return new TextDecoder("windows-1251").decode(b); }
}

function fileRow(file: File) {
  const li = document.createElement("li");
  li.className = "file";
  const e = ext(file.name);
  li.innerHTML = `<span class="file-badge ${e}"></span><div><div class="file-name"></div><div class="file-meta">Öğirilmoqda…</div></div>`;
  li.querySelector(".file-badge")!.textContent = e || "?";
  li.querySelector(".file-name")!.textContent = file.name;
  $("file-list").prepend(li);
  return li;
}

async function handleFile(file: File) {
  const li = fileRow(file);
  const meta = li.querySelector(".file-meta")!;
  const e = ext(file.name);
  total++;
  try {
    let blob: Blob;
    let changed: number;
    let warnings: ConvertWarning[];
    if (OFFICE.has(e)) {
      const r = await convertOfficeFile(await file.arrayBuffer(), options());
      blob = new Blob([r.data as BlobPart], { type: MIME[r.report.kind] });
      changed = r.report.words;
      warnings = r.report.warnings;
    } else if (TEXT.has(e)) {
      const r = convertWithReport(decodeText(await file.arrayBuffer()), options());
      blob = new Blob([r.text], { type: (file.type || "text/plain") + ";charset=utf-8" });
      changed = r.changes;
      warnings = r.warnings;
    } else {
      throw new Error("Bu format qöllab-quvvatlanmaydi");
    }
    const name = outName(file.name);
    done.push({ name, blob });
    meta.textContent = changed
      ? `✓ ${changed} ta söz öğirildi${warnings.length ? ` · ${new Set(warnings.map((w) => w.word)).size} ta söz tekşiruv uçun` : ""}`
      : "Özgariş yöq — fayl allaqaçon yangi alifboda";
    const a = document.createElement("a");
    a.className = "btn primary";
    a.textContent = "Yuklab oliş";
    a.download = name;
    a.href = URL.createObjectURL(blob);
    li.append(a);
    if (warnings.length) {
      const d = document.createElement("details");
      d.innerHTML = "<summary>Tekşirib çiqiş kerak bölgan sözlar</summary><ul></ul>";
      const ul = d.querySelector("ul")!;
      for (const w of uniq(warnings)) {
        const it = document.createElement("li");
        it.textContent = `${w.word} — ${REASON[w.reason]}`;
        ul.append(it);
      }
      li.append(d);
    }
  } catch (err) {
    failed++;
    meta.classList.add("err");
    meta.textContent = "Xatolik: " + ((err as Error).message || "faylni öqib bölmadi");
  }
  updateSummary();
}

const uniq = (ws: ConvertWarning[]) => {
  const m = new Map<string, ConvertWarning>();
  for (const w of ws) if (!m.has(w.word)) m.set(w.word, w);
  return [...m.values()];
};

function updateSummary() {
  $("file-actions").hidden = total === 0;
  $("file-summary").textContent = `${done.length} ta fayl tayyor${failed ? ` · ${failed} ta xato` : ""}`;
  $<HTMLButtonElement>("btn-zip").disabled = done.length < 1;
}

async function handleFiles(list: FileList | File[]) {
  for (const f of Array.from(list)) await handleFile(f);
}

const drop = $("drop");
$<HTMLInputElement>("file-input").addEventListener("change", (ev) => {
  const t = ev.target as HTMLInputElement;
  if (t.files) handleFiles(t.files).then(() => (t.value = ""));
});
["dragenter", "dragover"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add("over"); }));
["dragleave", "drop"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove("over"); }));
drop.addEventListener("drop", (e) => { const f = (e as DragEvent).dataTransfer?.files; if (f) handleFiles(f); });
// Sahifaning istalgan joyiga tashlansa ham qabul qilish
window.addEventListener("dragover", (e) => e.preventDefault());
window.addEventListener("drop", (e) => {
  e.preventDefault();
  const f = e.dataTransfer?.files;
  if (f?.length) { showTab("files"); handleFiles(f); }
});

$("btn-zip").addEventListener("click", async () => {
  const zip = new JSZip();
  const used = new Set<string>();
  for (const d of done) {
    let n = d.name, k = 1;
    while (used.has(n)) n = d.name.replace(/(\.[^.]+)$/, ` (${++k})$1`);
    used.add(n);
    zip.file(n, d.blob);
  }
  const blob = await zip.generateAsync({ type: "blob" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "yangi-alifbo.zip";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
});
$("btn-reset").addEventListener("click", () => {
  $("file-list").querySelectorAll("a[href^='blob:']").forEach((a) => URL.revokeObjectURL((a as HTMLAnchorElement).href));
  $("file-list").innerHTML = "";
  done.length = 0; total = 0; failed = 0;
  updateSummary();
});

// ---------- Alifbo ----------
const NEW = new Set(["Ğ", "Ö", "Ş", "Ç"]);
$("letters").append(
  ...ALPHABET.map((L) => {
    const d = document.createElement("div");
    d.className = "letter" + (NEW.has(L) ? " new" : "");
    d.innerHTML = `${L}<small>${L.toLowerCase()}</small>`;
    return d;
  }),
  Object.assign(document.createElement("div"), { className: "letter", innerHTML: "ʼ<small>tutuq</small>" }),
);

// ---------- Sozlamalar UI ----------
const fromSel = $<HTMLSelectElement>("opt-from");
const foreign = $<HTMLInputElement>("opt-foreign");
const tutuq = $<HTMLInputElement>("opt-tutuq");
const prot = $<HTMLTextAreaElement>("opt-protected");
fromSel.value = prefs.from; foreign.checked = prefs.foreign; tutuq.checked = prefs.tutuq; prot.value = prefs.protectedWords;
const onSettings = () => {
  prefs = { ...prefs, from: fromSel.value as Prefs["from"], foreign: foreign.checked, tutuq: tutuq.checked, protectedWords: prot.value };
  save();
  renderText();
};
[fromSel, foreign, tutuq].forEach((el) => el.addEventListener("change", onSettings));
prot.addEventListener("input", onSettings);

// ---------- Boshlash ----------
input.value = prefs.input;
renderText();
showTab(["text", "files", "alphabet"].includes(prefs.tab) ? prefs.tab : "text");
