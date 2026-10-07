#!/usr/bin/env node
// Read-only catalogue audit. Run from the repository root with:
// node tools/audit-achievements.mjs [--db data/tracker.db] [--out docs/achievements-audit-2026-10.md]
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { performance } from 'node:perf_hooks';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');
const Aggregator = require('../lib/aggregator');
const { ACHIEVEMENTS, buildStats, checkAchievements, backfillAchievements } = require('../lib/achievements');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = name => { const i = process.argv.indexOf(name); return i < 0 ? null : process.argv[i + 1]; };
const dbPath = path.resolve(ROOT, arg('--db') || 'data/tracker.db');
const outPath = path.resolve(ROOT, arg('--out') || 'docs/achievements-audit-2026-10.md');
const format = n => Number(n || 0).toLocaleString('de-DE');
const md = value => String(value).replaceAll('|', '\\|').replaceAll('`', '\\`');
const tierRank = { bronze: 0, silver: 1, gold: 2, platinum: 3, diamond: 4 };
const activeOnly = process.argv.includes('--active-only');
const CATALOG = activeOnly ? ACHIEVEMENTS.filter(a => !a.retired) : ACHIEVEMENTS;
const body = ach => ach.wave === 3
  ? ach.requirements
    ? ach.requirements.map(([metric, threshold]) => `s.${metric} >= ${threshold}`).join(' && ')
    : `s.${ach.metric} >= ${ach.threshold}`
  : ach.check.toString().replace(/^s\s*=>\s*/, '').trim();
function stripWhitespaceOutsideStrings(source) {
  let quote = null, result = '';
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if ((ch === "'" || ch === '"' || ch === '`') && source[i - 1] !== '\\') {
      if (quote === ch) quote = null;
      else if (!quote) quote = ch;
    }
    if (quote || !/\s/.test(ch)) result += ch;
  }
  return result;
}
const canon = source => stripWhitespaceOutsideStrings(source
  .replace(/\[['"]([A-Za-z_$][\w$]*)['"]\]/g, '.$1')
  .replace(/\b(\d[\d_]*)\b/g, value => value.replaceAll('_', ''))
  .replace(/\|\|\s*0/g, ''))
  .replace(/\(s\.(\w+(?:\.\w+)*)\)/g, 's.$1')
  .replace(/\(s\.toolCallsByName\.(\w+)\)/g, 's.toolCallsByName.$1');
const sourceOf = Object.fromEntries(CATALOG.map(a => [a.key, canon(body(a))]));

function localeStrings() {
  const source = fs.readFileSync(path.join(ROOT, 'public/js/i18n.js'), 'utf8');
  const context = vm.createContext({ localStorage: { getItem: () => null }, navigator: { language: 'de' }, document: { querySelectorAll: () => [] } });
  vm.runInContext(source, context, { filename: 'i18n.js' });
  return vm.runInContext('LANG', context);
}

function loadSnapshot(db) {
  const agg = new Aggregator();
  const byProvider = db.prepare(`SELECT COALESCE(provider, 'claude') provider,
    COUNT(*) messages, MIN(timestamp) first, MAX(timestamp) last,
    COUNT(DISTINCT substr(timestamp,1,10)) activeDays,
    SUM(input_tokens + output_tokens + cache_read_tokens + cache_create_tokens) tokens,
    SUM(CASE WHEN cache_read_tokens > 0 THEN 1 ELSE 0 END) withCache,
    SUM(CASE WHEN lines_written + lines_added + lines_removed > 0 THEN 1 ELSE 0 END) withLines
    FROM messages GROUP BY 1`).all();
  const counts = db.prepare('SELECT achievement_key key, COUNT(*) unlocks, COUNT(DISTINCT user_id) users FROM achievements GROUP BY achievement_key').all();
  const dates = db.prepare('SELECT user_id user, achievement_key key, unlocked_at at FROM achievements').all();
  const sql = `SELECT m.*, GROUP_CONCAT(mt.tool_name) tools, GROUP_CONCAT(mt.call_count) tool_counts
    FROM messages m LEFT JOIN message_tools mt ON m.id = mt.message_id GROUP BY m.id ORDER BY m.timestamp`;
  for (const row of db.prepare(sql).iterate()) {
    const names = row.tools ? row.tools.split(',') : [];
    const counts = row.tool_counts ? row.tool_counts.split(',').map(Number) : [];
    const toolCounts = Object.fromEntries(names.map((name, i) => [name, counts[i] || 1]));
    agg.addMessages([{
      id: row.id, timestamp: row.timestamp, model: row.model, sessionId: row.session_id,
      project: row.project, inputTokens: row.input_tokens, outputTokens: row.output_tokens,
      cacheReadTokens: row.cache_read_tokens, cacheCreateTokens: row.cache_create_tokens,
      cacheCreate5m: row.cache_create_5m || 0, cacheCreate1h: row.cache_create_1h || 0,
      stopReason: row.stop_reason, tools: names, toolCounts,
      isSubagent: !!row.is_subagent, linesAdded: row.lines_added || 0,
      linesRemoved: row.lines_removed || 0, linesWritten: row.lines_written || 0,
      provider: row.provider || 'claude'
    }]);
  }
  for (const row of db.prepare('SELECT id, timestamp FROM rate_limit_events').iterate()) agg.addRateLimitEvents([row]);
  return { agg, stats: buildStats(agg), byProvider, counts: new Map(counts.map(x => [x.key, x])), dates };
}

function comparison(ach) {
  const s = canon(body(ach));
  const match = s.match(/^\(?s\.([\w.]+)\)?(>=|>|<=|<|===|==)(\d+(?:\.\d+)?)$/);
  if (match) return { metric: match[1], op: match[2], threshold: Number(match[3]) };
  const model = s.match(/^s\.modelMessagesOf\(['"]([^'"]+)['"]\)(>=|>|<=|<)(\d+)$/);
  return model ? { metric: `modelMessagesOf(${model[1]})`, op: model[2], threshold: Number(model[3]) } : null;
}

function plainCheck(ach) {
  const c = comparison(ach);
  if (!c) return sourceOf[ach.key];
  const labels = {
    totalTokens: 'Tokens gesamt (inklusive Cache)', totalInputTokens: 'Input-Tokens',
    totalOutputTokens: 'Output-Tokens', totalCacheReadTokens: 'Cache-Read-Tokens',
    totalMessages: 'Nachrichten', totalSessions: 'Sitzungen', totalCost: 'USD Kosten',
    totalToolCalls: 'Tool-Aufrufe', totalLinesWritten: 'geschriebene Codezeilen',
    totalLinesAdded: 'hinzugefügte Codezeilen', totalLinesRemoved: 'entfernte Codezeilen',
    activeDays: 'aktive Tage', longestStreak: 'Tage in der längsten Serie',
    uniqueWeeksActive: 'aktive Wochen', monthsActive: 'aktive Monate',
    projectCount: 'Projekte', totalActiveHours: 'aktive Arbeitsstunden'
  };
  const label = c.metric.startsWith('toolCallsByName.')
    ? `${c.metric.slice('toolCallsByName.'.length)}-Aufrufe`
    : c.metric.startsWith('modelMessagesOf(')
      ? `Nachrichten mit ${c.metric.slice(16, -1)}`
      : labels[c.metric] || c.metric;
  const number = c.metric === 'outputRatio' ? `${(c.threshold * 100).toLocaleString('de-DE')} %` : format(c.threshold);
  const relation = c.op === '>' ? 'mehr als' : c.op === '>=' ? 'mindestens' : c.op === '<' ? 'weniger als' : 'höchstens';
  return `${relation} ${number} ${label}`;
}

function vectors(real) {
  const fields = new Map();
  for (const ach of CATALOG) {
    const src = canon(body(ach));
    for (const match of src.matchAll(/s\.([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)?)\s*(?:>=|>|<=|<|===|==)\s*(\d+(?:\.\d+)?)/g)) {
      if (!fields.has(match[1])) fields.set(match[1], new Set());
      fields.get(match[1]).add(Number(match[2]));
    }
  }
  const sample = [real];
  const numeric = Object.keys(real).filter(k => typeof real[k] === 'number');
  const high = { ...real, toolCallsByName: {}, modelMessages: {}, modelMessagesOf: () => 1e12 };
  const low = { ...real, toolCallsByName: {}, modelMessages: {}, modelMessagesOf: () => 0 };
  for (const key of numeric) { high[key] = 1e12; low[key] = 0; }
  for (const key of Object.keys(real.toolCallsByName)) {
    high.toolCallsByName[key] = 1e12;
    low.toolCallsByName[key] = 0;
  }
  for (const key of Object.keys(real.modelMessages)) {
    high.modelMessages[key] = 1e12;
    low.modelMessages[key] = 0;
  }
  sample.push(high, low);
  const overlay = (base, field, value) => {
    const [first, second] = field.split('.');
    return second ? { ...base, [first]: { ...base[first], [second]: value } } : { ...base, [first]: value };
  };
  for (const [field, values] of fields) {
    for (const value of values) {
      const epsilon = Number.isInteger(value) ? 1 : Math.max(value * 0.001, 0.00001);
      for (const base of [real, high]) {
        sample.push(overlay(base, field, Math.max(0, value - epsilon)), overlay(base, field, value + epsilon));
      }
    }
  }
  for (const ach of CATALOG) {
    for (const match of canon(body(ach)).matchAll(/s\.modelMessagesOf\(['"]([^'"]+)['"]\)\s*(?:>=|>|<=|<)\s*(\d+)/g)) {
      const label = match[1], value = Number(match[2]);
      for (const tested of [Math.max(0, value - 1), value + 1]) {
        sample.push({ ...high, modelMessagesOf: name => name === label ? tested : 1e12 });
      }
    }
  }
  let seed = 0xC0D3;
  for (let i = 0; i < 32; i++) {
    const next = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 0x100000000);
    const factor = 0.01 + next() * 12;
    const v = { ...real, toolCallsByName: { ...real.toolCallsByName }, modelMessages: { ...real.modelMessages } };
    for (const key of numeric) v[key] = real[key] * factor * (0.2 + next() * 2);
    for (const key of Object.keys(v.toolCallsByName)) v.toolCallsByName[key] *= factor;
    sample.push(v);
  }
  return { sample, fields };
}

function fingerprints(sample) {
  const signatures = new Map();
  for (const ach of CATALOG) {
    let bits = '', errors = 0;
    for (const stats of sample) {
      try { bits += ach.check(stats) ? '1' : '0'; } catch { bits += '?'; errors++; }
    }
    if (!signatures.has(bits)) signatures.set(bits, []);
    signatures.get(bits).push({ ach, errors });
  }
  return [...signatures.entries()]
    .filter(([sig, entries]) => entries.length > 1 && sig.includes('1') && sig.includes('0'))
    .map(([sig, entries]) => ({ sig, entries }));
}

function report(snapshot, strings) {
  const { stats, counts, dates, byProvider, agg, timings } = snapshot;
  const count = key => {
    const users = counts.get(key)?.users || 0, unlocks = counts.get(key)?.unlocks || 0;
    return `${users} Nutzer / ${unlocks} ${unlocks === 1 ? 'Freischaltung' : 'Freischaltungen'}`;
  };
  const dateFor = (user, key) => dates.find(x => x.user === user && x.key === key)?.at;
  const { sample, fields } = vectors(stats);
  const fingerprintsGroups = fingerprints(sample);
  const exact = new Map();
  for (const ach of CATALOG) {
    const key = sourceOf[ach.key];
    if (!exact.has(key)) exact.set(key, []);
    exact.get(key).push(ach);
  }
  const exactGroups = [...exact.values()].filter(x => x.length > 1);
  const confirmed = exactGroups.reduce((n, g) => n + g.length, 0);
  const inconsistent = exactGroups.filter(g => new Set(g.map(a => a.tier)).size > 1);
  const candidateGroups = fingerprintsGroups.filter(g => new Set(g.entries.map(e => sourceOf[e.ach.key])).size > 1);
  const sections = [];
  const add = (...lines) => sections.push(...lines);
  add(activeOnly ? '# Achievement-Audit — aktiver Endbestand, Oktober 2026' : '# Achievement-Audit — Vorher-Bestand, Oktober 2026',
    '',
    `Erzeugt am ${new Date().toISOString()} durch \`node tools/audit-achievements.mjs\`. Die produktive DB wurde **nur lesend** geöffnet. ${activeOnly ? 'Der Bericht prüft nur aktive Definitionen nach der Bereinigung.' : 'Dies ist ein Vorschlagsbericht; kein Achievement wurde geändert.'}`,
    '',
    `**Basis:** ${format(CATALOG.length)} Definitionen, ${format(agg.messageCount)} Nachrichten, ${format(dates.length)} gespeicherte Freischaltungen bei ${new Set(dates.map(x => x.user)).size} Nutzer(n), ${format(sample.length)} Stat-Vektoren (${format(fields.size)} variierte Felder). Ein gleicher Fingerabdruck ist nur ein Kandidat. Ausdrucksgleichheit nach dokumentierter Normalisierung belegt die unten als sicher markierten Paare; andere Kandidaten brauchen Quellcodeprüfung.`,
    '',
    '## 1. Semantische Duplikate',
    '',
    `**Sichere Untergrenze:** ${exactGroups.length} Gruppen, ${confirmed} Einträge; bei Beibehaltung des ältesten Keys würden ${confirmed - exactGroups.length} Keys stillgelegt. ${inconsistent.length} Gruppen haben widersprüchliche Stufen. Die Normalisierung vereinheitlicht Klammer-/Punktzugriff, optionale Null-Fallbacks, Tausendertrenner und Leerraum. Stichprobengleichheit fand zusätzlich ${candidateGroups.length} nicht textgleiche Kandidatengruppen, die **nicht automatisch** als Duplikate gelten.`,
    '',
    '| Keys (Stufe) | gleiche Bedingung | Betroffene | Vorschlag |',
    '|---|---|---|---|');
  for (const group of exactGroups) {
    const ordered = [...group].sort((a, b) => CATALOG.indexOf(a) - CATALOG.indexOf(b));
    add(`| ${ordered.map(a => `\`${a.key}\` (${a.tier})`).join(', ')} | ${md(plainCheck(ordered[0]))} (\`${md(sourceOf[ordered[0].key])}\`) | ${ordered.map(a => `${a.key}: ${count(a.key)}`).join('; ')} | Ältesten Key behalten; übrige nach Freigabe stilllegen${new Set(group.map(a => a.tier)).size > 1 ? '; Stufe prüfen' : ''} |`);
  }
  add('', '### Weitere Stichproben-Kandidaten', '',
    'Die folgenden Gruppen liefern auf allen Testvektoren dasselbe Ergebnis, haben aber verschiedene Ausdrücke. Sie sind bewusst **nicht** zur Stilllegung freigegeben:');
  if (!candidateGroups.length) add('Keine weiteren Kandidaten nach Grenzfall-Stichproben.');
  for (const group of candidateGroups.slice(0, 80)) {
    add(`- ${group.entries.map(e => `\`${e.ach.key}\` (${e.ach.tier}, ${count(e.ach.key)})`).join(', ')} — Quellcode manuell auf echte Gleichheit prüfen.`);
  }
  if (candidateGroups.length > 80) add(`- Weitere ${candidateGroups.length - 80} Gruppen im Skript reproduzierbar; Fingerprint-Auflösung erhöhen.`);

  // Same simple metric, adjacent thresholds in different ladders.
  const metricGroups = new Map();
  for (const ach of CATALOG) {
    const c = comparison(ach);
    if (!c || !['>=', '>'].includes(c.op)) continue;
    if (!metricGroups.has(c.metric)) metricGroups.set(c.metric, []);
    metricGroups.get(c.metric).push({ ...c, ach });
  }
  const near = [];
  const monotonicity = [];
  let mechanicalRaises = 0;
  for (const [metric, group] of metricGroups) {
    group.sort((a, b) => a.threshold - b.threshold);
    let highestTier = -1;
    for (const entry of group) {
      if (tierRank[entry.ach.tier] < highestTier) mechanicalRaises++;
      highestTier = Math.max(highestTier, tierRank[entry.ach.tier]);
    }
    for (let i = 1; i < group.length; i++) {
      const low = group[i - 1], high = group[i];
      if (low.threshold < high.threshold && high.threshold / Math.max(1, low.threshold) <= 1.12) {
        const gaps = [...new Set(dates.map(x => x.user))].flatMap(user => {
          const a = dateFor(user, low.ach.key), b = dateFor(user, high.ach.key);
          return a && b ? [Math.round((new Date(b) - new Date(a)) / 86400000)] : [];
        });
        near.push({ metric, low, high, gaps });
      }
      if (low.threshold < high.threshold && tierRank[high.ach.tier] < tierRank[low.ach.tier]) monotonicity.push({ metric, low, high });
    }
  }
  add('## 2. Fast-Duplikate', '',
    `Heuristik: benachbarte Schwellen derselben einfachen Kennzahl mit höchstens 12 % Abstand. ${near.length} Paare; Tage zwischen vorhandenen Freischaltungen stehen in der Tabelle. Ein negatives Vorzeichen deutet auf historisch unterschiedlich datierte Checks hin.`, '',
    '| Keys / Stufen | Kennzahl und Schwellen | Betroffene | Abstand | Vorschlag |', '|---|---|---|---|---|');
  for (const x of near) add(`| \`${x.low.ach.key}\` (${x.low.ach.tier}) / \`${x.high.ach.key}\` (${x.high.ach.tier}) | ${x.metric}: ${format(x.low.threshold)} → ${format(x.high.threshold)} | ${count(x.low.ach.key)}; ${count(x.high.ach.key)} | ${x.gaps.length ? x.gaps.join(', ') + ' Tage' : 'nicht beide freigeschaltet'} | Leiter prüfen, ggf. eine Schwelle stilllegen |`);

  const implied = [];
  for (const ach of CATALOG) {
    const source = sourceOf[ach.key];
    if (!source.includes('&&')) continue;
    const clauses = source.replace(/^\(/, '').replace(/\)$/, '').split('&&').map(x => x.replace(/^\(/, '').replace(/\)$/, ''));
    for (const other of CATALOG) {
      if (other.key === ach.key || sourceOf[other.key].includes('&&')) continue;
      if (clauses.includes(sourceOf[other.key].replace(/^\(/, '').replace(/\)$/, ''))) implied.push({ ach, other });
    }
  }
  add('## 3. Implikation ohne erkennbaren Mehrwert', '',
    `${implied.length} Kombination→Einzelbedingung-Kandidaten wurden durch Klauselvergleich gefunden. Eine Implikation allein ist kein Fehler: Die Kombination muss zusätzlich auf ihren eigenen Aussagewert geprüft werden.`, '',
    '| Kombination | impliziert | Betroffene | Vorschlag |', '|---|---|---|---|');
  for (const x of implied.slice(0, 100)) add(`| \`${x.ach.key}\` (${x.ach.tier}), \`${md(sourceOf[x.ach.key])}\` | \`${x.other.key}\` (${x.other.tier}) | ${count(x.ach.key)}; ${count(x.other.key)} | Bedeutung prüfen, ggf. belassen |`);
  if (implied.length > 100) add(`Weitere ${implied.length - 100} Kandidaten nicht in der Übersicht.`);

  add('## 4. Stufen-Monotonie', '',
    `${monotonicity.length} benachbarte Umkehrungen bei direkt vergleichbaren einfachen Schwellen. Kombinationsbedingungen sind getrennt zu prüfen. Würde man jede spätere Stufe mechanisch auf die höchste vorherige anheben, änderten sich ${mechanicalRaises} Einträge; viele würden Diamant. Daher Stufen je Leiter redaktionell festlegen und nicht pauschal hochsetzen.`, '',
    '| Kennzahl | niedrigere Schwelle | höhere Schwelle | Betroffene | Vorschlag |', '|---|---|---|---|---|');
  for (const x of monotonicity) add(`| ${x.metric} | \`${x.low.ach.key}\` ${format(x.low.threshold)} (${x.low.ach.tier}) | \`${x.high.ach.key}\` ${format(x.high.threshold)} (${x.high.ach.tier}) | ${count(x.low.ach.key)}; ${count(x.high.ach.key)} | höhere Stufe korrigieren oder Duplikat stilllegen |`);

  const missing = [], names = [];
  for (const lang of ['en', 'de']) {
    const byName = new Map();
    for (const ach of CATALOG) {
      const name = strings[lang]?.[`ach_${ach.key}`];
      const desc = strings[lang]?.[`ach_${ach.key}_desc`];
      if (!name || !desc) missing.push({ lang, ach, missing: !name ? 'Name' : 'Beschreibung' });
      if (name) {
        const norm = name.trim().toLocaleLowerCase(lang);
        if (!byName.has(norm)) byName.set(norm, []);
        byName.get(norm).push(ach);
      }
    }
    for (const [name, group] of byName) if (group.length > 1) names.push({ lang, name, group });
  }
  add('## 5. Text gegen Bedingung', '',
    `${missing.length} fehlende Name-/Beschreibungseinträge; ${names.length} mehrfach verwendete Namen (je Sprache). Zahl-/Einheitsabgleich ist bei freien Kombinationstexten nicht beweisbar und wird als manuelle Prüfliste geführt.`, '',
    '### Fehlende Übersetzungen');
  for (const x of missing) add(`- ${x.lang}: \`${x.ach.key}\` (${x.ach.tier}), ${x.missing}, ${count(x.ach.key)} — Text ergänzen.`);
  add('### Doppelte Namen');
  for (const x of names) add(`- ${x.lang}: „${md(x.name)}“ — ${x.group.map(a => `\`${a.key}\` (${a.tier}, ${count(a.key)})`).join(', ')} — Namen differenzieren.`);
  const correctedKeys = [
    'output_ratio_60', 'output_ratio_70', 'output_ratio_80', 'model_haiku_majority',
    'streak_1500', 'streak_2000', 'active_days_3650', 'months_active_60'
  ];
  add('', activeOnly ? '### Korrigierte Textfehler' : '### Bestätigte Textfehler nach früheren Schwellenkorrekturen', '',
    activeOnly ? 'Die acht bestätigten Abweichungen des Vorher-Berichts wurden in beiden Sprachen korrigiert; `streak_2000` ist stillgelegt.' : 'Diese acht Checks wurden früher geändert, ihre Namen/Beschreibungen nennen weiterhin die alten Ziele. Der Text behauptet damit eine andere Leistung als der Code:', '',
    '| Key / Stufe | tatsächlicher Check | EN / DE Beschreibung | Betroffene | Vorschlag |', '|---|---|---|---|---|');
  for (const key of correctedKeys.filter(key => CATALOG.some(a => a.key === key))) {
    const ach = CATALOG.find(a => a.key === key);
    const action = activeOnly ? 'Korrigiert' : key === 'streak_2000'
      ? 'Duplikat von `streak_500`: stilllegen; historischen Text nicht weiter anzeigen'
      : 'Text und ggf. Name auf die echte Bedingung ändern';
    add(`| \`${key}\` (${ach.tier}) | \`${md(sourceOf[key])}\` | ${md(strings.en[`ach_${key}_desc`])} / ${md(strings.de[`ach_${key}_desc`])} | ${count(key)} | ${action} |`);
  }
  const numericText = [];
  for (const ach of CATALOG) {
    const c = comparison(ach);
    if (!c || c.threshold < 10 || !Number.isInteger(c.threshold)) continue;
    for (const lang of ['en', 'de']) {
      const desc = strings[lang]?.[`ach_${ach.key}_desc`] || '';
      const digits = [...desc.matchAll(/\d[\d.,_\s]*/g)].map(x => Number(x[0].replace(/\D/g, ''))).filter(Number.isFinite);
      if (digits.length && !digits.includes(c.threshold) && !digits.some(n => c.threshold % n === 0 && [1e3, 1e6, 1e9].includes(c.threshold / n))) {
        numericText.push({ ach, lang, threshold: c.threshold, desc });
      }
    }
  }
  add('### Zahl-/Einheit-Kandidaten', '',
    `${numericText.length} Texte mit Zahl, aber ohne direkt erkennbare Schwelle (K/Mio./Billionen-Schreibweisen erzeugen mögliche Fehlalarme). Einheit und Aussage werden vor Korrektur von Hand geprüft.`);
  for (const x of numericText.slice(0, 100)) add(`- ${x.lang} \`${x.ach.key}\` (${x.ach.tier}; ${x.threshold} auf ${comparison(x.ach).metric}; ${count(x.ach.key)}): „${md(x.desc)}“ — Text prüfen.`);
  if (numericText.length > 100) add(`- Weitere ${numericText.length - 100} Kandidaten im Skript reproduzierbar.`);

  const firstDay = dates.length ? dates.map(x => x.at).filter(Boolean).sort()[0]?.slice(0, 10) : null;
  const firstDayKeys = dates.filter(x => x.at?.slice(0, 10) === firstDay).map(x => x.key);
  const projections = [];
  for (const [metric, group] of metricGroups) {
    // Linear pace is meaningful only for cumulative counters, not ratios,
    // averages, record peaks or streak lengths.
    if (!/^(total[A-Z]|activeDays$|monthsActive$|uniqueWeeksActive$|toolCallsByName\.|modelMessages\.|modelMessagesOf\(|mcpToolCalls$|subagentMessages$)/.test(metric)) continue;
    const value = metric.startsWith('modelMessagesOf(') ? stats.modelMessagesOf(metric.slice(16, -1)) : metric.split('.').reduce((v, k) => v?.[k], stats);
    if (typeof value !== 'number' || value <= 0) continue;
    const days = Math.max(1, stats.activeDays || 1);
    for (const entry of group) {
      if (entry.threshold <= value) continue;
      const remaining = Math.ceil((entry.threshold - value) / (value / days));
      if (remaining > 365 * 5) projections.push({ ...entry, metric, value, remaining });
    }
  }
  projections.sort((a, b) => b.remaining - a.remaining);
  add('## 6. Unerreichbar oder trivial', '',
    `Erster gespeicherter Freischalttag: ${firstDay || 'keiner'}, ${firstDayKeys.length} Freischaltungen. ${projections.length} kumulative Schwellen liegen bei linearer Fortschreibung über fünf **aktiven** Jahren entfernt. Das ist ein Warnsignal; Verhältnisse, Durchschnitte, Spitzen und Streaks werden nicht linear hochgerechnet. Aus einer einzelnen Nutzerhistorie lässt sich „unerreichbar durch Konstruktion“ nur bei einem logischen Widerspruch beweisen; dafür fand die statische Prüfung keinen zusätzlichen gesicherten Fall.`, '',
    '### Am ersten gespeicherten Tag freigeschaltet', '',
    firstDayKeys.length ? firstDayKeys.map(k => `\`${k}\` (${CATALOG.find(a => a.key === k)?.tier}, ${count(k)})`).join(', ') : 'Keine.',
    '', '### Entfernte Schwellen (Auszug)', '',
    '| Key / Stufe | Kennzahl: heute → Schwelle | aktive Tage bis Ziel | Betroffene | Vorschlag |', '|---|---|---:|---|---|');
  for (const x of projections.slice(0, 100)) add(`| \`${x.ach.key}\` (${x.ach.tier}) | ${x.metric}: ${format(x.value)} → ${format(x.threshold)} | ${format(x.remaining)} | ${count(x.ach.key)} | Schwelle/Rate prüfen; ggf. stilllegen |`);
  if (projections.length > 100) add(`${projections.length - 100} weitere entfernte Schwellen.`);

  const durationFields = ['marathonSessions', 'longestSessionMin', 'marathonSessions_4h', 'marathonSessions_8h', 'marathonSessions_12h', 'marathonSessions_16h', 'totalSessionHours', 'avgSessionDurationMin', 'shortSessions'];
  const duration = CATALOG.filter(a => durationFields.some(f => new RegExp(`\\bs\\.${f}\\b`).test(body(a))));
  const activeHours = agg.getSessions().reduce((n, s) => n + (s.activeMin || 0), 0) / 60;
  const spanHours = agg.getSessions().reduce((n, s) => n + (s.durationMin || 0), 0) / 60;
  add('## 7. Falsche Zeit-Kennzahl', '',
    `In dieser DB: Session-Spannen ${format(Math.round(spanHours))} h, gekappte aktive Zeit ${format(Math.round(activeHours))} h, Faktor ${(spanHours / Math.max(activeHours, 1)).toFixed(1)}. Die folgenden ${duration.length} Checks hängen an \`durationMin\`-basierten Feldern. **Entscheidung:** Welle 1 vorerst belassen, neue Zeit-Achievements nur mit \`activeMin\`.`, '',
    '| Key / Stufe | Bedingung | Betroffene | Vorschlag |', '|---|---|---|---|');
  for (const a of duration) add(`| \`${a.key}\` (${a.tier}) | ${md(plainCheck(a))} (\`${md(sourceOf[a.key])}\`) | ${count(a.key)} | Bestehenden Key belassen, im Text Session-Spanne kenntlich machen |`);

  const emojiGroups = [];
  const categoryOutliers = [];
  for (const [metric, group] of metricGroups) {
    if (group.length >= 3) {
      const categoryCounts = new Map();
      for (const x of group) categoryCounts.set(x.ach.category, (categoryCounts.get(x.ach.category) || 0) + 1);
      const [majority, majorityCount] = [...categoryCounts].sort((a, b) => b[1] - a[1])[0];
      if (majorityCount >= 2) {
        for (const x of group) if (x.ach.category !== majority) categoryOutliers.push({ metric, ach: x.ach, majority });
      }
    }
    const byEmoji = new Map();
    for (const x of group) {
      if (!byEmoji.has(x.ach.emoji)) byEmoji.set(x.ach.emoji, []);
      byEmoji.get(x.ach.emoji).push(x.ach);
    }
    for (const [emoji, members] of byEmoji) if (members.length > 1) emojiGroups.push({ metric, emoji, members });
  }
  add('## 8. Kategorie und Emoji', '',
    `${categoryOutliers.length} Einträge weichen von der Mehrheitskategorie derselben einfachen Kennzahl ab; ${emojiGroups.length} Kennzahl/Emoji-Gruppen verwenden dasselbe Emoji auf mehreren Schwellen. Beides sind Prüfkandidaten, keine automatischen Fehler.`, '',
    '### Kategorie-Ausreißer', '',
    '| Key / Stufe | Kennzahl / Kategorie | Betroffene | Vorschlag |', '|---|---|---|---|');
  for (const x of categoryOutliers) add(`| \`${x.ach.key}\` (${x.ach.tier}) | ${x.metric}: ${x.ach.category} statt Mehrheit ${x.majority} | ${count(x.ach.key)} | Kategorie semantisch prüfen |`);
  add('', '### Gleiche Emoji innerhalb einer Leiter', '',
    '| Kennzahl | Emoji / Keys | Betroffene | Vorschlag |', '|---|---|---|---|');
  for (const x of emojiGroups.slice(0, 100)) add(`| ${x.metric} | ${x.emoji} ${x.members.map(a => `\`${a.key}\` (${a.tier})`).join(', ')} | ${x.members.map(a => `${a.key}: ${count(a.key)}`).join('; ')} | Motivfolge prüfen |`);
  if (emojiGroups.length > 100) add(`${emojiGroups.length - 100} weitere Gruppen.`);

  add('## Anbieter-Daten für Welle 3', '',
    '| Anbieter | Nachrichten | Tokens (alle Arten) | aktive UTC-Tage | Zeitraum | Nachrichten mit Cache / Zeilen |',
    '|---|---:|---:|---:|---|---|');
  for (const p of byProvider) add(`| ${p.provider} | ${format(p.messages)} | ${format(p.tokens)} | ${p.activeDays} | ${p.first} – ${p.last} | ${format(p.withCache)} / ${format(p.withLines)} |`);
  add('',
    `\`buildStats\` arbeitet auf dem ungefilterten Aggregator; \`totalTokens\`, \`totalMessages\` und weitere globale Werte zählen daher Codex und Antigravity bereits mit. Anbieter-Kopien bestehender Leistungen sind ausgeschlossen. Codex hat erst ${byProvider.find(x => x.provider === 'codex')?.activeDays || 0} aktive Tage; Anbieter-Beziehungs-Achievements werden gemäß Vorabentscheidung auf eine spätere Welle verschoben.`,
    '',
    activeOnly ? '## Laufzeitmessung nach Änderungen' : '## Laufzeitbasis vor Änderungen', '',
    `Gleicher Aggregator, Wegwerf-DB-Adapter ohne Schreibzugriff: \`checkAchievements\` ${timings.checkMs.toFixed(1)} ms, vollständiger \`backfillAchievements\` ${timings.backfillMs.toFixed(1)} ms für ${timings.days} Tage und ${timings.backfilled} errechnete Freischaltungen. Einzelmessungen enthalten JIT-/Cache-Effekte; der Nachher-Vergleich nutzt denselben Ablauf.`,
    '',
    activeOnly ? '## Status' : '## Freigabegrenze', '',
    activeOnly ? 'Dieser Bericht zeigt den aktiven Endbestand; stillgelegte Keys bleiben als historische Definitionen erhalten.' : 'Dieser Bericht ist der **Vorher-Stand**. Vor dem Ändern bestehender Definitionen werden die konkreten Stilllegungen, Stufen und Texte freigegeben. Unsichere Stichproben-Kandidaten und heuristische Text-/Emoji-Funde bleiben bis zur manuellen Prüfung unangetastet.');
  const markdown = sections.join('\n')
    .replace(/([^\n])\n(#{2,3} )/g, '$1\n\n$2')
    .replace(/\n{3,}/g, '\n\n');
  return { markdown, summary: { exactGroups: exactGroups.length, exactEntries: confirmed, inconsistent: inconsistent.length, fingerprintCandidates: candidateGroups.length, near: near.length, monotonicity: monotonicity.length } };
}

const db = new Database(dbPath, { readonly: true, fileMustExist: true });
try {
  // BEGIN holds one consistent snapshot while the live app continues writing.
  db.exec('BEGIN');
  const snapshot = loadSnapshot(db);
  db.exec('COMMIT');
  if (process.argv.includes('--stats')) {
    const names = ['weeksAtLeast4Days', 'weeksAtLeast5Days', 'monthsAtLeast15Days',
      'monthsAtLeast20Days', 'longestFourDayWeekRun', 'codeToolDayCount',
      'codeToolDayShare', 'codeToolWeeks', 'maxProjectAgeDays',
      'projectsAtLeast90Days', 'projectsAtLeast180Days', 'projectsAtLeast365Days',
      'deepMultiModelSessions', 'activeDays'];
    console.log(JSON.stringify(Object.fromEntries(names.map(name => [name, snapshot.stats[name]]))));
  }
  const nullDb = {
    getUnlockedAchievements: () => [],
    unlockAchievementsBatch: () => {},
    replaceAchievementsForUser: () => {}
  };
  let started = performance.now();
  checkAchievements(snapshot.agg, 0, nullDb);
  const checkMs = performance.now() - started;
  started = performance.now();
  const result = backfillAchievements(snapshot.agg, 0, nullDb);
  snapshot.timings = { checkMs, backfillMs: performance.now() - started, days: result.days, backfilled: result.unlocked };
  const audit = report(snapshot, localeStrings());
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, audit.markdown + '\n');
  console.log(JSON.stringify({ out: outPath, ...audit.summary, ...snapshot.timings }));
} finally {
  if (db.inTransaction) db.exec('ROLLBACK');
  db.close();
}
