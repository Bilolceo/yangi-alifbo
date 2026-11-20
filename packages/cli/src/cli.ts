import { readFile, readdir, stat, writeFile, mkdir } from "node:fs/promises";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { convertWithReport, toOldLatin, type ConvertOptions } from "@yangi-alifbo/core";
import { convertOfficeFile } from "@yangi-alifbo/office";

const HELP = `yangi-alifbo — matn va hujjatlarni 2026-yilgi yangi oʻzbek alifbosiga oʻgirish

Foydalanish:
  yangi-alifbo <fayl|papka>... [sozlamalar]
  echo "Oʻzbekiston" | yangi-alifbo -

Sozlamalar:
  -o, --out <papka>      Natijani shu papkaga yozish (standart: fayl yonida, nom.yangi.ext)
  --in-place             Asl faylning ustidan yozish (ehtiyot boʻling!)
  --from <auto|latin|cyrillic>   Manba yozuvi (standart: auto)
  --reverse              Yangi alifbodan eski lotinga qaytarish (faqat matn fayllar)
  --no-foreign           Chet soʻz evristikasini oʻchirish
  --protect <soʻz,soʻz>  Oʻgirilmaydigan soʻzlar
  --dry-run              Faylga yozmasdan, faqat hisobot
  -v, --verbose          Ogohlantirishlarni koʻrsatish
  -h, --help             Yordam

Formatlar: .docx .xlsx .pptx .txt .md .csv .tsv .json .html .htm .xml .srt
`;

const TEXT_EXT = new Set([".txt", ".md", ".csv", ".tsv", ".json", ".html", ".htm", ".xml", ".srt"]);
const OFFICE_EXT = new Set([".docx", ".xlsx", ".pptx"]);

interface Args {
  inputs: string[]; out?: string; inPlace: boolean; reverse: boolean; dry: boolean; verbose: boolean;
  options: ConvertOptions;
}

function parse(argv: string[]): Args {
  const a: Args = { inputs: [], inPlace: false, reverse: false, dry: false, verbose: false, options: {} };
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    switch (x) {
      case "-h": case "--help": process.stdout.write(HELP); process.exit(0);
      case "-o": case "--out": a.out = argv[++i]; break;
      case "--in-place": a.inPlace = true; break;
      case "--from": a.options.from = argv[++i] as ConvertOptions["from"]; break;
      case "--reverse": a.reverse = true; break;
      case "--no-foreign": a.options.protectForeign = false; break;
      case "--protect": a.options.protectedWords = (argv[++i] ?? "").split(",").map((s) => s.trim()).filter(Boolean); break;
      case "--dry-run": a.dry = true; break;
      case "-v": case "--verbose": a.verbose = true; break;
      default:
        if (x.startsWith("-") && x !== "-") throw new Error(`Nomaʼlum sozlama: ${x}`);
        a.inputs.push(x);
    }
  }
  return a;
}

async function* walk(p: string): AsyncGenerator<string> {
  const s = await stat(p);
  if (s.isFile()) { yield p; return; }
  for (const e of await readdir(p, { withFileTypes: true })) {
    if (e.name.startsWith(".") || e.name === "node_modules") continue;
    const full = join(p, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (!/\.yangi\.[^.]+$/.test(e.name) && !e.name.startsWith("~$")) yield full;
  }
}

function target(file: string, root: string, a: Args): string {
  if (a.inPlace) return file;
  const ext = extname(file);
  if (a.out) {
    const rel = relative(root, file) || basename(file);
    return join(resolve(a.out), rel);
  }
  return join(dirname(file), basename(file, ext) + ".yangi" + ext);
}

async function main() {
  const a = parse(process.argv.slice(2));
  if (a.inputs.length === 0) { process.stdout.write(HELP); process.exit(1); }

  if (a.inputs.length === 1 && a.inputs[0] === "-") {
    const chunks: Buffer[] = [];
    for await (const c of process.stdin) chunks.push(c as Buffer);
    const t = Buffer.concat(chunks).toString("utf8");
    process.stdout.write(a.reverse ? toOldLatin(t) : convertWithReport(t, a.options).text);
    return;
  }

  let files = 0, changed = 0, skipped = 0, failed = 0;
  for (const input of a.inputs) {
    const root = (await stat(input)).isDirectory() ? input : dirname(input);
    for await (const file of walk(input)) {
      const ext = extname(file).toLowerCase();
      const isOffice = OFFICE_EXT.has(ext);
      if (!isOffice && !TEXT_EXT.has(ext)) { skipped++; continue; }
      try {
        const buf = await readFile(file);
        let data: Uint8Array | string;
        let n: number;
        let warnings: { word: string; reason: string }[];
        if (isOffice) {
          if (a.reverse) throw new Error("--reverse hozircha faqat matn fayllar uchun");
          const r = await convertOfficeFile(buf, a.options);
          data = r.data; n = r.report.words; warnings = r.report.warnings;
        } else {
          const t = buf.toString("utf8");
          if (a.reverse) { data = toOldLatin(t); n = data === t ? 0 : 1; warnings = []; }
          else { const r = convertWithReport(t, a.options); data = r.text; n = r.changes; warnings = r.warnings; }
        }
        files++;
        if (n > 0) changed++;
        const out = target(file, root, a);
        if (!a.dry && n > 0) {
          await mkdir(dirname(out), { recursive: true });
          await writeFile(out, data);
        }
        console.log(`${n > 0 ? "✔" : "·"} ${file}${n > 0 && !a.dry ? "  →  " + out : ""}  (${n} oʻzgarish${warnings.length ? `, ${warnings.length} ogohlantirish` : ""})`);
        if (a.verbose) for (const w of warnings) console.log(`    ⚠ ${w.word}  [${w.reason}]`);
      } catch (e) {
        failed++;
        console.error(`✘ ${file}: ${(e as Error).message}`);
      }
    }
  }
  console.log(`\nJami: ${files} fayl, ${changed} tasi oʻzgardi, ${skipped} tasi oʻtkazib yuborildi${failed ? `, ${failed} xato` : ""}.`);
  if (failed) process.exitCode = 1;
}

main().catch((e) => { console.error((e as Error).message); process.exit(1); });
