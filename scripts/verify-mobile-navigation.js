/**
 * Verify the mobile app's navigation graph is internally consistent.
 *
 * Run: node scripts/verify-mobile-navigation.js   (exit 1 on any problem)
 *
 * Checks three failure modes, all of which bundle cleanly and only surface
 * when a user taps something:
 *
 *   1. Dangling navigate() - a screen calls navigation.navigate('X') where no
 *      route named X is registered anywhere.
 *   2. Unreachable screen - a screen file exists and was built, but nothing
 *      imports it into a navigator. This app shipped `receiptsApi` with no
 *      screen at all, so this class of waste is not hypothetical.
 *   3. Duplicate route names within a single stack.
 *
 * Cross-tab navigation is allowed: React Navigation resolves a route name
 * against parent navigators, so a name registered in any stack counts.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'mobile', 'src');
const SCREENS = path.join(SRC, 'screens');
const NAV_DIR = path.join(SRC, 'navigation');

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.jsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

const navFiles = walk(NAV_DIR).filter((f) => !f.endsWith('.bak'));
const navSource = navFiles.map((f) => fs.readFileSync(f, 'utf8')).join('\n');

/* ---- registered route names -------------------------------------------- */

const registered = new Map(); // name -> count
for (const m of navSource.matchAll(/\bname:\s*'([A-Za-z0-9_]+)'/g)) {
  registered.set(m[1], (registered.get(m[1]) || 0) + 1);
}
// <Stack.Screen name="X" ...> form
for (const m of navSource.matchAll(/<Stack\.Screen[^>]*\bname=["']([A-Za-z0-9_]+)["']/g)) {
  registered.set(m[1], (registered.get(m[1]) || 0) + 1);
}

/* ---- screens imported by navigators ------------------------------------ */

const importedFiles = new Set();
for (const m of navSource.matchAll(/from\s+'(\.\.\/screens\/[^']+)'/g)) {
  const resolved = path.resolve(NAV_DIR, m[1]);
  importedFiles.add(`${resolved}.jsx`);
}

/* ---- navigate() targets used by screens -------------------------------- */

const screenFiles = walk(SCREENS);
const problems = [];
const navigateTargets = new Map(); // name -> [files]

for (const file of screenFiles) {
  const src = fs.readFileSync(file, 'utf8');
  const rel = path.relative(ROOT, file);
  const patterns = [
    /navigation\.navigate\(\s*'([A-Za-z0-9_]+)'/g,
    /navigation\.push\(\s*'([A-Za-z0-9_]+)'/g,
    /navigation\.replace\(\s*'([A-Za-z0-9_]+)'/g
  ];
  for (const re of patterns) {
    for (const m of src.matchAll(re)) {
      if (!navigateTargets.has(m[1])) navigateTargets.set(m[1], []);
      navigateTargets.get(m[1]).push(rel);
    }
  }
}

for (const [target, files] of navigateTargets) {
  if (!registered.has(target)) {
    const where = [...new Set(files)].join(', ');
    problems.push(`dangling route "${target}" - navigated to from ${where}, but never registered`);
  }
}

/* ---- unreachable screens ------------------------------------------------ */

// Screens reached only by being rendered directly by another screen are fine,
// so treat a file as reachable if a navigator imports it OR another screen does.
const importedByScreens = new Set();
for (const file of screenFiles) {
  const src = fs.readFileSync(file, 'utf8');
  for (const m of src.matchAll(/from\s+'(\.[^']*)'/g)) {
    const resolved = path.resolve(path.dirname(file), m[1]);
    importedByScreens.add(resolved.endsWith('.jsx') ? resolved : `${resolved}.jsx`);
  }
}

for (const file of screenFiles) {
  if (importedFiles.has(file) || importedByScreens.has(file)) continue;
  problems.push(`unreachable screen ${path.relative(ROOT, file)} - no navigator or screen imports it`);
}

/* ---- duplicate registrations ------------------------------------------- */

for (const [name, count] of registered) {
  if (count > 1) {
    problems.push(`route "${name}" is registered ${count} times - navigation to it is ambiguous`);
  }
}

if (problems.length) {
  console.error('Navigation problems:\n');
  problems.forEach((p) => console.error(`  - ${p}`));
  process.exit(1);
}

console.log(
  `Navigation OK: ${registered.size} routes registered, `
  + `${navigateTargets.size} navigate targets all resolve, `
  + `${screenFiles.length} screen files all reachable.`
);
