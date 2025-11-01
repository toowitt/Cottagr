import { promises as fs } from "fs";
import path from "path";
import { globby } from "globby";
import { encoding_for_model } from "tiktoken";

// ---------- CLI flags ----------
const args = new Set(process.argv.slice(2));
const MODEL = process.env.TOKEN_MODEL || "gpt-4o-mini";   // change if you like
const SRC_ONLY = args.has("--src-only");                  // only src/, prisma/, scripts/
const INCLUDE_DOCS = args.has("--include-docs");          // include .md/.mdx
const CSV = args.has("--csv");                            // emit CSV lines
const TOP = Number([...args].find(a => a.startsWith("--top="))?.split("=")[1] || 12);

// ---------- tokenizer ----------
const enc = encoding_for_model(MODEL);

// ---------- globs ----------
const codeExts = ["ts","tsx","js","jsx","mjs","cjs","json","yml","yaml","sql","prisma","css","scss"];
const docExts  = ["md","mdx"];
const chosenExts = INCLUDE_DOCS ? [...codeExts, ...docExts] : codeExts;

const baseGlobs = SRC_ONLY
  ? ["src", "prisma", "scripts"].flatMap(root => chosenExts.map(e => `${root}/**/*.${e}`))
  : chosenExts.map(e => `**/*.${e}`);

// ---------- ignores (LLM-irrelevant / generated) ----------
const ignore = [
  // lockfiles / caches / builds
  "**/node_modules/**",
  "**/.next/**",
  "**/.vercel/**",
  "**/dist/**",
  "**/build/**",
  "**/out/**",
  "**/coverage/**",
  "**/.turbo/**",
  "**/.git/**",
  "**/*.map",

  // lockfiles
  "**/package-lock.json",
  "**/yarn.lock",
  "**/pnpm-lock.yaml",
  "**/bun.lockb",

  // misc junk
  "**/.DS_Store",
];

function humanBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024*1024) return `${(n/1024).toFixed(1)} KB`;
  return `${(n/1024/1024).toFixed(2)} MB`;
}

const perDir = new Map();
const perFile = [];
let totalChars = 0;
let totalTokens = 0;

// ---------- main ----------
const files = await globby(baseGlobs, { gitignore: true, ignore });

for (const file of files) {
  const text = await fs.readFile(file, "utf8");
  const tok = enc.encode(text);
  const chars = text.length;
  const tokens = tok.length;

  totalChars += chars;
  totalTokens += tokens;

  perFile.push({
    file,
    chars,
    tokens,
    cpt: chars && tokens ? chars / tokens : 0
  });

  const dir = path.dirname(file);
  const agg = perDir.get(dir) || { tokens: 0, chars: 0, files: 0 };
  agg.tokens += tokens;
  agg.chars += chars;
  agg.files += 1;
  perDir.set(dir, agg);
}

if (CSV) {
  console.log("file,chars,tokens,chars_per_token");
  for (const f of perFile) {
    console.log(`${f.file},${f.chars},${f.tokens},${f.cpt.toFixed(2)}`);
  }
  process.exit(0);
}

console.log(`Model: ${MODEL}`);
console.log(`Files counted: ${files.length}`);
console.log(`Total characters: ${totalChars.toLocaleString()} (${humanBytes(totalChars)})`);
console.log(`Total tokens: ${totalTokens.toLocaleString()}`);
console.log(`Avg chars/token: ${(totalChars / Math.max(totalTokens,1)).toFixed(2)}\n`);

console.log("Top files by tokens:");
for (const f of perFile.sort((a,b) => b.tokens - a.tokens).slice(0, TOP)) {
  console.log(
    `${String(f.tokens).padStart(8)} tok  ${f.cpt.toFixed(2).padStart(6)} c/t  ${humanBytes(f.chars).padStart(8)}  ${f.file}`
  );
}

console.log("\nTop directories by tokens:");
for (const [dir, agg] of [...perDir.entries()].sort((a,b) => b[1].tokens - a[1].tokens).slice(0, TOP)) {
  const cpt = (agg.chars / Math.max(agg.tokens,1)).toFixed(2);
  console.log(
    `${String(agg.tokens).padStart(9)} tok  ${cpt.padStart(6)} c/t  ${humanBytes(agg.chars).padStart(8)}  ${dir}  (${agg.files} files)`
  );
}

console.log("\nHints: use --src-only to focus app code, --include-docs to count docs, --csv for per-file CSV, and TOKEN_MODEL=... to target a different tokenizer.");
