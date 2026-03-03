#!/usr/bin/env node
/**
 * Fix MainLayout titles that were incorrectly set to "function".
 * Derives proper title from filename.
 */

const fs = require('fs');
const path = require('path');

const PAGES_DIR = path.join(__dirname, '..', 'frontend', 'src', 'pages');

function fileNameToTitle(fileName) {
  // Remove .jsx extension
  const name = fileName.replace('.jsx', '');
  // Add spaces before capitals: "BankAccountManager" → "Bank Account Manager"
  return name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/V2$/, ' V2')
    .replace(/EPF/, 'EPF ')
    .replace(/SIP/, 'SIP ')
    .replace(/NPS/, 'NPS ')
    .replace(/PPF/, 'PPF ')
    .trim();
}

const files = fs.readdirSync(PAGES_DIR).filter(f => f.endsWith('.jsx'));
let fixed = 0;

for (const file of files) {
  const filePath = path.join(PAGES_DIR, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('<MainLayout title="function">')) {
    const title = fileNameToTitle(file);
    content = content.replace(
      '<MainLayout title="function">',
      `<MainLayout title="${title}">`
    );
    fs.writeFileSync(filePath, content, 'utf8');
    fixed++;
    console.log(`  Fixed: ${file} → "${title}"`);
  }
}

console.log(`\nFixed ${fixed} files.`);
