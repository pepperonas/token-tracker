#!/usr/bin/env node
// Keep the browser-only demo catalogue aligned with the server catalogue.
const fs = require('fs');
const path = require('path');
const { ACHIEVEMENTS } = require('../lib/achievements');
const file = path.join(__dirname, '../public/js/demo-data.js');
const source = fs.readFileSync(file, 'utf8');
const start = source.indexOf('  const achDefs = [');
const end = source.indexOf('  const unlockedKeys = new Set([', start);
if (start < 0 || end < 0) throw new Error('Demo achievement boundaries not found');
const entries = ACHIEVEMENTS.filter(a => !a.retired).map(a =>
  `    [${[a.key, a.category, a.tier, a.emoji].map(JSON.stringify).join(', ')}]`
);
const block = `  const achDefs = [\n${entries.join(',\n')}\n  ];\n`;
fs.writeFileSync(file, source.slice(0, start) + block + source.slice(end));
console.log(`Synced ${entries.length} active demo achievements`);
