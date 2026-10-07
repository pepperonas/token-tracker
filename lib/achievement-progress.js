/**
 * Progress towards a locked achievement: "12,430 of 15,000 Read calls".
 *
 * Achievements are plain predicates (`check: s => ...`), so the target is not
 * stored anywhere for waves 1 and 2. This module reads it back out of the
 * predicate's source — but only for one narrow, fully understood grammar:
 *
 *   TERM >= NUMBER  [&& TERM >= NUMBER ...]
 *
 * where TERM is `s.a.b`, `(s.a.b || 0)`, `(s.a['X'] || 0)` or
 * `s.modelMessagesOf('X')`. Anything else (booleans, ratios, `>`, `.some()`)
 * gets no progress at all — a guessed target would be worse than none.
 * Wave 3 declares `metric`/`threshold`/`requirements` and needs no parsing.
 *
 * test/achievement-progress.test.js pins, for every achievement that gets a
 * target, that the derived condition agrees with the real check on many stat
 * vectors. The bar can therefore never promise something the check denies.
 *
 * Paths are resolved by walking the stats object — no eval, no Function().
 */

const NUM = '([0-9][0-9_]*(?:\\.[0-9]+)?(?:e[0-9]+)?)';
const IDENT = '[A-Za-z_$][A-Za-z0-9_$]*';
const SEGMENT = `(?:\\.${IDENT}|\\[\\s*'[^']*'\\s*\\]|\\[\\s*"[^"]*"\\s*\\])`;
// The left-hand side: s.path, (s.path || 0), or s.modelMessagesOf('Label').
const RE_PLAIN = new RegExp(`^s(${SEGMENT}+)$`);
const RE_DEFAULTED = new RegExp(`^\\(\\s*s(${SEGMENT}+)\\s*\\|\\|\\s*0\\s*\\)$`);
const RE_CALL = /^s\.modelMessagesOf\(\s*'([^']*)'\s*\)$/;
const RE_TERM = new RegExp(`^(.+?)\\s*>=\\s*${NUM}$`);

function splitPath(segments) {
  const out = [];
  const re = new RegExp(SEGMENT, 'g');
  let m;
  while ((m = re.exec(segments))) {
    const seg = m[0];
    if (seg.startsWith('.')) out.push(seg.slice(1));
    else out.push(seg.replace(/^\[\s*['"]|['"]\s*\]$/g, ''));
  }
  return out;
}

function parseLhs(lhs) {
  const text = lhs.trim();
  let m = RE_CALL.exec(text);
  if (m) return { path: [], call: { fn: 'modelMessagesOf', arg: m[1] } };
  m = RE_DEFAULTED.exec(text) || RE_PLAIN.exec(text);
  if (m) return { path: splitPath(m[1]) };
  return null;
}

/** Parse a check's source into [{ path, call?, target }], or null. */
function parseCheckSource(src) {
  const arrow = /^\s*s\s*=>\s*([\s\S]+)$/.exec(String(src));
  if (!arrow) return null;
  const body = arrow[1].trim();
  // `||` only ever appears inside the `(x || 0)` default; a bare one would mean
  // an OR-condition, which this grammar cannot express.
  if (/\|\|/.test(body.replace(/\(\s*s[^()]*\|\|\s*0\s*\)/g, ''))) return null;
  const parts = [];
  for (const raw of body.split('&&')) {
    const m = RE_TERM.exec(raw.trim());
    if (!m) return null;
    const lhs = parseLhs(m[1]);
    const target = Number(m[2].replace(/_/g, ''));
    if (!lhs || !Number.isFinite(target) || target <= 0) return null;
    parts.push({ ...lhs, target });
  }
  return parts.length ? parts : null;
}

/** The conditions of one achievement, or null when no target can be named. */
function requirementsOf(ach) {
  if (Array.isArray(ach.requirements) && ach.requirements.length) {
    return ach.requirements.map(([metric, target]) => ({ path: [metric], target }));
  }
  if (ach.metric && Number.isFinite(ach.threshold) && ach.threshold > 0) {
    return [{ path: [ach.metric], target: ach.threshold }];
  }
  if (typeof ach.check !== 'function') return null;
  return parseCheckSource(ach.check.toString());
}

function resolveValue(stats, part) {
  let cur = stats;
  for (const seg of part.path) {
    if (cur === null || cur === undefined) return 0;
    cur = cur[seg];
  }
  if (part.call) {
    const fn = stats && stats[part.call.fn];
    cur = typeof fn === 'function' ? fn.call(stats, part.call.arg) : 0;
  }
  return typeof cur === 'number' && Number.isFinite(cur) ? cur : 0;
}

// How the dashboard should print a value. Everything not listed is a count.
// `share` is a 0..1 fraction shown as percent, `pct` is already 0..100.
const UNIT_OF = {
  usd: ['totalCost', 'avgCostPerDay', 'avgCostPerMessage', 'avgCostPerSession', 'maxCostInSession',
    'maxDayCost', 'maxProjectCost', 'cacheSavingsUsd', 'subagentCost'],
  pct: ['avgCacheRate'],
  share: ['codeToolDayShare', 'deletionRatio', 'outputRatio'],
  min: ['avgActiveMinPerSession', 'avgSessionDurationMin', 'longestSessionMin', 'maxDayActiveMin',
    'maxSessionActiveMin'],
  h: ['totalActiveHours', 'totalSessionHours', 'maxHoursInDay'],
  dec: ['avgLinesPerSession', 'avgMessagesPerDay', 'avgMessagesPerSession', 'avgToolCallsPerSession',
    'avgTokensPerDay', 'avgTokensPerMessage', 'linesPerDollar', 'linesPerMessage', 'messagesPerSession',
    'sessionsPerActiveDay', 'toolReadWriteRatio', 'tokensPerDollar']
};
const UNIT_BY_METRIC = {};
for (const [unit, metrics] of Object.entries(UNIT_OF)) for (const m of metrics) UNIT_BY_METRIC[m] = unit;

function unitOf(metric) {
  return UNIT_BY_METRIC[metric] || 'int';
}

function metricId(part) {
  if (part.call) return `${part.call.fn}(${part.call.arg})`;
  return part.path.join('.');
}

/**
 * Progress of one achievement against the given stats.
 *
 * @param {object} ach         achievement definition
 * @param {object} stats       buildStats() output
 * @param {object} [opts]
 * @param {number} [opts.minActiveDays]  sample gate (ratio achievements)
 * @returns {null | { value, target, pct, metric, unit, parts, daysNeeded? }}
 *   For several conditions, value/target/metric describe the WEAKEST one —
 *   that is the distance that actually remains. pct is floored, so a bar
 *   never reads 100 while a condition is still short.
 */
function progressFor(ach, stats, opts = {}) {
  const reqs = requirementsOf(ach);
  if (!reqs) return null;
  let weakest = null;
  for (const part of reqs) {
    const value = resolveValue(stats, part);
    const frac = Math.max(0, Math.min(1, value / part.target));
    if (!weakest || frac < weakest.frac) weakest = { part, value, frac };
  }
  const result = {
    value: weakest.value,
    target: weakest.part.target,
    pct: Math.floor(weakest.frac * 100),
    metric: metricId(weakest.part),
    unit: unitOf(metricId(weakest.part)),
    parts: reqs.length
  };
  const minDays = opts.minActiveDays || 0;
  const activeDays = (stats && stats.activeDays) || 0;
  if (minDays > activeDays) {
    result.daysNeeded = minDays - activeDays;
    // The value may already be there, but the badge cannot fire yet.
    if (result.pct >= 100) result.pct = 99;
  }
  return result;
}

module.exports = { parseCheckSource, requirementsOf, resolveValue, progressFor, metricId, unitOf };
