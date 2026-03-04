/**
 * One-shot script: replace ALL dark: Tailwind classes with dk-conditional equivalents.
 * Run once from this directory: node transform-dark.js
 */
const fs = require('fs');
const path = require('path');

const BASE = __dirname;

// ── helpers ──────────────────────────────────────────────────────────────────

// Replace all "lightClass dark:darkClass" pairs (on the same line only – excludes \n)
// and any leftover standalone dark:X
function replaceDarkInStr(s) {
  // paired: lightClass dark:darkClass  →  ${dk ? 'darkClass' : 'lightClass'}
  s = s.replace(/([\w:./-]+)[ \t]+dark:([\w:./-]+)/g, (_, l, d) => `\${dk ? '${d}' : '${l}'}`);
  // standalone dark:X  →  ${dk ? 'X' : ''}
  s = s.replace(/dark:([\w:./-]+)/g, (_, d) => `\${dk ? '${d}' : ''}`);
  return s;
}

// ── per-file transforms ───────────────────────────────────────────────────────

function goalTimelineExtraTransforms(c) {
  // 1. Add `dk = false` prop to ProgressRing so ${dk ? ...} is valid inside it
  c = c.replace(
    'const ProgressRing = ({ pct, color, size = 80 }) =>',
    'const ProgressRing = ({ pct, color, size = 80, dk = false }) =>'
  );

  // 2. Pass dk to every ProgressRing call site
  c = c.replace(/<ProgressRing pct=\{pct\} color=\{colors\.ring\} \/>/g,
    '<ProgressRing pct={pct} color={colors.ring} dk={dk} />');
  c = c.replace(/<ProgressRing pct=\{pct\} color=\{colors\.ring\} size=\{64\} \/>/g,
    '<ProgressRing pct={pct} color={colors.ring} size={64} dk={dk} />');

  // 3. Convert GOAL_COLORS `bg` string values to arrow functions
  //    'bg-xxx dark:bg-yyy'  →  (dk) => dk ? 'bg-yyy' : 'bg-xxx'
  c = c.replace(/(bg:\s*)'([\w:./-]+)[ \t]+dark:([\w:./-]+)'/g,
    (_, prefix, light, dark) => `${prefix}(dk) => dk ? '${dark}' : '${light}'`);

  // 4. Update every usage of colors.bg to colors.bg(dk)
  c = c.replace(/\$\{colors\.bg\}/g, '${colors.bg(dk)}');

  return c;
}

// ── main processing ───────────────────────────────────────────────────────────

function processFile(filePath, extraFn) {
  let c = fs.readFileSync(filePath, 'utf8');
  const before = (c.match(/dark:/g) || []).length;

  // Apply file-specific pre-transforms (e.g. GoalTimeline)
  if (extraFn) c = extraFn(c);

  // Step A: Convert static className="... dark:... " to template-literal className={`...`}
  c = c.replace(/className="([^"]*)"/g, (match, inner) => {
    if (!inner.includes('dark:')) return match;
    return `className={\`${inner}\`}`;
  });

  // Step B: Convert single-quoted class strings inside ${} that contain dark:
  //         e.g.  '... light dark:dark ...'  →  `... ${dk ? 'dark' : 'light'} ...`
  c = c.replace(/'([^'\n]*dark:[^'\n]*)'/g, (match, inner) => {
    const replaced = replaceDarkInStr(inner);
    if (replaced !== inner) return `\`${replaced}\``;
    return match;
  });

  // Step C: Global paired replacement for everything still in template-literal scope
  c = c.replace(/([\w:./-]+)[ \t]+dark:([\w:./-]+)/g,
    (_, l, d) => `\${dk ? '${d}' : '${l}'}`);

  // Step D: Any leftover standalone dark:
  c = c.replace(/dark:([\w:./-]+)/g,
    (_, d) => `\${dk ? '${d}' : ''}`);

  const after = (c.match(/dark:/g) || []).length;
  fs.writeFileSync(filePath, c, 'utf8');

  const base = path.basename(filePath);
  console.log(`${base}: ${before} dark: eliminated → ${after} remaining`);
}

// ── run ───────────────────────────────────────────────────────────────────────
processFile(path.join(BASE, 'SplitExpenses.jsx'));
processFile(path.join(BASE, 'GoalTimeline.jsx'), goalTimelineExtraTransforms);
processFile(path.join(BASE, 'FinancialScorecard.jsx'));
console.log('Done.');
