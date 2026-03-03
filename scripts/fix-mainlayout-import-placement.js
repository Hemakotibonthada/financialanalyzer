#!/usr/bin/env node
/**
 * Fix misplaced MainLayout imports that were inserted inside multiline import blocks.
 * Moves them to after the closing of the multiline import.
 */

const fs = require('fs');
const path = require('path');

const PAGES_DIR = path.join(__dirname, '..', 'frontend', 'src', 'pages');

const files = fs.readdirSync(PAGES_DIR).filter(f => f.endsWith('.jsx'));
let fixed = 0;

for (const file of files) {
  const filePath = path.join(PAGES_DIR, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  // Find the MainLayout import line
  const mlIdx = lines.findIndex(l => l.trim().startsWith("import MainLayout from"));
  if (mlIdx === -1) continue;
  
  // Check if the previous line starts with "import {" (meaning we're inside a multiline import)
  if (mlIdx > 0 && lines[mlIdx - 1].trim().startsWith('import {')) {
    // We need to find the closing "} from '...';" line below
    let closeIdx = -1;
    for (let i = mlIdx + 1; i < lines.length; i++) {
      if (lines[i].trim().match(/^}\s*from\s+['"]/)) {
        closeIdx = i;
        break;
      }
    }
    
    if (closeIdx === -1) {
      console.log(`  SKIP ${file}: could not find closing } from`);
      continue;
    }
    
    // Extract the MainLayout import line
    const mlLine = lines[mlIdx];
    
    // Remove it from current position
    lines.splice(mlIdx, 1);
    
    // closeIdx shifted by -1 since we removed a line above it
    const newCloseIdx = closeIdx - 1;
    
    // Insert after the closing line
    lines.splice(newCloseIdx + 1, 0, mlLine);
    
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    fixed++;
    console.log(`  Fixed: ${file} (moved from line ${mlIdx + 1} to after line ${newCloseIdx + 2})`);
  }
}

console.log(`\nFixed ${fixed} files.`);
