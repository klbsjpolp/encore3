// Minimal, dependency-free symbol extractor for the anatomy store.
//
// post-write.js imports { extractSymbols, symbolsSupported, SYMBOL_MIN_TOKENS }
// from here and only calls extractSymbols() for files at/above the token
// threshold whose extension is supported. The call is wrapped in a try/catch,
// so any parsing edge case degrades gracefully to "no symbols" rather than
// breaking the hook.

// Only run on large-enough files — small files don't need a symbol index.
export const SYMBOL_MIN_TOKENS = 1500;

const SUPPORTED_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py"]);

export function symbolsSupported(ext) {
  return SUPPORTED_EXTS.has((ext || "").toLowerCase());
}

// Top-level declaration patterns per language family. Each entry pairs a regex
// (with the symbol name in group 1) with the symbol kind it represents.
const JS_PATTERNS = [
  { kind: "function", re: /^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)/ },
  { kind: "class", re: /^\s*(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/ },
  { kind: "const", re: /^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/ },
  { kind: "type", re: /^\s*(?:export\s+)?(?:type|interface|enum)\s+([A-Za-z_$][\w$]*)/ },
];

const PY_PATTERNS = [
  { kind: "function", re: /^\s*(?:async\s+)?def\s+([A-Za-z_][\w]*)/ },
  { kind: "class", re: /^\s*class\s+([A-Za-z_][\w]*)/ },
];

// Extract top-level symbols with 1-indexed line numbers. Returns an array of
// { name, kind, line }, capped so the anatomy store never balloons.
export function extractSymbols(content, ext) {
  if (!content) return [];
  const patterns = (ext || "").toLowerCase() === ".py" ? PY_PATTERNS : JS_PATTERNS;
  const lines = content.split("\n");
  const symbols = [];
  const seen = new Set();
  const MAX_SYMBOLS = 200;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const { kind, re } of patterns) {
      const m = line.match(re);
      if (m && m[1]) {
        const key = `${kind}:${m[1]}`;
        if (!seen.has(key)) {
          seen.add(key);
          symbols.push({ name: m[1], kind, line: i + 1 });
        }
        break;
      }
    }
    if (symbols.length >= MAX_SYMBOLS) break;
  }

  return symbols;
}
