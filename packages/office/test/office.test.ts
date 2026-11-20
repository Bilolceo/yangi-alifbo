import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { convertOfficeFile, convertXml, DOCX, PPTX, XLSX } from "../src/index.js";

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';

describe("convertXml DOCX", () => {
  it("run'lar orasida boʻlingan harflar, formatlash saqlanadi", () => {
    const xml =
      `<w:document ${W}><w:body><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>S</w:t></w:r>` +
      `<w:r><w:t>hahar o</w:t></w:r><w:r><w:rPr><w:i/></w:rPr><w:t>&apos;zbek</w:t></w:r></w:p></w:body></w:document>`;
    const r = convertXml(xml, DOCX);
    expect(r.xml).toBe(
      `<w:document ${W}><w:body><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Ş</w:t></w:r>` +
        `<w:r><w:t>ahar ö</w:t></w:r><w:r><w:rPr><w:i/></w:rPr><w:t>zbek</w:t></w:r></w:p></w:body></w:document>`,
    );
  });

  it("tab va br soʻzlarni ajratadi", () => {
    const xml = `<w:p><w:r><w:t>s</w:t><w:tab/><w:t>hahar</w:t></w:r></w:p>`;
    expect(convertXml(xml, DOCX).xml).toBe(xml);
  });

  it("paragraflar bir-biriga qoʻshilmaydi", () => {
    const xml = `<w:p><w:r><w:t>s</w:t></w:r></w:p><w:p><w:r><w:t>hahar</w:t></w:r></w:p>`;
    expect(convertXml(xml, DOCX).xml).toBe(xml);
  });

  it("ichma-ich paragraf (text box)", () => {
    const xml =
      `<w:p><w:r><w:t>bog'</w:t></w:r><w:r><w:drawing><w:txbxContent><w:p><w:r><w:t>choy</w:t></w:r></w:p>` +
      `</w:txbxContent></w:drawing></w:r><w:r><w:t>shahar</w:t></w:r></w:p>`;
    expect(convertXml(xml, DOCX).xml).toBe(
      `<w:p><w:r><w:t>boğ</w:t></w:r><w:r><w:drawing><w:txbxContent><w:p><w:r><w:t>çoy</w:t></w:r></w:p>` +
        `</w:txbxContent></w:drawing></w:r><w:r><w:t>şahar</w:t></w:r></w:p>`,
    );
  });

  it("delText va instrText tegilmaydi, entity va xml:space", () => {
    const xml =
      `<w:p><w:del><w:r><w:delText>shahar</w:delText></w:r></w:del><w:r><w:instrText> HYPERLINK "https://x.uz/shahar" </w:instrText></w:r>` +
      `<w:r><w:t>choy &amp; non</w:t></w:r><w:r><w:t xml:space="preserve"> s</w:t></w:r><w:r><w:t>h</w:t></w:r></w:p>`;
    const out = convertXml(xml, DOCX).xml;
    expect(out).toContain("<w:delText>shahar</w:delText>");
    expect(out).toContain('HYPERLINK "https://x.uz/shahar"');
    expect(out).toContain("<w:t>çoy &amp; non</w:t>");
    expect(out).toContain('<w:t xml:space="preserve"> ş</w:t><w:t></w:t>'.replace("<w:t></w:t>", "</w:r><w:r><w:t></w:t>"));
  });

  it("oʻzgarish boʻlmasa XML aynan qaytadi", () => {
    const xml = `<?xml version="1.0"?><!-- izoh <w:t>sh</w:t> --><w:p><w:r><w:t>salom</w:t></w:r></w:p>`;
    const r = convertXml(xml, DOCX);
    expect(r.xml).toBe(xml);
    expect(r.changed).toBe(0);
  });
});

describe("PPTX va XLSX", () => {
  it("pptx a:t", () => {
    const xml = `<p:sp><p:txBody><a:p><a:r><a:t>O'zbekiston</a:t></a:r><a:br/><a:r><a:t>shahri</a:t></a:r></a:p></p:txBody></p:sp>`;
    expect(convertXml(xml, PPTX).xml).toBe(
      `<p:sp><p:txBody><a:p><a:r><a:t>Özbekiston</a:t></a:r><a:br/><a:r><a:t>şahri</a:t></a:r></a:p></p:txBody></p:sp>`,
    );
  });
  it("xlsx sharedStrings, rich text", () => {
    const xml = `<sst><si><t>Toshkent</t></si><si><r><t>s</t></r><r><rPr><b/></rPr><t>hahar</t></r></si><si><t>tableParts</t></si></sst>`;
    expect(convertXml(xml, XLSX).xml).toBe(
      `<sst><si><t>Toşkent</t></si><si><r><t>ş</t></r><r><rPr><b/></rPr><t>ahar</t></r></si><si><t>tableParts</t></si></sst>`,
    );
  });
});

describe("convertOfficeFile", () => {
  it("docx: hujjat, kolontitul, core props; boshqa fayllar tegilmaydi", async () => {
    const zip = new JSZip();
    zip.file("[Content_Types].xml", "<Types/>");
    zip.file("word/document.xml", `<w:document ${W}><w:body><w:p><w:r><w:t>O'zbekiston Respublikasi</w:t></w:r></w:p></w:body></w:document>`);
    zip.file("word/header1.xml", `<w:hdr ${W}><w:p><w:r><w:t>Toshkent shahri</w:t></w:r></w:p></w:hdr>`);
    zip.file("word/styles.xml", `<w:styles ${W}><w:t>shahar</w:t></w:styles>`);
    zip.file("docProps/core.xml", `<cp:coreProperties><dc:title>Buyruq: o'quv yili</dc:title></cp:coreProperties>`);
    const input = await zip.generateAsync({ type: "uint8array" });

    const { data, report } = await convertOfficeFile(input);
    const out = await JSZip.loadAsync(data);
    expect(await out.file("word/document.xml")!.async("string")).toContain("Özbekiston Respublikasi");
    expect(await out.file("word/header1.xml")!.async("string")).toContain("Toşkent şahri");
    expect(await out.file("word/styles.xml")!.async("string")).toContain("<w:t>shahar</w:t>");
    expect(await out.file("docProps/core.xml")!.async("string")).toContain("<dc:title>Buyruq: öquv yili</dc:title>");
    expect(report.kind).toBe("docx");
    expect(report.changed).toBe(3);
  });

  it("notoʻgʻri fayl", async () => {
    const zip = new JSZip();
    zip.file("a.txt", "x");
    await expect(convertOfficeFile(await zip.generateAsync({ type: "uint8array" }))).rejects.toThrow();
  });
});
