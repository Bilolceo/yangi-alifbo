/// <reference types="office-js" />
import { convertInWord, type Scope } from "./word";

/** Lentadagi tugmalar (ExecuteFunction). UI yoʻq — natija hujjatda koʻrinadi. */
function handler(scope: Scope) {
  return async (event: Office.AddinCommands.Event) => {
    try {
      await convertInWord(scope);
    } catch (e) {
      console.error("Yangi alifbo:", e);
    } finally {
      event.completed();
    }
  };
}

Office.onReady(() => {
  Office.actions.associate("convertDocument", handler("document"));
  Office.actions.associate("convertSelection", handler("selection"));
});
