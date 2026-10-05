// Pace, calibration and forecast for the usage limits.
//
// Pure: no I/O and no clock. `now` and every data source are arguments, so
// the tests can drive time. Wired to the database, the aggregator and the
// Codex log series by lib/usage-forecast-service.js.
//
// Claude reports whole percentages only and only the current one. The
// calibration factor k (percentage points per USD of this user's own Claude
// cost) turns the full cost history into a fine-grained percent history; the
// forecast replays what the user spent in the same span of the previous
// weeks. Codex has its own percent series in its logs and needs no k.

const MIN = 60e3;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const FORECAST_VERSION = 1;
const RESET_TOLERANCE = 5 * MIN;   // Claude's resets_at jitters by fractions of a second
const MIN_STEP_POINTS = 3;          // integer readings: ±1 would dominate smaller steps
const MAX_PRIOR_WEEKS = 4;
const LINEAR_LOW = 0.6;
const LINEAR_HIGH = 1.4;
const AHEAD_POINTS = 5;

const round1 = (v) => Math.round(v * 10) / 10;

function median(xs) {
  const s = [...xs].sort((a, b) => a - b);
  const n = s.length;
  if (!n) return null;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
}

function windowMinutesOf(provider, l) {
  if (provider === 'codex') return typeof l.windowMinutes === 'number' && l.windowMinutes > 0 ? l.windowMinutes : null;
  if (l.kind === 'session') return 300;
  if (typeof l.kind === 'string' && l.kind.startsWith('weekly')) return 10080;
  return null;
}

/** The limit's window as { start, end, lenMs } in ms, or null. */
function windowOf(provider, l) {
  if (!l) return null;
  const end = Date.parse(l.resetsAt);
  const minutes = windowMinutesOf(provider, l);
  if (!Number.isFinite(end) || !minutes) return null;
  const lenMs = minutes * MIN;
  return { start: end - lenMs, end, lenMs };
}

/** Plan position (even use over the window) and the distance to it. */
function pace(pct, w, now) {
  const planPercent = Math.max(0, Math.min(100, (100 * (now - w.start)) / w.lenMs));
  return { planPercent: round1(planPercent), deltaPoints: round1(pct - planPercent) };
}

/**
 * Prefix sums over [[ms, usd], …] in any order. between(a, b) is the cost in
 * (a, b]. coverageFrom = from when the data is complete (default: first point).
 */
function makeCostIndex(points, coverageFrom) {
  const pts = (points || []).filter(p => Number.isFinite(p[0]) && Number.isFinite(p[1])).sort((a, b) => a[0] - b[0]);
  const t = pts.map(p => p[0]);
  const cum = [0];
  for (const p of pts) cum.push(cum[cum.length - 1] + p[1]);
  const upTo = (x) => { // number of points with time <= x
    let lo = 0, hi = t.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (t[m] <= x) lo = m + 1; else hi = m; }
    return lo;
  };
  return {
    coverageFrom: Number.isFinite(coverageFrom) ? coverageFrom : (t.length ? t[0] : Infinity),
    between(a, b) { return b > a ? cum[upTo(b)] - cum[upTo(a)] : 0; }
  };
}

const sameWindow = (resetsAt, end) => Math.abs(resetsAt - end) <= RESET_TOLERANCE;

/** Percentage points per USD from snapshot steps of the last windows. */
function calibrate({ snapshots, costIndex, pct, window: w, now }) {
  const oldest = w.end - MAX_PRIOR_WEEKS * w.lenMs - RESET_TOLERANCE;
  const groups = [];
  for (const s of snapshots || []) {
    if (!Number.isFinite(s.at) || !Number.isFinite(s.percent) || !Number.isFinite(s.resetsAt)) continue;
    if (s.resetsAt < oldest || s.resetsAt > w.end + RESET_TOLERANCE) continue;
    let g = groups.find(x => sameWindow(x.resetsAt, s.resetsAt));
    if (!g) { g = { resetsAt: s.resetsAt, items: [] }; groups.push(g); }
    g.items.push(s);
  }
  const ratios = [];
  for (const g of groups) {
    const items = g.items.sort((a, b) => a.at - b.at);
    let i = 0;
    for (let j = 1; j < items.length; j++) {
      const dp = items[j].percent - items[i].percent;
      if (dp >= MIN_STEP_POINTS) {
        const c = costIndex.between(items[i].at, items[j].at);
        if (c > 0) ratios.push(dp / c);
        i = j;
      } else if (dp < 0) {
        i = j; // a drop inside one window restarts the walk
      }
    }
  }
  if (ratios.length >= 3) return { k: median(ratios), confidence: 'good', pairs: ratios.length };
  if (ratios.length) return { k: median(ratios), confidence: 'rough', pairs: ratios.length };
  const spent = costIndex.between(w.start, now);
  if (pct >= 2 && spent > 0) return { k: pct / spent, confidence: 'rough', pairs: 0 };
  return { k: null, confidence: 'none', pairs: 0 };
}

/** Percent curve of the running window, pinned to the measured value at `now`. */
function reconstruct({ pct, window: w, now, k, costIndex, stepMs }) {
  const out = [];
  const add = (t) => out.push([t, round1(Math.max(0, pct - k * costIndex.between(t, now)))]);
  for (let t = w.start; t < now; t += stepMs) add(t);
  add(now);
  return out;
}

/** One increment function per fully covered past week (Claude, via k × cost). */
function claudeWeeks({ window: w, now, k, costIndex }) {
  const weeks = [];
  for (let n = 1; n <= MAX_PRIOR_WEEKS; n++) {
    const ws = w.start - n * w.lenMs;
    if (costIndex.coverageFrom > ws) break;
    const base = ws + (now - w.start);
    weeks.push((tau) => k * costIndex.between(base, ws + (tau - w.start)));
  }
  return weeks;
}

function valueAt(points, t) {
  let v = null;
  for (const p of points) { if (p.at <= t) v = p.percent; else break; }
  return v;
}

/** One increment function per past Codex window with a value at the matching point. */
function codexWeeks({ window: w, now, series }) {
  const weeks = [];
  for (let n = 1; n <= MAX_PRIOR_WEEKS; n++) {
    const ws = w.start - n * w.lenMs;
    const we = ws + w.lenMs;
    const pts = (series || []).filter(s => sameWindow(s.resetsAt, we)).sort((a, b) => a.at - b.at);
    const base = ws + (now - w.start);
    if (!pts.length || pts[0].at > base) continue;
    const v0 = valueAt(pts, base);
    weeks.push((tau) => Math.max(0, valueAt(pts, ws + (tau - w.start)) - v0));
  }
  return weeks;
}

/** Fallback without past weeks: the running rate, with a ±40 % spread. */
function linearIncrements(pct, w, now) {
  const rate = pct / Math.max(1, now - w.start);
  return [LINEAR_LOW, 1, LINEAR_HIGH].map(f => (tau) => rate * (tau - now) * f);
}

function forecastBands({ pct, window: w, now, increments, stepMs }) {
  const steps = [];
  for (let t = now + stepMs; t < w.end; t += stepMs) steps.push(t);
  steps.push(w.end);
  const rows = steps.map(t => {
    const v = increments.map(f => pct + Math.max(0, f(t)));
    return [t, median(v), Math.min(...v), Math.max(...v)];
  });
  const first = (i) => { const r = rows.find(x => x[i] >= 100); return r ? r[0] : null; };
  const last = rows[rows.length - 1];
  let exhaustsAt = null;
  if (pct >= 100) exhaustsAt = { median: now, early: now, late: now };
  else if (first(1) !== null) exhaustsAt = { median: first(1), early: first(3), late: first(2) };
  return {
    rows,
    atReset: { median: round1(last[1]), low: round1(last[2]), high: round1(last[3]) },
    exhaustsAt
  };
}

function statusOf({ pct, deltaPoints, exhaustsAtMs, end }) {
  if (Number.isFinite(exhaustsAtMs) && exhaustsAtMs < end) return 'exhausts';
  if (pct === 0) return 'idle';
  if (deltaPoints > AHEAD_POINTS) return 'ahead';
  return 'reserve';
}

module.exports = {
  FORECAST_VERSION, MIN, HOUR, DAY,
  windowOf, pace, makeCostIndex, calibrate, reconstruct,
  claudeWeeks, codexWeeks, linearIncrements, forecastBands, statusOf,
  _internal: { median, sameWindow, valueAt, round1 }
};
