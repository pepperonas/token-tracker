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
const MIN_FALLBACK_SPEND = 1;  // USD — 2 % over a few cents would make k explode

const round1 = (v) => Math.round(v * 10) / 10;

function median(xs) {
  const s = [...xs].sort((a, b) => a - b);
  const n = s.length;
  if (!n) return null;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
}

const MAX_WINDOW_MIN = 43200; // 30 days — the longest window any provider reports

function windowMinutesOf(provider, l) {
  if (provider === 'codex') {
    const m = l.windowMinutes;
    return typeof m === 'number' && m > 0 && m <= MAX_WINDOW_MIN ? m : null;
  }
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
  if (pct >= 2 && spent >= MIN_FALLBACK_SPEND) return { k: pct / spent, confidence: 'rough', pairs: 0 };
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

/**
 * Past Codex windows, newest first: points grouped by their reset time. Codex
 * windows are NOT periodic (a weekly window starts with the first use after a
 * reset), so a past window is found by its own reset, not by end − n·length.
 */
function pastGroups(series, w) {
  const groups = [];
  for (const s of series || []) {
    if (s.resetsAt >= w.end - RESET_TOLERANCE) continue; // the running (or a later) window
    let g = groups.find(x => sameWindow(x.resetsAt, s.resetsAt));
    if (!g) { g = { resetsAt: s.resetsAt, start: s.resetsAt - w.lenMs, pts: [] }; groups.push(g); }
    g.pts.push(s);
  }
  for (const g of groups) g.pts.sort((a, b) => a.at - b.at);
  return groups.sort((a, b) => b.resetsAt - a.resetsAt);
}

/** One increment function per past Codex window with a value at the matching point. */
function codexWeeks({ window: w, now, series }) {
  const weeks = [];
  for (const g of pastGroups(series, w)) {
    if (weeks.length >= MAX_PRIOR_WEEKS) break;
    const base = g.start + (now - w.start);
    if (g.pts[0].at > base) continue;
    const v0 = valueAt(g.pts, base);
    weeks.push((tau) => Math.max(0, valueAt(g.pts, g.start + (tau - w.start)) - v0));
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
  // Reaching 100 only AT the reset is not running out before it.
  const first = (i) => { const r = rows.find(x => x[0] < w.end && x[i] >= 100); return r ? r[0] : null; };
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

const MAX_GHOSTS = 3;
const TOO_EARLY = 0.1;
const iso = (ms) => new Date(ms).toISOString();

function _stepFor(lenMs) {
  return Math.max(MIN, Math.min(15 * MIN, Math.round(lenMs / 600)));
}

function _validSeries(series) {
  return (series || []).filter(s => s && Number.isFinite(s.at) && Number.isFinite(s.percent) && Number.isFinite(s.resetsAt));
}

/** The forecast object of the API contract (version 1), or null when not applicable. */
function forecastLimit(provider, l, ctx) {
  if ((provider !== 'claude' && provider !== 'codex') || !l) return null;
  const now = ctx.now;
  const out = {
    version: FORECAST_VERSION, basis: 'none', confidence: 'none', status: 'unknown',
    window: null, now: iso(now), pace: null, atReset: null, exhaustsAt: null,
    k: null, notes: [], series: null
  };
  const w = windowOf(provider, l);
  const pct = l.percentUsed;
  if (l.reset || !w || w.end <= now || typeof pct !== 'number') return out;
  // A window cannot end further away than its own length. Hosted limits come
  // from untrusted sync reports, and every forecast loop runs to the reset:
  // a resetsAt in the year 9999 built hundreds of millions of rows.
  if (w.end - now > w.lenMs + RESET_TOLERANCE) return out;

  out.window = { start: iso(w.start), end: iso(w.end) };
  out.pace = pace(pct, w, now);
  const weekly = w.lenMs >= DAY;
  let increments = [];
  let cal = null;
  let actual = null;
  let measured = [];
  const ghosts = [];

  if (provider === 'claude') {
    const { index, mapped } = ctx.costIndexFor(l.kind === 'weekly_scoped' ? (l.scopeLabel || null) : null);
    if (!mapped) out.notes.push('scope_unmapped');
    const snaps = _validSeries(ctx.snapshotsFor('claude', l.id));
    cal = calibrate({ snapshots: snaps, costIndex: index, pct, window: w, now });
    if (cal.k !== null) {
      out.k = Math.round(cal.k * 1e6) / 1e6;
      out.notes.push('chat_invisible');
      if (weekly) {
        increments = claudeWeeks({ window: w, now, k: cal.k, costIndex: index });
        actual = reconstruct({ pct, window: w, now, k: cal.k, costIndex: index, stepMs: HOUR });
        for (let n = 1; n <= MAX_GHOSTS; n++) {
          const ws = w.start - n * w.lenMs;
          if (index.coverageFrom > ws) break;
          const points = [];
          for (let off = 0; off <= w.lenMs; off += HOUR) points.push([off / MIN, round1(cal.k * index.between(ws, ws + off))]);
          ghosts.push({ start: iso(ws), points });
        }
      }
    }
    measured = snaps.filter(s => sameWindow(s.resetsAt, w.end) && s.at >= w.start && s.at <= now)
      .sort((a, b) => a.at - b.at).map(s => [iso(s.at), s.percent]);
  } else {
    const series = _validSeries(ctx.seriesFor(l.limitId, l.windowMinutes)).sort((a, b) => a.at - b.at);
    if (weekly) {
      increments = codexWeeks({ window: w, now, series });
      const cur = series.filter(s => sameWindow(s.resetsAt, w.end) && s.at <= now);
      measured = cur.map(s => [iso(s.at), s.percent]);
      actual = cur.length ? [...cur.map(s => [s.at, s.percent]), [now, pct]] : null;
      for (const g of pastGroups(series, w).slice(0, MAX_GHOSTS)) {
        ghosts.push({ start: iso(g.start), points: g.pts.map(s => [(s.at - g.start) / MIN, s.percent]) });
      }
    }
  }

  if (increments.length) {
    out.basis = provider === 'claude' ? 'calibrated' : 'snapshots';
    out.confidence = increments.length >= 2 && (!cal || cal.confidence === 'good') ? 'good' : 'rough';
    if (increments.length < 2) out.notes.push('few_weeks');
  } else if (pct > 0 && now - w.start >= TOO_EARLY * w.lenMs) {
    increments = linearIncrements(pct, w, now);
    out.basis = 'linear';
    out.confidence = 'rough';
  } else if (pct > 0) {
    out.notes.push('too_early');
  }

  let rows = [];
  if (increments.length) {
    const b = forecastBands({ pct, window: w, now, increments, stepMs: _stepFor(w.lenMs) });
    rows = b.rows;
    out.atReset = b.atReset;
    out.exhaustsAt = b.exhaustsAt && {
      median: iso(b.exhaustsAt.median),
      early: b.exhaustsAt.early === null ? null : iso(b.exhaustsAt.early),
      late: b.exhaustsAt.late === null ? null : iso(b.exhaustsAt.late)
    };
  }
  // Already used up: exhausted now, whether or not a projection exists.
  if (pct >= 100 && !out.exhaustsAt) out.exhaustsAt = { median: iso(now), early: iso(now), late: iso(now) };
  out.status = statusOf({
    pct, deltaPoints: out.pace.deltaPoints,
    exhaustsAtMs: out.exhaustsAt ? Date.parse(out.exhaustsAt.median) : null, end: w.end
  });

  if (weekly) {
    const every = Math.max(1, Math.round(HOUR / _stepFor(w.lenMs)));
    const forecast = rows.filter((r, i) => i % every === every - 1 || i === rows.length - 1)
      .map(r => [iso(r[0]), round1(r[1]), round1(r[2]), round1(r[3])]);
    out.series = {
      actual: (actual || []).map(([t, v]) => [iso(t), v]),
      measured,
      forecast,
      ghosts
    };
  }
  return out;
}

/** New views with `forecast` on every limit that can have one. */
function attachForecasts(views, ctx) {
  const out = { ...(views || {}) };
  for (const p of ['claude', 'codex']) {
    const v = views && views[p];
    if (!v || !v.enabled || !v.data || !Array.isArray(v.data.limits)) continue;
    out[p] = {
      ...v,
      data: {
        ...v.data,
        limits: v.data.limits.map(l => {
          try {
            const f = forecastLimit(p, l, ctx);
            return f ? { ...l, forecast: f } : l;
          } catch {
            return l;
          }
        })
      }
    };
  }
  return out;
}

/** Numeric snapshots of a view: one per limit with a percentage and a reset time. */
function snapshotsFromView(view) {
  if (!view || !view.enabled || !view.data || !Array.isArray(view.data.limits)) return [];
  const at = Date.parse(view.fetchedAt);
  if (!Number.isFinite(at)) return [];
  const out = [];
  for (const l of view.data.limits) {
    if (!l || !l.id || l.reset || typeof l.percentUsed !== 'number') continue;
    const resetsAt = Date.parse(l.resetsAt);
    if (!Number.isFinite(resetsAt)) continue;
    out.push({ limitId: l.id, at, percent: l.percentUsed, resetsAt });
  }
  return out;
}

module.exports = {
  FORECAST_VERSION, MIN, HOUR, DAY,
  windowOf, pace, makeCostIndex, calibrate, reconstruct,
  claudeWeeks, codexWeeks, linearIncrements, forecastBands, statusOf,
  forecastLimit, attachForecasts, snapshotsFromView,
  _internal: { median, sameWindow, valueAt, round1 }
};
