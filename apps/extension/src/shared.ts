import type { ConvertOptions } from "@yangi-alifbo/core";
import type { Mode, Result } from "./dom";

export interface Settings {
  from: NonNullable<ConvertOptions["from"]>;
  protectForeign: boolean;
  protectedWords: string[];
}

export const DEFAULTS: Settings = { from: "auto", protectForeign: true, protectedWords: [] };

export async function getSettings(): Promise<Settings> {
  try {
    const s = await chrome.storage.sync.get(DEFAULTS as unknown as Record<string, unknown>);
    return { ...DEFAULTS, ...(s as Partial<Settings>) };
  } catch {
    return { ...DEFAULTS };
  }
}

export const toOptions = (s: Settings): ConvertOptions => ({
  from: s.from,
  protectForeign: s.protectForeign,
  protectedWords: s.protectedWords,
});

/** Kontent skriptni faol varaqqa (kerakli freymga) kiritib, buyruqni bajaradi. */
export async function runInTab(tabId: number, mode: Mode, frameId?: number): Promise<Result | undefined> {
  const target: chrome.scripting.InjectionTarget = frameId ? { tabId, frameIds: [frameId] } : { tabId };
  const opts = toOptions(await getSettings());
  await chrome.scripting.executeScript({ target, files: ["content.js"] });
  const [res] = await chrome.scripting.executeScript({
    target,
    func: (m: Mode, o: unknown) => globalThis.__yangiAlifbo!(m, o as never),
    args: [mode, opts],
  });
  return res?.result as Result | undefined;
}
