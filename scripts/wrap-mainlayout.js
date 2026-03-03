#!/usr/bin/env node
/**
 * Script to automatically wrap page components in MainLayout.
 * 
 * For each page file:
 * 1. Skip if already has MainLayout import
 * 2. Add import MainLayout from '../components/MainLayout' after last import
 * 3. Wrap the main component return in <MainLayout title="...">
 */

const fs = require('fs');
const path = require('path');

const PAGES_DIR = path.join(__dirname, '..', 'frontend', 'src', 'pages');

// Pages to SKIP (public/auth pages, or already wrapped)
const SKIP_FILES = new Set([
  'Login.jsx',
  'Register.jsx',
  'LandingPage.jsx',
  'NotFound.jsx',
]);

// Convert PascalCase to Title Case: "BankAccountManager" → "Bank Account Manager"
function toTitle(name) {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^ /, '')
    .replace(/V\s?2$/i, ' V2')
    .trim();
}

function processFile(filePath) {
  const fileName = path.basename(filePath);
  if (SKIP_FILES.has(fileName)) {
    return { file: fileName, status: 'skipped', reason: 'in skip list' };
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // Skip if already has MainLayout
  if (content.includes('MainLayout')) {
    return { file: fileName, status: 'skipped', reason: 'already has MainLayout' };
  }

  const lines = content.split('\n');

  // Find the last import line index
  let lastImportIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('import ') || (line.startsWith('} from ') || line.match(/^}\s*from\s+['"]/))) {
      lastImportIdx = i;
    }
    // Stop searching after we've gone past import section (e.g., first function or const)
    if (i > 5 && lastImportIdx > 0 && !line.startsWith('import') && !line.startsWith('}') && !line.startsWith('//') && !line.startsWith('/*') && !line.startsWith('*') && line.length > 0 && !line.startsWith('from') && !line.match(/^\s*$/)) {
      break;
    }
  }

  if (lastImportIdx === -1) {
    return { file: fileName, status: 'error', reason: 'no import found' };
  }

  // Get component name from export default
  let componentName = fileName.replace('.jsx', '');
  const exportMatch = content.match(/export\s+default\s+(\w+)/);
  if (exportMatch) {
    componentName = exportMatch[1];
  }

  const title = toTitle(componentName);

  // Insert MainLayout import after last import
  lines.splice(lastImportIdx + 1, 0, "import MainLayout from '../components/MainLayout';");

  // Now find the main component return
  // Strategy: Find the component function, then find its main return
  // The main return is typically at indentation level 2 (inside component function)
  
  // Rejoin to work with the modified content
  content = lines.join('\n');

  // Find the main return ( at component level - typically "  return (" with 2-space indent
  // We need to wrap the content inside the return
  
  // Pattern: find `return (\n` at the component level (2 or 4 space indent)
  // Then find the matching closing `);\n` 
  
  // Find all return statements and pick the last one that's at component level
  const returnRegex = /^( {2,4})return \(\s*\n/gm;
  let lastComponentReturn = null;
  let match;
  
  while ((match = returnRegex.exec(content)) !== null) {
    const indent = match[1];
    // Component-level returns are typically at 2 or 4 space indent
    if (indent.length <= 4) {
      lastComponentReturn = {
        index: match.index,
        fullMatch: match[0],
        indent: indent,
        endOfMatch: match.index + match[0].length
      };
    }
  }

  if (!lastComponentReturn) {
    return { file: fileName, status: 'error', reason: 'no component-level return found' };
  }

  // Find the opening JSX element right after "return (\n"
  const afterReturn = content.substring(lastComponentReturn.endOfMatch);
  
  // The first line after return ( is the opening JSX
  const firstJsxLine = afterReturn.split('\n')[0];
  const jsxIndent = firstJsxLine.match(/^(\s*)/)?.[1] || '    ';

  // Insert <MainLayout title="..."> after "return (\n"
  const insertAfterReturn = `${jsxIndent}<MainLayout title="${title}">\n`;
  
  // Find the matching ); for this return
  // We need to find the ); that closes this return statement
  // Count bracket depth starting from after "return ("
  let depth = 1; // We're inside the return (
  let closeReturnIdx = -1;
  let i = lastComponentReturn.endOfMatch;
  
  while (i < content.length && depth > 0) {
    const ch = content[i];
    if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      if (depth === 0) {
        closeReturnIdx = i;
      }
    }
    // Skip strings
    if (ch === "'" || ch === '"' || ch === '`') {
      const quote = ch;
      i++;
      while (i < content.length && content[i] !== quote) {
        if (content[i] === '\\') i++; // skip escaped chars
        i++;
      }
    }
    i++;
  }

  if (closeReturnIdx === -1) {
    return { file: fileName, status: 'error', reason: 'could not find matching close paren for return' };
  }

  // Find the newline before the closing )
  let insertBeforeClose = closeReturnIdx;
  while (insertBeforeClose > 0 && content[insertBeforeClose - 1] !== '\n') {
    insertBeforeClose--;
  }

  // Get the indent of the closing line
  const closingLineIndent = content.substring(insertBeforeClose, closeReturnIdx).match(/^(\s*)/)?.[1] || '    ';

  // Insert </MainLayout> before the closing element of the return
  const closeMainLayout = `${jsxIndent}</MainLayout>\n`;

  // Build new content
  const newContent = 
    content.substring(0, lastComponentReturn.endOfMatch) +
    insertAfterReturn +
    content.substring(lastComponentReturn.endOfMatch, insertBeforeClose) +
    closeMainLayout +
    content.substring(insertBeforeClose);

  fs.writeFileSync(filePath, newContent, 'utf8');

  return { file: fileName, status: 'wrapped', title };
}

// Main
const files = fs.readdirSync(PAGES_DIR)
  .filter(f => f.endsWith('.jsx'))
  .sort();

const results = { wrapped: [], skipped: [], errors: [] };

for (const file of files) {
  const result = processFile(path.join(PAGES_DIR, file));
  if (result.status === 'wrapped') results.wrapped.push(result);
  else if (result.status === 'skipped') results.skipped.push(result);
  else results.errors.push(result);
}

console.log(`\n=== MainLayout Wrapping Results ===`);
console.log(`✅ Wrapped: ${results.wrapped.length}`);
results.wrapped.forEach(r => console.log(`   ${r.file} → "${r.title}"`));
console.log(`⏭️  Skipped: ${results.skipped.length}`);
results.skipped.forEach(r => console.log(`   ${r.file} (${r.reason})`));
if (results.errors.length > 0) {
  console.log(`❌ Errors: ${results.errors.length}`);
  results.errors.forEach(r => console.log(`   ${r.file}: ${r.reason}`));
}
