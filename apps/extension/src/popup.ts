import { convert } from "@yangi-alifbo/core";
import { DEFAULTS, getSettings, runInTab, toOptions, type Settings } from "./shared";
import type { Mode } from "./dom";

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
let settings: Settings = DEFAULTS;

const input = $<HTMLTextAreaElement>("in");
const output = $<HTMLTextAreaElement>("out");
const status = $("status");
const render = () => (output.value = convert(input.value, toOptions(settings)));

function setStatus(msg: string, kind: "" | "ok" | "err" = "") {
  status.textContent = msg;
  status.className = "status " + kind;
}

async function act(mode: Mode) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  try {
    const r = await runInTab(tab.id, mode);
    if (!r) return;
    if (r.method === "none") setStatus("Avval sahifada matnni belgilang.", "err");
    else if (r.method === "clipboard") setStatus("Natija nusxalandi — Ctrl+V bilan qöying.", "ok");
    else if (r.words === 0) setStatus("Özgariş yöq — allaqaçon yangi alifboda.", "ok");
    else { setStatus(`✓ ${r.words} ta söz öğirildi.`, "ok"); setTimeout(() => window.close(), 900); }
  } catch {
    setStatus("Bu sahifada işlamaydi (brauzer ichki sahifasi yoki himoyalangan sayt).", "err");
  }
}

$("btn-sel").addEventListener("click", () => act("selection"));
$("btn-page").addEventListener("click", () => act("page"));
input.addEventListener("input", render);
$("btn-copy").addEventListener("click", async () => {
  await navigator.clipboard.writeText(output.value).catch(() => undefined);
  $("btn-copy").textContent = "Nusxalandi ✓";
  setTimeout(() => ($("btn-copy").textContent = "Nusxalaş"), 1400);
});

// Sozlamalar
const fromSel = $<HTMLSelectElement>("opt-from");
const foreign = $<HTMLInputElement>("opt-foreign");
const prot = $<HTMLInputElement>("opt-protected");
async function save() {
  settings = {
    from: fromSel.value as Settings["from"],
    protectForeign: foreign.checked,
    protectedWords: prot.value.split(",").map((s) => s.trim()).filter(Boolean),
  };
  await chrome.storage.sync.set(settings);
  render();
}
[fromSel, foreign].forEach((el) => el.addEventListener("change", save));
prot.addEventListener("change", save);

// Haqiqiy qisqa tugmani koʻrsatish (foydalanuvchi oʻzgartirgan boʻlishi mumkin)
chrome.commands?.getAll?.((cmds) => {
  const c = cmds.find((x) => x.name === "convert-selection");
  $("kbd").textContent = c?.shortcut || "oʻrnatilmagan";
});

getSettings().then((s) => {
  settings = s;
  fromSel.value = s.from;
  foreign.checked = s.protectForeign;
  prot.value = s.protectedWords.join(", ");
  input.focus();
});
