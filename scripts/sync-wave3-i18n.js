#!/usr/bin/env node
// Materialise wave-3 catalogue text as static browser translations.
const fs = require('fs');
const path = require('path');
const { ACHIEVEMENTS } = require('../lib/achievements');

const file = path.join(__dirname, '..', 'public/js/i18n.js');
const wave = ACHIEVEMENTS.filter(a => a.wave === 3);
const START = '    // WAVE3:START';
const END = '    // WAVE3:END';

function block(lang) {
  const name = lang === 'en' ? 'nameEn' : 'nameDe';
  const desc = lang === 'en' ? 'descEn' : 'descDe';
  const lines = wave.flatMap(a => [
    `    ach_${a.key}: ${JSON.stringify(a[name])},`,
    `    ach_${a.key}_desc: ${JSON.stringify(a[desc])},`
  ]);
  return `${START}\n${lines.join('\n')}\n${END}`;
}

let source = fs.readFileSync(file, 'utf8');
if (source.includes(START)) {
  let i = 0;
  source = source.replace(/    \/\/ WAVE3:START[\s\S]*?    \/\/ WAVE3:END/g, () => block(i++ === 0 ? 'en' : 'de'));
  if (i !== 2) throw new Error(`Expected 2 translation blocks, found ${i}`);
} else {
  source = source.replace('  },\n  de: {', `${block('en')}\n  },\n  de: {`);
  source = source.replace('  }\n};', `${block('de')}\n  }\n};`);
}
fs.writeFileSync(file, source);
console.log(`Wrote ${wave.length} wave-3 translations for EN and DE`);
