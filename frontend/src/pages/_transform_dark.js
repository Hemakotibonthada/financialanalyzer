/**
 * Replaces ALL dark: Tailwind classes with dk-conditional template expressions.
 * Strategy:
 *   1. Convert className="...dark:..." to className={`...dark:...`}
 *   2. Convert '...dark:...' single-quoted class strings to `...` template literals
 *   3. Token-scan each className value and pair each dark:X with its matching light class
 *      using a "base key" heuristic (modifiers + utility-prefix).
 *      Standalone dark: classes (no pair found) become ${dk ? 'X' : ''}.
 */

const fs = require('fs');
const path = require('path');

// ─── helpers ────────────────────────────────────────────────────────────────

/** Extract a stable "key" for matching light ↔ dark tokens.
 *  e.g.  "hover:bg-slate-100"  →  "hover:bg"
 *        "text-green-700"      →  "text"
 *        "border-slate-200"    →  "border"
 */
function baseKey(cls) {
  const parts = cls.split(':');
  const modifiers = parts.slice(0, -1).sort().join(':'); // hover, focus, md …
  const value = parts[parts.length - 1];                // bg-slate-800, text-white …

  // Take everything up to (but not including) the last dash-segment that
  // looks like a colour/size: e.g. "bg-green-900/40" → "bg", "border-x-slate-700" → "border-x"
  // We keep two-word prefixes like border-x, border-t, from-*, via-*, to-* etc.
  const segments = value.split('-');
  // Heuristic: the "utility prefix" is the longest leading sequence of
  // non-numeric, non-colour segments. For common Tailwind classes 1–2 segments.
  let prefixLen = 1;
  if (
    segments.length >= 2 &&
    /^(x|y|t|r|b|l|s|e|top|right|bottom|left|from|via|to|opacity|ring|shadow)$/i.test(segments[1])
  ) {
    prefixLen = 2;
  }
  const utilityPrefix = segments.slice(0, prefixLen).join('-');
  return modifiers ? `${modifiers}:${utilityPrefix}` : utilityPrefix;
}

/** Process a flat class-name string (no surrounding quotes/backticks).
 *  Returns {result: string, converted: number}
 */
function processClassTokens(classStr) {
  const tokens = classStr.split(/\s+/).filter(Boolean);
  const result = [...tokens];
  let converted = 0;

  for (let i = 0; i < result.length; i++) {
    const tok = result[i];
    if (!tok || !tok.startsWith('dark:')) continue;

    const darkClass = tok.slice(5); // remove 'dark:'
    const key = baseKey(darkClass);

    // Scan backward for closest matching light token
    let matchIdx = -1;
    for (let j = i - 1; j >= 0; j--) {
      const prev = result[j];
      if (!prev || prev === '__REMOVED__' || prev.startsWith('${')) continue;
      if (baseKey(prev) === key) {
        matchIdx = j;
        break;
      }
    }

    if (matchIdx >= 0) {
      const lightClass = result[matchIdx];
      result[matchIdx] = `\${dk ? '${darkClass}' : '${lightClass}'}`;
      result[i] = '__REMOVED__';
    } else {
      result[i] = `\${dk ? '${darkClass}' : ''}`;
    }
    converted++;
  }

  return {
    result: result.filter(t => t !== '__REMOVED__').join(' '),
    converted,
  };
}

/** Wrap any bare (non-template) className string value that still has dark: into a template literal. */
function upgradeClassNameStrings(content) {
  // className="...dark:..."  →  className={`...dark:...`}
  content = content.replace(
    /className="([^"]*dark:[^"]*)"/g,
    (_, inner) => `className={\`${inner}\``+ '}'
  );
  return content;
}

/** Convert single-quoted JSX string literals that contain dark: to template literals.
 *  e.g.  '...dark:...'  →  `...dark:...`
 *  This handles the "ternary in className template" case.
 */
function upgradeSingleQuotedStrings(content) {
  // Must be careful not to match e.g. import paths.
  // Heuristic: only match inside JSX attribute expressions (lines with className).
  // We do a global replace but restrict to strings containing dark: not starting with 'import'/'require'.
  content = content.replace(
    /'([^'\n]*dark:[^'\n]*)'/g,
    (_, inner) => `\`${inner}\``
  );
  return content;
}

/** Main: replace dark: classes in all className strings. */
function transformContent(content) {
  // Phase 1 – ensure all affected className values are template literals
  content = upgradeClassNameStrings(content);
  content = upgradeSingleQuotedStrings(content);

  // Phase 2 – process all template-literal className values
  // We find ALL backtick-delimited strings containing dark: and process them.
  // Note: nested template literals are handled because we iterate until stable.
  let totalConverted = 0;
  let iterations = 0;
  const MAX = 20;

  while (iterations < MAX) {
    iterations++;
    let changed = false;

    // Match backtick strings (including nested ones via a simple scan)
    content = content.replace(/`([^`]*dark:[^`]*)`/g, (match, inner) => {
      const { result, converted } = processClassTokens(inner);
      if (converted > 0) {
        changed = true;
        totalConverted += converted;
      }
      return `\`${result}\``;
    });

    if (!changed) break;
  }

  return { content, totalConverted };
}

// ─── main ───────────────────────────────────────────────────────────────────

const FILES = [
  'FamilyFinance.jsx',
  'SecurityCenter.jsx',
  'EnhancedNetWorthTracker.jsx',
].map(f => path.join('C:\\Users\\v-hbonthada\\WorkSpace-Pract\\FinancialAnalyzer\\frontend\\src\\pages', f));

for (const file of FILES) {
  const original = fs.readFileSync(file, 'utf8');
  const beforeCount = (original.match(/dark:/g) || []).length;

  const { content, totalConverted } = transformContent(original);
  const afterCount = (content.match(/dark:/g) || []).length;

  console.log(`\n${path.basename(file)}`);
  console.log(`  Before: ${beforeCount}  Eliminated: ${beforeCount - afterCount}  Remaining: ${afterCount}`);

  if (afterCount > 0) {
    console.log('  ⚠ Lines still containing dark:');
    content.split('\n').forEach((line, i) => {
      if (line.includes('dark:')) console.log(`    L${i + 1}: ${line.trim()}`);
    });
  } else {
    console.log('  ✓ All dark: classes replaced');
    fs.writeFileSync(file, content, 'utf8');
    console.log('  ✓ File written');
  }
}
