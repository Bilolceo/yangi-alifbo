import type { ConvertOptions } from "@yangi-alifbo/core";
import { convertPage, convertSelection, copyText, type Mode, type Result } from "./dom";

/**
 * Sahifaga faqat foydalanuvchi buyrugʻi bilan (kontekst menyu, tugma, qisqa tugma) kiritiladi —
 * kengaytma saytlarni oʻzi oʻqimaydi va hech narsa yubormaydi.
 */
declare global {
  // eslint-disable-next-line no-var
  var __yangiAlifbo: ((mode: Mode, opts: ConvertOptions) => Promise<Result>) | undefined;
}

function toast(msg: string, kind: "ok" | "info" = "ok") {
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;z-index:2147483647;right:20px;bottom:20px;pointer-events:none";
  const root = host.attachShadow({ mode: "closed" });
  root.innerHTML = `<style>
    .t{font:14px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif;color:#fff;background:${kind === "ok" ? "#1f6feb" : "#3b4350"};
       padding:10px 14px;border-radius:10px;box-shadow:0 6px 24px rgba(0,0,0,.25);display:flex;gap:8px;align-items:center;
       max-width:340px;animation:in .18s ease-out}
    .l{width:22px;height:22px;border-radius:6px;background:#fff;color:#1f6feb;font-weight:700;display:grid;place-items:center;flex:none}
    @keyframes in{from{transform:translateY(8px);opacity:0}}
  </style><div class="t"><span class="l">Ö</span><span></span></div>`;
  root.querySelector(".t span:last-child")!.textContent = msg;
  (document.body ?? document.documentElement).append(host);
  setTimeout(() => host.remove(), 3200);
}

globalThis.__yangiAlifbo ??= async (mode, opts) => {
  const r = mode === "page" ? convertPage(document, opts) : convertSelection(document, opts);
  if (r.method === "clipboard" && r.text) {
    const ok = await copyText(document, r.text);
    toast(ok ? "Nusxalandi — Ctrl+V bilan almaştiring" : "Nusxalab bölmadi", "info");
  } else if (r.method === "none") {
    toast("Avval matnni belgilang", "info");
  } else if (r.words === 0) {
    toast("Özgariş yöq — matn allaqaçon yangi alifboda", "info");
  } else {
    toast(mode === "page" ? `Sahifa yangi alifboda · ${r.words} ta söz` : `✓ ${r.words} ta söz öğirildi`);
  }
  return r;
};
