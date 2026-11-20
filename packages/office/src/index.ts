import JSZip from "jszip";
import type { ConvertOptions, ConvertWarning } from "@yangi-alifbo/core";
import { CORE_PROPS, DOCX, PPTX, XLSX, convertXml, type XmlDialect } from "./xml.js";

export { convertXml, decodeXml, encodeXml, DOCX, PPTX, XLSX, type XmlDialect, type XmlResult } from "./xml.js";

export type OfficeKind = "docx" | "xlsx" | "pptx";

export interface OfficeReport {
  kind: OfficeKind;
  /** Oʻzgargan matn tugunlari soni. */
  changed: number;
  parts: { path: string; changed: number }[];
  warnings: (ConvertWarning & { part: string })[];
}

const PART_RULES: Record<OfficeKind, [RegExp, XmlDialect][]> = {
  docx: [
    [/^word\/(document|header\d*|footer\d*|footnotes|endnotes|comments)\.xml$/, DOCX],
    [/^docProps\/core\.xml$/, CORE_PROPS],
  ],
  pptx: [
    [/^ppt\/(slides\/slide|notesSlides\/notesSlide|diagrams\/data)\d+\.xml$/, PPTX],
    [/^docProps\/core\.xml$/, CORE_PROPS],
  ],
  xlsx: [
    [/^xl\/(sharedStrings|worksheets\/sheet\d+|comments\d+)\.xml$/, XLSX],
    [/^docProps\/core\.xml$/, CORE_PROPS],
  ],
};

export type BinaryInput = ArrayBuffer | Uint8Array | Blob;

/** ZIP ichidagi fayllarga qarab turini aniqlaydi. */
export function detectKind(zip: JSZip): OfficeKind | undefined {
  if (zip.file("word/document.xml")) return "docx";
  if (zip.file("xl/workbook.xml")) return "xlsx";
  if (zip.file("ppt/presentation.xml")) return "pptx";
  return undefined;
}

/**
 * DOCX / XLSX / PPTX faylni yangi alifboga oʻgiradi.
 * Faqat matn oʻzgaradi; formatlash, rasmlar, formulalar, stillar tegilmaydi.
 */
export async function convertOfficeFile(
  input: BinaryInput,
  options?: ConvertOptions,
): Promise<{ data: Uint8Array; report: OfficeReport }> {
  const zip = await JSZip.loadAsync(input);
  const kind = detectKind(zip);
  if (!kind) throw new Error("Qoʻllab-quvvatlanmaydigan fayl: DOCX, XLSX yoki PPTX kutilgan");

  const report: OfficeReport = { kind, changed: 0, parts: [], warnings: [] };
  const rules = PART_RULES[kind];
  for (const path of Object.keys(zip.files).sort()) {
    const rule = rules.find(([re]) => re.test(path));
    if (!rule || zip.files[path].dir) continue;
    const xml = await zip.file(path)!.async("string");
    const r = convertXml(xml, rule[1], options);
    if (r.changed > 0) zip.file(path, r.xml);
    report.changed += r.changed;
    report.parts.push({ path, changed: r.changed });
    for (const w of r.warnings) report.warnings.push({ ...w, part: path });
  }

  const data = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
    mimeType: MIME[kind],
  });
  return { data, report };
}

export const MIME: Record<OfficeKind, string> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

/**
 * Word Add-in uchun: `range.getOoxml()` qaytargan Flat OPC XML (pkg:package) ni oʻgiradi.
 * Natijani `range.insertOoxml(xml, "Replace")` ga berish mumkin.
 */
export function convertFlatOoxml(xml: string, options?: ConvertOptions) {
  return convertXml(xml, DOCX, options);
}
