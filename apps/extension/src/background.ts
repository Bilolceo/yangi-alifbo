import { runInTab } from "./shared";
import type { Mode } from "./dom";

const MENU_SELECTION = "ya-selection";
const MENU_PAGE = "ya-page";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_SELECTION,
      title: "Yangi alifboga öğiriş",
      contexts: ["selection", "editable"],
    });
    chrome.contextMenus.create({
      id: MENU_PAGE,
      title: "Sahifani yangi alifboda körsatiş",
      contexts: ["page"],
    });
  });
});

async function run(tab: chrome.tabs.Tab | undefined, mode: Mode, frameId?: number) {
  if (!tab?.id) return;
  try {
    await runInTab(tab.id, mode, frameId);
  } catch (e) {
    // chrome://, Web Store va himoyalangan sahifalarga skript kiritib boʻlmaydi
    console.warn("Yangi alifbo:", e);
    await chrome.action.setBadgeBackgroundColor({ color: "#cf222e", tabId: tab.id });
    await chrome.action.setBadgeText({ text: "!", tabId: tab.id });
    setTimeout(() => chrome.action.setBadgeText({ text: "", tabId: tab.id }), 3000);
  }
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === MENU_SELECTION) run(tab, "selection", info.frameId);
  else if (info.menuItemId === MENU_PAGE) run(tab, "page", info.frameId);
});

chrome.commands.onCommand.addListener((command, tab) => {
  if (command === "convert-selection") run(tab, "selection");
  else if (command === "convert-page") run(tab, "page");
});
