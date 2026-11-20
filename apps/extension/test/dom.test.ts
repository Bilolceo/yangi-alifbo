// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { convertPage, convertSelection } from "../src/dom.js";

const opts = {};

beforeEach(() => {
  document.body.innerHTML = "";
  document.title = "";
});

function select(node: Node, start: number, endNode: Node, end: number) {
  const r = document.createRange();
  r.setStart(node, start);
  r.setEnd(endNode, end);
  const s = document.getSelection()!;
  s.removeAllRanges();
  s.addRange(r);
}

describe("convertPage", () => {
  it("formatlash saqlanadi, kod va maydonlar tegilmaydi", () => {
    document.title = "Toshkent shahri";
    document.body.innerHTML =
      `<p id="p"><b>S</b>hahar va <i>o'</i>zbek tili</p>` +
      `<code>shell</code><textarea>shahar</textarea><input placeholder="Ismingiz: Shohruh">`;
    const r = convertPage(document, opts);
    expect(document.getElementById("p")!.innerHTML).toBe("<b>Ş</b>ahar va <i>ö</i>zbek tili");
    expect(document.querySelector("code")!.textContent).toBe("shell");
    expect(document.querySelector("textarea")!.value).toBe("shahar");
    expect(document.querySelector("input")!.getAttribute("placeholder")).toBe("Ismingiz: Şohruh");
    expect(document.title).toBe("Toşkent şahri");
    expect(r.words).toBe(3); // Shahar, oʻzbek + sarlavha
  });

  it("bloklar bir-biriga qoʻshilmaydi", () => {
    document.body.innerHTML = `<div>s</div><div>hahar</div>`;
    convertPage(document, opts);
    expect(document.body.innerHTML).toBe(`<div>s</div><div>hahar</div>`);
  });

  it("kirill sahifa", () => {
    document.body.innerHTML = `<h1>Ўзбекистон Республикаси</h1><li>Тошкент шаҳри</li>`;
    convertPage(document, opts);
    expect(document.body.textContent).toBe("Özbekiston RespublikasiToşkent şahri");
  });

  it("contenteditable tegilmaydi", () => {
    document.body.innerHTML = `<div contenteditable="true">shahar</div>`;
    convertPage(document, opts);
    expect(document.body.textContent).toBe("shahar");
  });
});

describe("convertSelection", () => {
  it("textarea: faqat belgilangan qism", () => {
    document.body.innerHTML = `<textarea>choy va shakar</textarea>`;
    const ta = document.querySelector("textarea")!;
    ta.focus();
    ta.setSelectionRange(0, 4);
    let fired = 0;
    ta.addEventListener("input", () => fired++);
    const r = convertSelection(document, opts);
    expect(ta.value).toBe("çoy va shakar");
    expect(r).toMatchObject({ method: "input", words: 1 });
    expect(fired).toBe(1);
  });

  it("input: belgilanmagan boʻlsa butun maydon", () => {
    document.body.innerHTML = `<input type="text" value="Toshkent shahri">`;
    const el = document.querySelector("input")!;
    el.focus();
    el.setSelectionRange(3, 3);
    convertSelection(document, opts);
    expect(el.value).toBe("Toşkent şahri");
  });

  it("parol maydoni tegilmaydi", () => {
    document.body.innerHTML = `<input type="password" value="shahar">`;
    const el = document.querySelector("input")!;
    el.focus();
    expect(convertSelection(document, opts).method).toBe("none");
    expect(el.value).toBe("shahar");
  });

  it("sahifa matni: faqat belgilangan soʻz", () => {
    document.body.innerHTML = `<p>Toshkent shahri choy</p>`;
    const t = document.querySelector("p")!.firstChild!;
    select(t, 9, t, 15); // "shahri"
    const r = convertSelection(document, opts);
    expect(document.querySelector("p")!.textContent).toBe("Toshkent şahri choy");
    expect(r).toMatchObject({ method: "text", words: 1 });
  });

  it("sahifa matni: bir nechta element boʻylab", () => {
    document.body.innerHTML = `<p>bog'<b>da</b> choy <i>ich</i>dik</p>`;
    const p = document.querySelector("p")!;
    select(p.firstChild!, 0, p.lastChild!, 3);
    convertSelection(document, opts);
    expect(p.innerHTML).toBe("boğ<b>da</b> çoy <i>iç</i>dik");
  });

  it("belgilanmagan", () => {
    document.body.innerHTML = `<p>shahar</p>`;
    document.getSelection()!.removeAllRanges();
    expect(convertSelection(document, opts).method).toBe("none");
  });
});
