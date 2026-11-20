/// <reference types="office-js" />
import { convert } from "@yangi-alifbo/core";
import type { ConvertWarning } from "@yangi-alifbo/core";
import { convertInWord, loadSettings, saveSettings, selectWord, type Scope, type Settings } from "./word";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
let settings: Settings = loadSettings();
let inWord = false;

const REASON: Record<ConvertWarning["reason"], string> = {
  foreign: "çet söz — öğirilmadi",
  protected: "himoyalangan",
  exception: "istisno (sʼh)",
};

// ---- Tablar
document.querySelectorAll<HTMLButtonElement>(".tab").forEach((t) =>
  t.addEventListener("click", () => {
    document.querySelectorAll<HTMLButtonElement>(".tab").forEach((x) => {
      x.classList.toggle("active", x === t);
      x.setAttribute("aria-selected", String(x === t));
    });
    document.querySelectorAll<HTMLElement>(".panel").forEach((p) => (p.hidden = p.id !== "tab-" + t.dataset.tab));
  }),
);

// ---- Hujjat
function setStatus(msg: string, kind: "" | "ok" | "err" = "") {
  const s = $("status");
  s.textContent = msg;
  s.className = "status " + kind;
}

function showWarnings(ws: ConvertWarning[]) {
  const box = $("warnings");
  const list = $("warn-list");
  list.innerHTML = "";
  const seen = new Set<string>();
  for (const w of ws) {
    const k = w.word + w.reason;
    if (seen.has(k)) continue;
    seen.add(k);
    const li = document.createElement("li");
    const b = document.createElement("button");
    const word = document.createElement("span");
    word.textContent = w.word;
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = REASON[w.reason];
    b.append(word, tag);
    b.addEventListener("click", () => {
      // istisno boʻlsa hujjatda allaqachon yangi shaklda
      const target = w.reason === "exception" ? convert(w.word, settings) : w.word;
      selectWord(target).catch(() => undefined);
    });
    li.append(b);
    list.append(li);
  }
  box.hidden = seen.size === 0;
}

async function run(scope: Scope, dryRun = false) {
  if (!inWord) return;
  const buttons = ["btn-doc", "btn-sel", "btn-check"].map((id) => $<HTMLButtonElement>(id));
  buttons.forEach((b) => (b.disabled = true));
  setStatus(dryRun ? "Tekşirilmoqda…" : "Öğirilmoqda…");
  try {
    const r = await convertInWord(scope, settings, dryRun);
    if (r.emptySelection) setStatus("Avval matnni belgilang.", "err");
    else if (r.changed === 0) setStatus("Hujjat allaqaçon yangi alifboda — özgariş yöq.", "ok");
    else setStatus(dryRun ? `${r.changed} ta söz öğirilişi kerak.` : `Tayyor: ${r.changed} ta söz öğirildi.`, "ok");
    showWarnings(r.warnings);
  } catch (e) {
    console.error(e);
    setStatus("Xatolik: " + ((e as Error).message ?? e), "err");
  } finally {
    buttons.forEach((b) => (b.disabled = false));
  }
}

$("btn-doc").addEventListener("click", () => run("document"));
$("btn-sel").addEventListener("click", () => run("selection"));
$("btn-check").addEventListener("click", () => run("document", true));

// ---- Matn
const input = $<HTMLTextAreaElement>("in");
const output = $<HTMLTextAreaElement>("out");
const live = () => (output.value = convert(input.value, settings));
input.addEventListener("input", live);
$("btn-copy").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(output.value); } catch { output.select(); document.execCommand("copy"); }
});
$("btn-insert").addEventListener("click", async () => {
  if (!inWord || !output.value) return;
  await Word.run(async (ctx) => {
    ctx.document.getSelection().insertText(output.value, Word.InsertLocation.replace);
    await ctx.sync();
  });
});

// ---- Sozlamalar
function renderSettings() {
  $<HTMLSelectElement>("opt-from").value = settings.from;
  document.querySelectorAll<HTMLInputElement>('input[name="mode"]').forEach((r) => (r.checked = r.value === settings.mode));
  $<HTMLInputElement>("opt-foreign").checked = settings.protectForeign;
  $<HTMLInputElement>("opt-headers").checked = settings.includeHeaders;
  $<HTMLTextAreaElement>("opt-protected").value = settings.protectedWords.join("\n");
}
function readSettings() {
  settings = {
    from: $<HTMLSelectElement>("opt-from").value as Settings["from"],
    mode: (document.querySelector<HTMLInputElement>('input[name="mode"]:checked')?.value ?? "ooxml") as Settings["mode"],
    protectForeign: $<HTMLInputElement>("opt-foreign").checked,
    includeHeaders: $<HTMLInputElement>("opt-headers").checked,
    protectedWords: $<HTMLTextAreaElement>("opt-protected").value.split("\n").map((s) => s.trim()).filter(Boolean),
  };
  saveSettings(settings);
  $("saved").textContent = "Saqlandi.";
  live();
}
renderSettings();
document.querySelectorAll("#tab-settings input, #tab-settings select, #tab-settings textarea").forEach((el) =>
  el.addEventListener("change", readSettings),
);

// ---- Office
function offline() {
  $("no-office").hidden = false;
  ["btn-doc", "btn-sel", "btn-check", "btn-insert"].forEach((id) => ($<HTMLButtonElement>(id).disabled = true));
}
if (typeof Office === "undefined") offline();
else {
  Office.onReady((info) => {
    inWord = info.host === Office.HostType.Word;
    if (!inWord) offline();
  });
}
