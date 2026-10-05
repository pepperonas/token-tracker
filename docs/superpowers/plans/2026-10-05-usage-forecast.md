# Nutzungslimits: Hochrechnung, Tempo und Fenster-Grafik — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Jedes Claude- und Codex-Limit in der Box „Nutzungslimits" zeigt, ob man im Plan liegt und wann es voraussichtlich aufgebraucht ist — im Balken (Plan-Strich, schraffierte Prognose) und bei Wochenlimits in einer aufklappbaren Fenster-Grafik.

**Architecture:** Reines Modul `lib/usage-forecast.js` rechnet Tempo, Kalibrierung (% je USD aus Snapshot-Paaren gegen die eigene Kostenhistorie), Rekonstruktion und eine Prognose aus den Vorwochen. `lib/usage-forecast-service.js` verdrahtet es mit Aggregator, neuer Tabelle `usage_snapshots` und der Codex-Logreihe und hängt `forecast` an jedes Limit in `/api/usage-limits` (60 s gecacht). Das Frontend erweitert den Balken und zeichnet die Grafik mit Chart.js über `renderChart` plus einem Inline-Plugin.

**Tech Stack:** Node.js (CommonJS, better-sqlite3), Vanilla JS + Chart.js 4.4.7 (CDN, kein Datumsadapter), vitest.

**Spec:** `docs/superpowers/specs/2026-10-05-usage-forecast-design.md`

## Global Constraints

- `forecast.version` = 1; Änderungen am Vertrag nur additiv (Inspector Rust konsumiert ihn).
- Keine neue npm-Abhängigkeit, kein Chart.js-Plugin/-Adapter von außen.
- Anzeigezeiten in `Europe/Berlin` (`USAGE_TZ` in `public/js/app.js`).
- `usage_snapshots` speichert nur Zahlen und Zeiten — nie einen Token, nie einen Rohtext.
- Tests berühren nie die echte Umgebung: `DB_PATH`, `CLAUDE_DIR`, `CODEX_DIR`, `ANTIGRAVITY_DIR` zeigen in Temp-Ordner.
- Deutsche Texte mit echten Umlauten; UI-Texte über `t()` in beiden Sprachen (`LANG.de` und `LANG.en`).
- Jeder neue Pin wird einmal mutiert (Mutation muss nachweislich greifen, Prüfsumme/`cmp`; `timeout` gibt es auf diesem Mac nicht).
- Commit-Messages enden mit:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01UMN7PjkH4WgCVYAbGC7A6q
  ```
- `npm run badges` erst nach `git add`; scheitert die Kette an den Badge-Tests, direkt `npx vitest run --reporter=json --outputFile=.r.json; node scripts/update-badges.js --report .r.json; rm .r.json`.

## Review Focus

1. **Claude-`resets_at` schwankt in Sekundenbruchteilen** (`…04:00:00.046105` vs. `…04:00:00.046123`) — Snapshots desselben Fensters müssen zusammen gruppiert werden. → Task 1 Test `groups snapshots whose resets_at differ by milliseconds`.
2. **Ein Reset mitten in der Snapshot-Folge** (Prozent fällt auf 0, neue Reset-Zeit) darf kein negatives oder riesiges `k` erzeugen. → Task 1 Test `a reset between snapshots never yields a negative k`.
3. **Ruhige Vorwochen** (keine Kosten) ergeben Zuwachs 0 → Status `reserve`, `atReset.median` = aktueller Wert, kein `exhausts`. → Task 2 Test `quiet past weeks forecast no growth`.
4. **Bereits ≥ 100 %** → `exhaustsAt` = jetzt, Status `exhausts`. → Task 1 Test `already at 100 % is exhausted now`.
5. **60-s-Neuaufbau bei offener Grafik** — das Canvas muss dasselbe Element bleiben (kein Flackern), Grafiken zugeklappter Limits werden zerstört. → Task 7 Test `keeps the open chart's canvas across a rebuild and destroys closed ones`.

---

## File Structure

| Datei | Verantwortung |
|---|---|
| `lib/usage-forecast.js` (neu) | Reine Rechnung: Fenster, Tempo, Kostenindex, Kalibrierung, Rekonstruktion, Vorwochen, Bänder, Status, `forecastLimit`, `attachForecasts`, `snapshotsFromView` |
| `lib/usage-forecast-service.js` (neu) | Verdrahtung mit Aggregator/Snapshots/Codex-Reihe, 60-s-Cache, `attach()`, `record()` |
| `lib/db.js` | Tabelle `usage_snapshots`, `recordUsageSnapshot`, `getUsageSnapshots`, `pruneUsageSnapshots` |
| `lib/codex-usage.js` | zusätzlich je Limit die Werteserie der letzten 8 Tage, `series(key)` |
| `lib/claude-usage.js` | Poller ruft optional `onData(data, fetchedAtMs)` |
| `lib/aggregator.js` | `getCostPoints(sinceMs, match)` |
| `server.js` | Service erzeugen, Snapshots schreiben (Poller, Sync), `attach` in `/api/usage-limits` |
| `public/js/app.js` | Text-/Balken-/Ton-Helfer, Balken-Ebene, Grafik-Umschalter, Canvas-Erhalt |
| `public/js/charts.js` | `nightIntervals`, `buildUsageForecastConfig`, `USAGE_FC_PLUGIN`, `createUsageForecastChart` |
| `public/js/i18n.js` | Schlüssel `fc*` (de + en) |
| `public/css/style.css` | Plan-Strich, Schraffur, Kappe, Töne, Grafik-Box, Legende |
| `public/js/demo-data.js` | Beispiel-`forecast` für die Demo |
| Doku | `docs/API.md`, `docs/ARCHITECTURE.md`, `CLAUDE.md`, READMEs, `CHANGELOG.md`, `package.json` 0.8.0 |

---

### Task 1: Reine Rechenbausteine (`lib/usage-forecast.js`, Teil 1)

**Files:**
- Create: `lib/usage-forecast.js`
- Create: `test/usage-forecast.test.js`
- Modify: `docs/ARCHITECTURE.md` (Modultabelle, sonst wird `test/docs.test.js` rot)

**Interfaces:**
- Produces:
  - `windowOf(provider, limit) → { start, end, lenMs } | null` (ms)
  - `pace(pct, window, now) → { planPercent, deltaPoints }`
  - `makeCostIndex(points: [ms, usd][], coverageFrom?: number) → { coverageFrom, between(a, b) }` — `between` = Summe über `(a, b]`
  - `calibrate({ snapshots: {at, percent, resetsAt}[], costIndex, pct, window, now }) → { k, confidence: 'good'|'rough'|'none', pairs }`
  - `reconstruct({ pct, window, now, k, costIndex, stepMs }) → [ms, pct][]`
  - `claudeWeeks({ window, now, k, costIndex }) → ((tauMs) => number)[]`
  - `codexWeeks({ window, now, series }) → ((tauMs) => number)[]`
  - `linearIncrements(pct, window, now) → ((tauMs) => number)[]` (3 Stück: low/mid/high)
  - `forecastBands({ pct, window, now, increments, stepMs }) → { rows: [ms, med, low, high][], atReset: {median, low, high}, exhaustsAt: {median, early, late}|null }` (ms bzw. `late` evtl. `null`)
  - `statusOf({ pct, deltaPoints, exhaustsAtMs, end }) → 'exhausts'|'idle'|'ahead'|'reserve'`
  - Konstanten `FORECAST_VERSION = 1`, `MIN`, `HOUR`, `DAY`

- [ ] **Step 1: Write the failing tests**

`test/usage-forecast.test.js`:

```js
const F = require('../lib/usage-forecast');

const MIN = 60e3, HOUR = 60 * MIN, DAY = 24 * HOUR;
const END = Date.parse('2026-10-10T23:00:00Z');
const W = { start: END - 7 * DAY, end: END, lenMs: 7 * DAY };

describe('usage-forecast — window and pace', () => {
  it('derives the window from the reset time and the kind', () => {
    expect(F.windowOf('claude', { kind: 'weekly_all', resetsAt: '2026-10-10T23:00:00Z' })).toEqual(W);
    expect(F.windowOf('claude', { kind: 'session', resetsAt: '2026-10-10T23:00:00Z' }).lenMs).toBe(5 * HOUR);
    expect(F.windowOf('codex', { windowMinutes: 300, resetsAt: '2026-10-10T23:00:00Z' }).lenMs).toBe(5 * HOUR);
    expect(F.windowOf('claude', { kind: 'mystery', resetsAt: '2026-10-10T23:00:00Z' })).toBeNull();
    expect(F.windowOf('claude', { kind: 'weekly_all', resetsAt: null })).toBeNull();
  });

  it('puts the plan line at elapsed / length', () => {
    const now = W.start + 3 * DAY;
    const p = F.pace(50, W, now);
    expect(p.planPercent).toBeCloseTo(42.9, 1);
    expect(p.deltaPoints).toBeCloseTo(7.1, 1);
    expect(F.pace(0, W, W.start).planPercent).toBe(0);
    expect(F.pace(0, W, W.end + DAY).planPercent).toBe(100);
  });
});

describe('usage-forecast — cost index', () => {
  it('sums costs in the half-open interval (a, b]', () => {
    const ix = F.makeCostIndex([[30, 3], [10, 1], [20, 2]]);
    expect(ix.between(10, 30)).toBe(5);
    expect(ix.between(0, 10)).toBe(1);
    expect(ix.between(30, 99)).toBe(0);
    expect(ix.between(20, 20)).toBe(0);
    expect(ix.coverageFrom).toBe(10);
    expect(F.makeCostIndex([], 5).coverageFrom).toBe(5);
  });
});

describe('usage-forecast — calibration', () => {
  // $1 per hour, 1 point per $1 → k = 1
  const hourly = [];
  for (let t = W.start - 28 * DAY; t < W.end; t += HOUR) hourly.push([t + 1, 1]);
  const ix = F.makeCostIndex(hourly, W.start - 28 * DAY);
  const snap = (hours, percent, resetsAt = END) => ({ at: W.start + hours * HOUR, percent, resetsAt });

  it('takes the median of non-overlapping steps of at least 3 points', () => {
    const s = [snap(0, 0), snap(1, 1), snap(3, 3), snap(6, 6), snap(9, 9), snap(12, 12)];
    const c = F.calibrate({ snapshots: s, costIndex: ix, pct: 12, window: W, now: W.start + 12 * HOUR });
    expect(c.confidence).toBe('good');
    expect(c.k).toBeCloseTo(1, 5);
    expect(c.pairs).toBe(4);
  });

  it('ignores steps below 3 points (integer readings)', () => {
    const s = [snap(0, 0), snap(1, 1), snap(2, 2)];
    const c = F.calibrate({ snapshots: s, costIndex: ix, pct: 2, window: W, now: W.start + 2 * HOUR });
    expect(c.pairs).toBe(0);
    expect(c.confidence).toBe('rough');            // fallback pct / spent
    expect(c.k).toBeCloseTo(2 / 2, 5);
  });

  it('groups snapshots whose resets_at differ by milliseconds', () => {
    const s = [snap(0, 0, END + 46), snap(3, 3, END + 12), snap(6, 6, END + 99), snap(9, 9, END)];
    const c = F.calibrate({ snapshots: s, costIndex: ix, pct: 9, window: W, now: W.start + 9 * HOUR });
    expect(c.pairs).toBe(3);
    expect(c.confidence).toBe('good');
  });

  it('a reset between snapshots never yields a negative k', () => {
    const prevEnd = END - 7 * DAY;
    const s = [
      { at: prevEnd - 6 * HOUR, percent: 90, resetsAt: prevEnd },
      { at: prevEnd + HOUR, percent: 0, resetsAt: END },
      { at: prevEnd + 4 * HOUR, percent: 3, resetsAt: END }
    ];
    const c = F.calibrate({ snapshots: s, costIndex: ix, pct: 3, window: W, now: prevEnd + 4 * HOUR });
    expect(c.k).toBeGreaterThan(0);
    expect(c.k).toBeCloseTo(1, 5);
  });

  it('returns k = null below 2 % without pairs, or without any cost', () => {
    expect(F.calibrate({ snapshots: [], costIndex: ix, pct: 1, window: W, now: W.start + DAY }).k).toBeNull();
    expect(F.calibrate({ snapshots: [], costIndex: F.makeCostIndex([]), pct: 40, window: W, now: W.start + DAY }).k).toBeNull();
  });
});

describe('usage-forecast — reconstruction', () => {
  it('ends exactly at the measured value and never goes below 0', () => {
    const ix = F.makeCostIndex([[W.start + 2 * HOUR, 10], [W.start + 5 * HOUR, 10]]);
    const now = W.start + 6 * HOUR;
    const r = F.reconstruct({ pct: 30, window: W, now, k: 1, costIndex: ix, stepMs: HOUR });
    expect(r[r.length - 1]).toEqual([now, 30]);
    expect(r[0]).toEqual([W.start, 10]);           // 30 − 20
    expect(r.every(([, v]) => v >= 0)).toBe(true);
    expect(F.reconstruct({ pct: 5, window: W, now, k: 1, costIndex: ix, stepMs: HOUR })[0][1]).toBe(0);
  });
});

describe('usage-forecast — bands', () => {
  it('median / min / max over the past weeks, and when each crosses 100', () => {
    const now = W.start + 3 * DAY;
    const rate = (perDay) => (tau) => perDay * (tau - now) / DAY;
    const b = F.forecastBands({ pct: 40, window: W, now, increments: [rate(10), rate(20), rate(30)], stepMs: HOUR });
    expect(b.atReset).toEqual({ median: 120, low: 80, high: 160 });
    expect(b.exhaustsAt.median).toBe(now + 3 * DAY);   // 40 + 20/day × 3 days
    expect(b.exhaustsAt.early).toBe(now + 2 * DAY);    // high: 40 + 30/day × 2 days
    expect(b.exhaustsAt.late).toBeNull();              // low never reaches 100
  });

  it('already at 100 % is exhausted now', () => {
    const now = W.start + DAY;
    const b = F.forecastBands({ pct: 100, window: W, now, increments: [() => 0], stepMs: HOUR });
    expect(b.exhaustsAt).toEqual({ median: now, early: now, late: now });
  });

  it('linear increments project the running rate with a ±40 % spread', () => {
    const now = W.start + 2 * DAY;
    const b = F.forecastBands({ pct: 20, window: W, now, increments: F.linearIncrements(20, W, now), stepMs: HOUR });
    expect(b.atReset.median).toBeCloseTo(70, 5);   // 10/day × 5 days left
    expect(b.atReset.low).toBeCloseTo(50, 5);
    expect(b.atReset.high).toBeCloseTo(90, 5);
  });
});

describe('usage-forecast — past weeks', () => {
  it('claude: replays the same relative span of each covered past week', () => {
    const pts = [];
    for (let n = 1; n <= 4; n++) pts.push([W.start - n * W.lenMs + 5 * DAY, n * 10]); // day 5 of week −n
    const ix = F.makeCostIndex(pts, W.start - 4 * W.lenMs);
    const now = W.start + 3 * DAY;
    const weeks = F.claudeWeeks({ window: W, now, k: 2, costIndex: ix });
    expect(weeks).toHaveLength(4);
    expect(weeks.map(f => f(W.end))).toEqual([20, 40, 60, 80]);
    expect(weeks.map(f => f(now + DAY))).toEqual([0, 0, 0, 0]);
  });

  it('claude: stops at weeks the history does not fully cover', () => {
    const ix = F.makeCostIndex([], W.start - 2 * W.lenMs + HOUR);
    expect(F.claudeWeeks({ window: W, now: W.start + DAY, k: 1, costIndex: ix })).toHaveLength(1);
  });

  it('codex: replays the percent growth of the previous window', () => {
    const prevEnd = W.start;
    const ws = prevEnd - W.lenMs;
    const series = [
      { at: ws + 2 * DAY, percent: 10, resetsAt: prevEnd },
      { at: ws + 4 * DAY, percent: 30, resetsAt: prevEnd },
      { at: ws + 6 * DAY, percent: 60, resetsAt: prevEnd }
    ];
    const now = W.start + 3 * DAY;
    const [f] = F.codexWeeks({ window: W, now, series });
    expect(f(W.start + 4 * DAY)).toBe(20);
    expect(f(W.end)).toBe(50);
  });

  it('codex: skips a past window that has no value at the matching point', () => {
    const series = [{ at: W.start - DAY, percent: 50, resetsAt: W.start }];
    expect(F.codexWeeks({ window: W, now: W.start + 3 * DAY, series })).toHaveLength(0);
  });
});

describe('usage-forecast — status', () => {
  const end = END;
  it('exhausts > idle > ahead > reserve', () => {
    expect(F.statusOf({ pct: 50, deltaPoints: -20, exhaustsAtMs: end - HOUR, end })).toBe('exhausts');
    expect(F.statusOf({ pct: 0, deltaPoints: -40, exhaustsAtMs: null, end })).toBe('idle');
    expect(F.statusOf({ pct: 50, deltaPoints: 5.1, exhaustsAtMs: null, end })).toBe('ahead');
    expect(F.statusOf({ pct: 50, deltaPoints: 5, exhaustsAtMs: null, end })).toBe('reserve');
    expect(F.statusOf({ pct: 50, deltaPoints: 0, exhaustsAtMs: end + HOUR, end })).toBe('reserve');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run test/usage-forecast.test.js`
Expected: FAIL — `Cannot find module '../lib/usage-forecast'`.

- [ ] **Step 3: Implement**

`lib/usage-forecast.js`:

```js
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
```

Und in `docs/ARCHITECTURE.md` in der Modultabelle (dort, wo `lib/usage-limits-store.js` steht) eine Zeile darunter:

```markdown
| `lib/usage-forecast.js` | Pure pace / calibration / forecast for the usage limits: % per USD from snapshot steps, the running window rebuilt from the cost history, the remaining window replayed from up to 4 past weeks (median, min, max), linear fallback. No I/O, no clock. |
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run test/usage-forecast.test.js test/docs.test.js`
Expected: PASS.

- [ ] **Step 5: Mutation probes**

Je einmal einbauen, Suite rot sehen, zurücksetzen (`cp` vor der Probe, `cmp` danach):
- `MIN_STEP_POINTS = 3` → `1` (Test „ignores steps below 3 points" muss rot werden)
- `RESET_TOLERANCE = 5 * MIN` → `0` (Gruppierungstest rot)
- `} else if (dp < 0) {` → `} else if (false) {` (Reset-Test rot)
- in `claudeWeeks` `if (costIndex.coverageFrom > ws) break;` → entfernen (Abdeckungstest rot)

- [ ] **Step 6: Commit**

```bash
git add lib/usage-forecast.js test/usage-forecast.test.js docs/ARCHITECTURE.md
git commit -m "feat(usage): pure pace, calibration and forecast building blocks"
```

---

### Task 2: Prognose je Limit (`forecastLimit`, `attachForecasts`, `snapshotsFromView`)

**Files:**
- Modify: `lib/usage-forecast.js`
- Modify: `test/usage-forecast.test.js`

**Interfaces:**
- Consumes: alles aus Task 1.
- Produces:
  - `forecastLimit(provider, limit, ctx) → Forecast | null` — `ctx = { now: ms, costIndexFor(scopeLabel|null) → { index, mapped }, snapshotsFor(provider, limitId) → {at, percent, resetsAt}[], seriesFor(limitId, windowMinutes) → {at, percent, resetsAt}[] }`
  - `attachForecasts(views, ctx) → views` (neue Objekte; `limits[i].forecast` gesetzt, wo möglich)
  - `snapshotsFromView(view) → { limitId, at, percent, resetsAt }[]` (ms)
  - `Forecast` exakt wie im Spec-Abschnitt „API-Vertrag" (ISO-Strings für Zeiten).

- [ ] **Step 1: Write the failing tests** (an `test/usage-forecast.test.js` anhängen)

```js
describe('usage-forecast — forecastLimit', () => {
  const NOW = W.start + 3 * DAY;
  const lim = (over = {}) => ({ id: 'weekly_all', kind: 'weekly_all', percentUsed: 30, resetsAt: new Date(END).toISOString(), ...over });
  // $1 every hour for 5 weeks
  const pts = [];
  for (let t = W.start - 4 * W.lenMs; t < NOW; t += HOUR) pts.push([t + 1, 1]);
  const ctxWith = (o = {}) => ({
    now: NOW,
    costIndexFor: () => ({ index: F.makeCostIndex(pts, W.start - 4 * W.lenMs), mapped: true }),
    snapshotsFor: () => [],
    seriesFor: () => [],
    ...o
  });

  it('claude weekly: calibrated, four past weeks, full series', () => {
    const f = F.forecastLimit('claude', lim(), ctxWith());
    expect(f.version).toBe(1);
    expect(f.basis).toBe('calibrated');
    expect(f.window).toEqual({ start: new Date(W.start).toISOString(), end: new Date(END).toISOString() });
    expect(f.k).toBeCloseTo(30 / 72, 4);                  // fallback: 30 % over $72 so far
    // 4 days left at $24/day × k → +40 points
    expect(f.atReset.median).toBeCloseTo(70, 0);
    expect(f.status).toBe('reserve');
    expect(f.series.ghosts).toHaveLength(3);
    expect(f.series.actual[f.series.actual.length - 1][1]).toBe(30);
    expect(f.notes).toContain('chat_invisible');
  });

  it('quiet past weeks forecast no growth', () => {
    const recent = pts.filter(([t]) => t >= W.start);
    const f = F.forecastLimit('claude', lim(), ctxWith({
      costIndexFor: () => ({ index: F.makeCostIndex(recent, W.start - 4 * W.lenMs), mapped: true })
    }));
    expect(f.atReset.median).toBe(30);
    expect(f.exhaustsAt).toBeNull();
    expect(f.status).toBe('reserve');
  });

  it('falls back to linear without past weeks, and says so', () => {
    const f = F.forecastLimit('claude', lim(), ctxWith({
      costIndexFor: () => ({ index: F.makeCostIndex([], Infinity), mapped: true })
    }));
    expect(f.basis).toBe('linear');
    expect(f.confidence).toBe('rough');
    expect(f.atReset.median).toBeCloseTo(70, 5);          // 10/day × 4 days
  });

  it('is too early in the first 10 % of the window', () => {
    const f = F.forecastLimit('claude', lim({ percentUsed: 5 }), ctxWith({
      now: W.start + HOUR,
      costIndexFor: () => ({ index: F.makeCostIndex([], Infinity), mapped: true })
    }));
    expect(f.basis).toBe('none');
    expect(f.notes).toContain('too_early');
    expect(f.atReset).toBeNull();
  });

  it('idle at 0 % without a cost history', () => {
    const f = F.forecastLimit('claude', lim({ percentUsed: 0 }), ctxWith({
      costIndexFor: () => ({ index: F.makeCostIndex([], Infinity), mapped: true })
    }));
    expect(f.status).toBe('idle');
  });

  it('marks an unmapped model scope', () => {
    const f = F.forecastLimit('claude', lim({ id: 'weekly_scoped:x', kind: 'weekly_scoped', scopeLabel: 'X' }),
      ctxWith({ costIndexFor: (s) => ({ index: F.makeCostIndex(pts, W.start - 4 * W.lenMs), mapped: s === null }) }));
    expect(f.notes).toContain('scope_unmapped');
  });

  it('session: linear only, no series', () => {
    const sEnd = NOW + 2 * HOUR;
    const f = F.forecastLimit('claude', { id: 'session', kind: 'session', percentUsed: 66, resetsAt: new Date(sEnd).toISOString() }, ctxWith());
    expect(f.basis).toBe('linear');
    expect(f.series).toBeNull();
    // 66 % in 3 h → 100 % after ~1:33 h, before the reset in 2 h. (60 % would hit
    // 100 exactly AT the reset — that is not "runs out before the reset".)
    expect(f.status).toBe('exhausts');
    expect(Date.parse(f.exhaustsAt.median)).toBeLessThanOrEqual(sEnd);
  });

  it('unknown after the reset, for Codex "reset" windows and for Antigravity', () => {
    expect(F.forecastLimit('claude', lim({ resetsAt: new Date(NOW - 1).toISOString() }), ctxWith()).status).toBe('unknown');
    expect(F.forecastLimit('codex', { id: 'codex:10080', windowMinutes: 10080, reset: true, percentUsed: null, resetsAt: null }, ctxWith()).status).toBe('unknown');
    expect(F.forecastLimit('antigravity', { kind: 'exhausted' }, ctxWith())).toBeNull();
  });

  it('codex weekly: forecast from its own series', () => {
    const prevEnd = W.start;
    const ws = prevEnd - W.lenMs;
    const series = [
      { at: ws + 2 * DAY, percent: 10, resetsAt: prevEnd },
      { at: ws + 6 * DAY, percent: 60, resetsAt: prevEnd },
      { at: W.start + DAY, percent: 20, resetsAt: END }
    ];
    const f = F.forecastLimit('codex', { id: 'codex:10080', limitId: 'codex', windowMinutes: 10080, percentUsed: 20, resetsAt: new Date(END).toISOString() },
      ctxWith({ seriesFor: () => series }));
    expect(f.basis).toBe('snapshots');
    expect(f.k).toBeNull();
    expect(f.atReset.median).toBe(70);                   // 20 + (60 − 10)
    expect(f.series.measured).toEqual([[new Date(W.start + DAY).toISOString(), 20]]);
  });
});

describe('usage-forecast — attachForecasts / snapshotsFromView', () => {
  const view = (limits) => ({ enabled: true, status: 'ok', fetchedAt: '2026-10-05T10:00:00.000Z', data: { limits } });
  const ctx = {
    now: Date.parse('2026-10-05T10:00:00Z'),
    costIndexFor: () => ({ index: F.makeCostIndex([], Infinity), mapped: true }),
    snapshotsFor: () => [], seriesFor: () => []
  };

  it('adds forecast per limit, never touches antigravity, and one failure keeps the rest', () => {
    const views = {
      claude: view([
        { id: 'weekly_all', kind: 'weekly_all', percentUsed: 30, resetsAt: '2026-10-10T23:00:00Z' },
        { id: 'boom', kind: 'weekly_all', get percentUsed() { throw new Error('x'); }, resetsAt: '2026-10-10T23:00:00Z' }
      ]),
      antigravity: view([{ id: 'quota', kind: 'exhausted' }]),
      codex: { enabled: false }
    };
    const out = F.attachForecasts(views, ctx);
    expect(out.claude.data.limits[0].forecast.version).toBe(1);
    expect(out.claude.data.limits[1].forecast).toBeUndefined();
    expect(out.antigravity).toBe(views.antigravity);
    expect(out.codex).toEqual({ enabled: false });
    expect(views.claude.data.limits[0].forecast).toBeUndefined();   // input untouched
  });

  it('turns a view into numeric snapshots and skips what cannot be one', () => {
    const s = F.snapshotsFromView(view([
      { id: 'session', percentUsed: 4, resetsAt: '2026-10-05T12:00:00Z' },
      { id: 'codex:10080', percentUsed: null, reset: true, resetsAt: null },
      { id: 'x', percentUsed: 5, resetsAt: 'nope' }
    ]));
    expect(s).toEqual([{ limitId: 'session', at: Date.parse('2026-10-05T10:00:00Z'), percent: 4, resetsAt: Date.parse('2026-10-05T12:00:00Z') }]);
    expect(F.snapshotsFromView({ enabled: false })).toEqual([]);
    expect(F.snapshotsFromView({ ...view([]), fetchedAt: null })).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run test/usage-forecast.test.js`
Expected: FAIL — `F.forecastLimit is not a function`.

- [ ] **Step 3: Implement** (in `lib/usage-forecast.js` vor `module.exports` einfügen und exportieren)

```js
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
      for (let n = 1; n <= MAX_GHOSTS; n++) {
        const ws = w.start - n * w.lenMs;
        const pts = series.filter(s => sameWindow(s.resetsAt, ws + w.lenMs));
        if (pts.length) ghosts.push({ start: iso(ws), points: pts.map(s => [(s.at - ws) / MIN, s.percent]) });
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
```

`module.exports` erweitern um `forecastLimit, attachForecasts, snapshotsFromView`.

Hinweis zum Test „boom": `{ ...l, forecast }` liest den Getter erneut — `forecastLimit` wirft schon beim Lesen von `l.percentUsed`, das `catch` liefert `l` unverändert. Das ist genau der Fall „Rechenfehler lässt nur dieses Limit ohne forecast".

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run test/usage-forecast.test.js`
Expected: PASS. Wenn „claude weekly" bei `atReset.median` um ±1 abweicht: Stunden-Raster prüfen (Kostenpunkte liegen bei `t + 1`), nicht die Erwartung lockern.

- [ ] **Step 5: Mutation probes**
- `if (pct > 0 && now - w.start >= TOO_EARLY * w.lenMs)` → `if (pct > 0)` („too early" rot)
- in `attachForecasts` `try { … } catch { return l; }` → ohne `try` („one failure keeps the rest" rot)
- `if (!mapped) out.notes.push('scope_unmapped');` entfernen (Scope-Test rot)

- [ ] **Step 6: Commit**

```bash
git add lib/usage-forecast.js test/usage-forecast.test.js
git commit -m "feat(usage): per-limit forecast object, attach and snapshot extraction"
```

---

### Task 3: Snapshot-Speicher (`usage_snapshots`)

**Files:**
- Modify: `lib/db.js` (Tabelle in `initDB`, drei Funktionen, `module.exports`)
- Create: `test/usage-snapshots.test.js`
- Modify: `docs/ARCHITECTURE.md` (Tabellenliste, Zeile nach `project_aliases`)

**Interfaces:**
- Produces:
  - `recordUsageSnapshot(userId, provider, limitId, atMs, percent, resetsAtMs) → boolean` (true = Zeile geschrieben)
  - `getUsageSnapshots(userId, provider, limitId, sinceMs) → { at, percent, resetsAt }[]` (ms, aufsteigend)
  - `pruneUsageSnapshots(beforeMs) → number` (gelöschte Zeilen)

- [ ] **Step 1: Write the failing tests**

`test/usage-snapshots.test.js`:

```js
const fs = require('fs');
const os = require('os');
const path = require('path');
const { initDB, closeDB, getDB, recordUsageSnapshot, getUsageSnapshots, pruneUsageSnapshots } = require('../lib/db');

const MIN = 60e3, DAY = 86400e3;
const T0 = Date.parse('2026-10-05T10:00:00Z');
const R = Date.parse('2026-10-10T23:00:00Z');

describe('usage_snapshots', () => {
  let dir;
  beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'snap-')); initDB(path.join(dir, 't.db')); });
  afterEach(() => { closeDB(); fs.rmSync(dir, { recursive: true, force: true }); });

  it('writes only changes, plus a heartbeat every 30 minutes', () => {
    expect(recordUsageSnapshot(0, 'claude', 'weekly_all', T0, 10, R)).toBe(true);
    expect(recordUsageSnapshot(0, 'claude', 'weekly_all', T0 + 10 * MIN, 10, R + 46)).toBe(false); // jitter = same window
    expect(recordUsageSnapshot(0, 'claude', 'weekly_all', T0 + 31 * MIN, 10, R)).toBe(true);
    expect(recordUsageSnapshot(0, 'claude', 'weekly_all', T0 + 35 * MIN, 11, R)).toBe(true);
    expect(recordUsageSnapshot(0, 'claude', 'weekly_all', T0 + 35 * MIN, 12, R)).toBe(false);      // not newer
    expect(getUsageSnapshots(0, 'claude', 'weekly_all', 0).map(s => s.percent)).toEqual([10, 10, 11]);
  });

  it('keeps users, providers and limits apart', () => {
    recordUsageSnapshot(1, 'claude', 'weekly_all', T0, 10, R);
    recordUsageSnapshot(2, 'claude', 'weekly_all', T0, 20, R);
    recordUsageSnapshot(1, 'codex', 'weekly_all', T0, 30, R);
    expect(getUsageSnapshots(1, 'claude', 'weekly_all', 0)).toEqual([{ at: T0, percent: 10, resetsAt: R }]);
    expect(getUsageSnapshots(2, 'claude', 'weekly_all', 0)[0].percent).toBe(20);
    expect(getUsageSnapshots(1, 'codex', 'weekly_all', 0)[0].percent).toBe(30);
  });

  it('reads from a start time on', () => {
    recordUsageSnapshot(0, 'claude', 's', T0, 1, R);
    recordUsageSnapshot(0, 'claude', 's', T0 + DAY, 2, R);
    expect(getUsageSnapshots(0, 'claude', 's', T0 + 1).map(s => s.percent)).toEqual([2]);
  });

  it('prunes rows older than 60 days when recording', () => {
    recordUsageSnapshot(0, 'claude', 'old', T0 - 61 * DAY, 5, R);
    pruneUsageSnapshots(0);                                     // nothing older than 0
    recordUsageSnapshot(0, 'claude', 'new', T0, 6, R);          // over an hour after the last prune → prunes
    expect(getUsageSnapshots(0, 'claude', 'old', 0)).toEqual([]);
    expect(getUsageSnapshots(0, 'claude', 'new', 0)).toHaveLength(1);
  });

  it('stores nothing but numbers and ids', () => {
    const cols = getDB().prepare('PRAGMA table_info(usage_snapshots)').all().map(c => c.name);
    expect(cols).toEqual(['user_id', 'provider', 'limit_id', 'at', 'percent', 'resets_at']);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run test/usage-snapshots.test.js`
Expected: FAIL — `recordUsageSnapshot is not a function`.

- [ ] **Step 3: Implement** in `lib/db.js`

In `initDB`, direkt nach dem `db.exec`-Block mit `project_aliases`:

```js
  // Usage-limit snapshots (percentages and reset times only — never a token).
  db.exec(`
    CREATE TABLE IF NOT EXISTS usage_snapshots (
      user_id TEXT NOT NULL DEFAULT '0',
      provider TEXT NOT NULL,
      limit_id TEXT NOT NULL,
      at INTEGER NOT NULL,
      percent REAL NOT NULL,
      resets_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, provider, limit_id, at)
    );
  `);
  _lastSnapshotPrune = 0;
```

Oberhalb von `module.exports`:

```js
const SNAPSHOT_HEARTBEAT_MS = 30 * 60 * 1000;
const SNAPSHOT_RETENTION_MS = 60 * 24 * 60 * 60 * 1000;
const SNAPSHOT_RESET_TOLERANCE_MS = 5 * 60 * 1000;
const SNAPSHOT_PRUNE_EVERY_MS = 60 * 60 * 1000;
let _lastSnapshotPrune = 0;

/**
 * Store one usage-limit reading. Written only when the percentage or the
 * window changes, otherwise at most every 30 minutes (heartbeat). Rows older
 * than 60 days are pruned on insert, at most once an hour.
 */
function recordUsageSnapshot(userId, provider, limitId, atMs, percent, resetsAtMs) {
  const uid = String(userId);
  const at = Math.round(atMs);
  const last = db.prepare(
    'SELECT at, percent, resets_at FROM usage_snapshots WHERE user_id = ? AND provider = ? AND limit_id = ? ORDER BY at DESC LIMIT 1'
  ).get(uid, provider, limitId);
  if (last && at <= last.at) return false;
  if (last && last.percent === percent
    && Math.abs(last.resets_at - resetsAtMs) <= SNAPSHOT_RESET_TOLERANCE_MS
    && at - last.at < SNAPSHOT_HEARTBEAT_MS) return false;
  db.prepare('INSERT OR IGNORE INTO usage_snapshots (user_id, provider, limit_id, at, percent, resets_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(uid, provider, limitId, at, percent, Math.round(resetsAtMs));
  if (at - _lastSnapshotPrune >= SNAPSHOT_PRUNE_EVERY_MS) {
    pruneUsageSnapshots(at - SNAPSHOT_RETENTION_MS);
    _lastSnapshotPrune = at;
  }
  return true;
}

function pruneUsageSnapshots(beforeMs) {
  return db.prepare('DELETE FROM usage_snapshots WHERE at < ?').run(Math.round(beforeMs)).changes;
}

function getUsageSnapshots(userId, provider, limitId, sinceMs) {
  return db.prepare(
    'SELECT at, percent, resets_at AS resetsAt FROM usage_snapshots WHERE user_id = ? AND provider = ? AND limit_id = ? AND at >= ? ORDER BY at'
  ).all(String(userId), provider, limitId, Math.round(sinceMs));
}
```

⚠️ `let _lastSnapshotPrune` muss **vor** `initDB` deklariert sein (sonst TDZ beim Zurücksetzen in `initDB`) — die drei Konstanten und das `let` deshalb oben in der Datei bei den übrigen Modulvariablen anlegen, die Funktionen unten.

In `module.exports` eine Zeile ergänzen:

```js
  // Usage-limit snapshots
  recordUsageSnapshot, getUsageSnapshots, pruneUsageSnapshots,
```

In `docs/ARCHITECTURE.md` in der Tabellenliste nach `| \`project_aliases\` | Merge map, per user. |`:

```markdown
| `usage_snapshots` | Usage-limit readings (percent, reset time) per user / provider / limit — only on change or every 30 min, kept 60 days. Feeds the forecast's calibration. |
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run test/usage-snapshots.test.js test/db.test.js test/docs.test.js`
Expected: PASS.

- [ ] **Step 5: Mutation probes**
- `at - last.at < SNAPSHOT_HEARTBEAT_MS` → `true` (Heartbeat-Test rot)
- `Math.abs(last.resets_at - resetsAtMs) <= SNAPSHOT_RESET_TOLERANCE_MS` → `last.resets_at === resetsAtMs` (Jitter-Zeile rot)
- `_lastSnapshotPrune = 0;` in `initDB` entfernen und Testdatei allein laufen lassen (Prune-Test rot, weil der Modulzustand aus dem vorigen Test hängt)

- [ ] **Step 6: Commit**

```bash
git add lib/db.js test/usage-snapshots.test.js docs/ARCHITECTURE.md
git commit -m "feat(usage): usage_snapshots table — changes and a 30-min heartbeat, 60-day retention"
```

---

### Task 4: Codex-Werteserie aus den Logs

**Files:**
- Modify: `lib/codex-usage.js`
- Modify: `test/local-usage.test.js`

**Interfaces:**
- Produces: `createCodexUsage(dir).series(key) → { at, percent, resetsAt }[]` (ms, aufsteigend, nur Wertänderungen, letzte 8 Tage); `key = '<limitId>:<windowMinutes>'` (identisch mit `limit.id` der Codex-Limits).

- [ ] **Step 1: Write the failing tests** (in `test/local-usage.test.js` im `describe('codex usage — incremental reader')`)

```js
  it('keeps a per-limit series of value changes from the last 8 days', async () => {
    const now = Date.now();
    const iso = (ms) => new Date(ms).toISOString();
    const R5 = Math.floor((now + 3600e3) / 1000), RW = Math.floor((now + 3 * 86400e3) / 1000);
    write('2026/10/03/rollout-s.jsonl', [
      rlLine(iso(now - 9 * 86400e3), CODEX_RL(1, 1, R5, RW)),            // older than 8 days: dropped
      rlLine(iso(now - 3 * 3600e3), CODEX_RL(10, 20, R5, RW)),
      rlLine(iso(now - 2 * 3600e3), CODEX_RL(10, 20, R5, RW)),           // unchanged: no new point
      rlLine(iso(now - 3600e3), CODEX_RL(15, 22, R5, RW))
    ].join('\n') + '\n');
    const r = codex.createCodexUsage(dir);
    await r.refresh();
    expect(r.series('codex:300').map(p => p.percent)).toEqual([10, 15]);
    expect(r.series('codex:10080').map(p => p.percent)).toEqual([20, 22]);
    expect(r.series('codex:10080')[0]).toEqual({ at: Date.parse(iso(now - 3 * 3600e3)), percent: 20, resetsAt: RW * 1000 });
    expect(r.series('nope:1')).toEqual([]);
  });

  it('merges the series of two files in time order', async () => {
    const now = Date.now();
    const iso = (ms) => new Date(ms).toISOString();
    const RW = Math.floor((now + 3 * 86400e3) / 1000);
    write('2026/10/03/rollout-x.jsonl', rlLine(iso(now - 2 * 3600e3), CODEX_RL(5, 30, RW, RW)) + '\n');
    write('2026/10/03/rollout-y.jsonl', rlLine(iso(now - 5 * 3600e3), CODEX_RL(5, 25, RW, RW)) + '\n');
    const r = codex.createCodexUsage(dir);
    await r.refresh();
    expect(r.series('codex:10080').map(p => p.percent)).toEqual([25, 30]);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run test/local-usage.test.js`
Expected: FAIL — `r.series is not a function`.

- [ ] **Step 3: Implement** in `lib/codex-usage.js`

`_absorb` ersetzen durch:

```js
/** Parse one JSONL line into { id, at, rl } if it carries rate limits. */
function _parse(line) {
  if (!line.includes('"rate_limits"')) return null;
  let o;
  try { o = JSON.parse(line); } catch { return null; }
  const rl = isObj(o.payload) ? o.payload.rate_limits : (isObj(o) ? o.rate_limits : null);
  if (!isObj(rl)) return null;
  const at = typeof o.timestamp === 'string' ? o.timestamp : null;
  if (!at) return null;
  const id = typeof rl.limit_id === 'string' && rl.limit_id ? rl.limit_id : 'default';
  return { id, at, rl };
}

/** Append a value change per window to `series` (Map key → points). */
function _addSeries(series, { id, at, rl }) {
  const atMs = Date.parse(at);
  if (!Number.isFinite(atMs)) return;
  for (const w of [rl.primary, rl.secondary]) {
    if (!isObj(w)) continue;
    const minutes = num(w.window_minutes), pct = num(w.used_percent), reset = num(w.resets_at);
    if (minutes === null || pct === null || reset === null) continue;
    const key = `${id}:${minutes}`;
    let arr = series.get(key);
    if (!arr) { arr = []; series.set(key, arr); }
    const last = arr[arr.length - 1];
    if (last && last.percent === pct && last.resetsAt === reset * 1000) continue;
    arr.push({ at: atMs, percent: pct, resetsAt: reset * 1000 });
  }
}

/** Fold one JSONL line into `best` (newest per limit) and, if given, `series`. */
function _absorb(line, best, series) {
  const r = _parse(line);
  if (!r) return;
  const prev = best.get(r.id);
  if (!prev || r.at > prev.at) best.set(r.id, { at: r.at, rl: r.rl });
  if (series) _addSeries(series, r);
}
```

In `createCodexUsage`:
- Dateizustand bekommt `series: new Map()`: in `_scan` `st = { offset: 0, rest: '', best: new Map(), series: new Map(), decoder: new StringDecoder('utf8') }`, und in `_readFrom` beim Zurücksetzen (`size < st.offset`) zusätzlich `st.series = new Map();`.
- In `_readFrom` `for (const line of lines) _absorb(line, st.best, st.series);`
- Im zurückgegebenen Objekt neben `view()`:

```js
    /** Value changes of one limit window ('<limitId>:<windowMinutes>'), last 8 days, oldest first. */
    series(key) {
      const t = now();
      const all = [];
      for (const st of files.values()) {
        for (const p of st.series.get(key) || []) if (t - p.at <= MAX_AGE_MS) all.push(p);
      }
      all.sort((a, b) => a.at - b.at);
      return all.filter((p, i) => i === 0 || p.percent !== all[i - 1].percent || p.resetsAt !== all[i - 1].resetsAt);
    }
```

`latestSnapshots` ruft `_absorb(line, best)` weiter ohne Serie — unverändert lassen.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run test/local-usage.test.js test/usage-sync.test.js`
Expected: PASS (der Bundle-Test in `usage-sync.test.js` belegt, dass `codex-usage.js` weiter nur Node-Bordmittel braucht).

- [ ] **Step 5: Mutation probe**
- in `_addSeries` die `continue`-Zeile für unveränderte Werte entfernen (`[10, 15]` → `[10, 10, 15]`, Test rot)
- `if (t - p.at <= MAX_AGE_MS)` → `if (true)` (8-Tage-Test rot)

- [ ] **Step 6: Commit**

```bash
git add lib/codex-usage.js test/local-usage.test.js
git commit -m "feat(codex-usage): keep each window's value changes of the last 8 days"
```

---

### Task 5: Verdrahtung — Poller-Hook, Kostenpunkte, Service, Server

**Files:**
- Modify: `lib/claude-usage.js` (`createPoller` ruft `deps.onData`, `createDefaultPoller(db, opts)`)
- Modify: `lib/aggregator.js` (`getCostPoints`)
- Create: `lib/usage-forecast-service.js`
- Modify: `server.js`
- Create: `test/usage-forecast-service.test.js`
- Create: `test/usage-forecast-api.test.js`
- Modify: `test/claude-usage.test.js`, `test/aggregator.test.js`
- Modify: `docs/ARCHITECTURE.md` (Modulzeile `lib/usage-forecast-service.js`)

**Interfaces:**
- Consumes: Task 1–4.
- Produces:
  - `createPoller({ …, onData(data, fetchedAtMs) })` — nach jedem erfolgreichen Abruf genau einmal
  - `createDefaultPoller(db, { onData } = {})`
  - `Aggregator#getCostPoints(sinceMs, match?) → { points: [ms, usd][], firstMs: number|null }` (nur Claude; `firstMs` über alle Claude-Nachrichten)
  - `createForecastService({ getSnapshots, recordSnapshot, codexSeries, getModelLabel, now? }) → { attach({ userId, cacheKey, views, aggregator }), record(userId, provider, view) }`

- [ ] **Step 1: Write the failing tests**

In `test/claude-usage.test.js` im `describe('claude-usage — poller')`: `makePoller` um `onData` erweitern —

```js
  function makePoller({ responses, token = { token: 'sk-ant-oat01-FAKE' }, start = Date.parse('2026-10-04T10:00:00Z'), onData }) {
```
und im `createPoller({ … })`-Aufruf `onData,` ergänzen. Dann:

```js
  it('hands every successful result to onData, and nothing else', async () => {
    const seen = [];
    const t = makePoller({
      responses: [{ status: 200, body: JSON.stringify(SAMPLE) }, { status: 429, headers: {} }],
      onData: (data, at) => seen.push([data.limits.length > 0, at])
    });
    await t.p.fetchNow();
    t.tick(10 * 60e3);
    await t.p.fetchNow();
    expect(seen).toEqual([[true, Date.parse('2026-10-04T10:00:00Z')]]);
  });

  it('a throwing onData does not break the poller', async () => {
    const t = makePoller({ responses: [{ status: 200, body: JSON.stringify(SAMPLE) }], onData: () => { throw new Error('db'); } });
    await t.p.fetchNow();
    expect(t.p.view().status).toBe('ok');
  });
```

In `test/aggregator.test.js` (oben `const { Aggregator } = require('../lib/aggregator');` steht bereits — sonst so importieren, wie die Datei es tut):

```js
describe('getCostPoints', () => {
  it('returns Claude costs since a time, with an optional model filter and the all-time start', () => {
    const agg = new Aggregator();
    const m = (id, ts, model, provider, cost) => ({
      id, timestamp: ts, model, provider, sessionId: 's', project: 'p',
      inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreateTokens: 0, tools: [], toolCounts: {}, _testCost: cost
    });
    agg.addMessages([
      m('a', '2026-10-01T00:00:00Z', 'claude-fable-5', 'claude'),
      m('b', '2026-10-03T00:00:00Z', 'claude-opus-5-5', 'claude'),
      m('c', '2026-10-03T00:00:00Z', 'gpt-5', 'codex')
    ]);
    const all = agg.getCostPoints(Date.parse('2026-10-02T00:00:00Z'));
    expect(all.points.map(p => p[0])).toEqual([Date.parse('2026-10-03T00:00:00Z')]);
    expect(all.firstMs).toBe(Date.parse('2026-10-01T00:00:00Z'));
    const fable = agg.getCostPoints(0, (model) => model.includes('fable'));
    expect(fable.points).toHaveLength(1);
  });
});
```

(Kosten sind hier 0, weil die Token-Felder 0 sind — getestet werden Filter und Zeiten. Das Feld `_testCost` ist bedeutungslos; die Nachricht muss nur die Form haben, die `addMessages` erwartet. Falls `aggregator.test.js` eine Fabrik für Testnachrichten hat, diese benutzen.)

`test/usage-forecast-service.test.js`:

```js
const { createForecastService } = require('../lib/usage-forecast-service');

const DAY = 86400e3, HOUR = 3600e3;
const NOW = Date.parse('2026-10-07T23:00:00Z');
const END = Date.parse('2026-10-10T23:00:00Z');

function fakeAgg(points) {
  let calls = 0;
  return {
    get calls() { return calls; },
    getCostPoints(since, match) {
      calls++;
      const ps = points.filter(p => p.ms >= since && (!match || match(p.model)));
      return { points: ps.map(p => [p.ms, p.usd]), firstMs: points.length ? Math.min(...points.map(p => p.ms)) : null };
    }
  };
}

const views = (pct = 30) => ({
  claude: { enabled: true, status: 'ok', fetchedAt: new Date(NOW).toISOString(), data: { limits: [
    { id: 'weekly_all', kind: 'weekly_all', percentUsed: pct, resetsAt: new Date(END).toISOString() },
    { id: 'weekly_scoped:fable', kind: 'weekly_scoped', scopeLabel: 'Fable', percentUsed: 20, resetsAt: new Date(END).toISOString() }
  ] } },
  codex: { enabled: false },
  antigravity: { enabled: false }
});

describe('usage-forecast-service', () => {
  const points = [];
  for (let t = NOW - 35 * DAY; t < NOW; t += HOUR) points.push({ ms: t, usd: 1, model: t % (2 * HOUR) ? 'claude-opus-5-5' : 'claude-fable-5' });

  const make = (over = {}) => {
    const rec = [];
    const svc = createForecastService({
      getSnapshots: () => [],
      recordSnapshot: (...a) => rec.push(a),
      codexSeries: null,
      getModelLabel: (m) => (m.includes('fable') ? 'Fable 5' : 'Opus 5.5'),
      now: () => NOW,
      ...over
    });
    return { svc, rec };
  };

  it('attaches a calibrated forecast and filters the scoped limit to its model', () => {
    const { svc } = make();
    const out = svc.attach({ userId: 0, cacheKey: 'local', views: views(), aggregator: fakeAgg(points) });
    const [all, fable] = out.claude.data.limits;
    expect(all.forecast.basis).toBe('calibrated');
    expect(fable.forecast.notes).not.toContain('scope_unmapped');
    expect(fable.forecast.k).toBeGreaterThan(all.forecast.k);   // 20 % on half the cost vs 30 % on all of it
  });

  it('marks a scope no model matches', () => {
    const { svc } = make({ getModelLabel: () => 'Opus 5.5' });
    const out = svc.attach({ userId: 0, cacheKey: 'local', views: views(), aggregator: fakeAgg(points) });
    expect(out.claude.data.limits[1].forecast.notes).toContain('scope_unmapped');
  });

  it('caches for 60 s per key and recomputes when a value changes', () => {
    const { svc } = make();
    const agg = fakeAgg(points);
    svc.attach({ userId: 0, cacheKey: 'k', views: views(30), aggregator: agg });
    const n = agg.calls;
    svc.attach({ userId: 0, cacheKey: 'k', views: views(30), aggregator: agg });
    expect(agg.calls).toBe(n);
    svc.attach({ userId: 0, cacheKey: 'k', views: views(31), aggregator: agg });
    expect(agg.calls).toBeGreaterThan(n);
  });

  it('uses the Codex log series when given, the snapshot table otherwise', () => {
    const asked = [];
    const codexView = { enabled: true, status: 'ok', fetchedAt: new Date(NOW).toISOString(), data: { limits: [
      { id: 'codex:10080', limitId: 'codex', windowMinutes: 10080, percentUsed: 5, resetsAt: new Date(END).toISOString() }
    ] } };
    const local = make({ codexSeries: (key) => { asked.push(['log', key]); return []; } });
    local.svc.attach({ userId: 0, cacheKey: 'a', views: { codex: codexView }, aggregator: fakeAgg([]) });
    const hosted = make({ getSnapshots: (...a) => { asked.push(['db', a[1], a[2]]); return []; } });
    hosted.svc.attach({ userId: 7, cacheKey: 'b', views: { codex: codexView }, aggregator: fakeAgg([]) });
    expect(asked).toContainEqual(['log', 'codex:10080']);
    expect(asked).toContainEqual(['db', 'codex', 'codex:10080']);
  });

  it('records one snapshot per limit and swallows storage errors', () => {
    const { svc, rec } = make();
    svc.record(3, 'claude', views(30).claude);
    expect(rec).toEqual([
      [3, 'claude', 'weekly_all', NOW, 30, END],
      [3, 'claude', 'weekly_scoped:fable', NOW, 20, END]
    ]);
    const broken = make({ recordSnapshot: () => { throw new Error('locked'); } });
    expect(() => broken.svc.record(3, 'claude', views().claude)).not.toThrow();
  });
});
```

`test/usage-forecast-api.test.js` (bootet den Server gegen Wegwerf-Verzeichnisse, inkl. Codex-Logs mit einer Vorwoche):

```js
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

let baseUrl, serverInstance, tmpDir;
const get = (p) => new Promise((resolve, reject) => {
  http.get(baseUrl + p, (res) => {
    let b = ''; res.on('data', c => { b += c; });
    res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(b) }));
  }).on('error', reject);
});

const DAY = 86400e3, HOUR = 3600e3;
const line = (ms, rl) => JSON.stringify({ timestamp: new Date(ms).toISOString(), type: 'event_msg', payload: { type: 'token_count', rate_limits: rl } });
const RL = (p5, r5, pw, rw) => ({
  limit_id: 'codex',
  primary: { used_percent: p5, window_minutes: 300, resets_at: Math.floor(r5 / 1000) },
  secondary: { used_percent: pw, window_minutes: 10080, resets_at: Math.floor(rw / 1000) },
  plan_type: 'plus'
});

describe('GET /api/usage-limits — forecast', () => {
  const now = Date.now();
  const curEnd = now + 3 * DAY, prevEnd = curEnd - 7 * DAY;
  const r5 = now + 2 * HOUR;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tracker-fc-api-'));
    fs.mkdirSync(path.join(tmpDir, 'claude', 'projects'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'antigravity', 'log'), { recursive: true });
    const day = path.join(tmpDir, 'codex', 'sessions', '2026', '10', '05');
    fs.mkdirSync(day, { recursive: true });
    fs.writeFileSync(path.join(day, 'rollout-t.jsonl'), [
      line(now - 7.5 * DAY, RL(0, r5, 10, prevEnd)),
      line(now - 6 * DAY, RL(0, r5, 30, prevEnd)),
      line(now - 5 * DAY, RL(0, r5, 60, prevEnd)),
      line(now - 3.5 * DAY, RL(0, r5, 5, curEnd)),
      line(now - DAY, RL(10, r5, 20, curEnd))
    ].join('\n') + '\n');
    process.env.DB_PATH = path.join(tmpDir, 'tracker.db');
    process.env.CLAUDE_DIR = path.join(tmpDir, 'claude');
    process.env.CODEX_DIR = path.join(tmpDir, 'codex');
    process.env.ANTIGRAVITY_DIR = path.join(tmpDir, 'antigravity');
    for (const m of ['../lib/config', '../lib/db', '../lib/aggregator', '../server']) delete require.cache[require.resolve(m)];
    const port = 16010 + Math.floor(Math.random() * 1000);
    baseUrl = `http://localhost:${port}`;
    serverInstance = await require('../server').startServer(port);
  });

  afterAll(() => {
    if (serverInstance) serverInstance.close();
    try { require('../lib/watcher').stop(); } catch { /* not started */ }
    try { require('../lib/db').closeDB(); } catch { /* closed */ }
    for (const k of ['DB_PATH', 'CLAUDE_DIR', 'CODEX_DIR', 'ANTIGRAVITY_DIR']) delete process.env[k];
    for (const m of ['../lib/config', '../lib/db', '../lib/aggregator', '../server']) delete require.cache[require.resolve(m)];
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  async function codexView() {
    for (let i = 0; i < 40; i++) {
      const { body } = await get('/api/usage-limits');
      if (body.codex && body.codex.status === 'ok') return body.codex;
      await new Promise(r => setTimeout(r, 100));
    }
    throw new Error('codex view never left loading');
  }

  it('weekly Codex limit: forecast from the previous window', async () => {
    const v = await codexView();
    const week = v.data.limits.find(l => l.id === 'codex:10080');
    expect(week.forecast.basis).toBe('snapshots');
    expect(week.forecast.atReset.median).toBe(70);     // 20 + (60 − 10)
    expect(week.forecast.status).toBe('reserve');
    expect(week.forecast.series.ghosts).toHaveLength(1);
  });

  it('5-hour Codex limit: linear, no series', async () => {
    const v = await codexView();
    const s = v.data.limits.find(l => l.id === 'codex:300');
    expect(s.forecast.basis).toBe('linear');
    expect(s.forecast.series).toBeNull();
  });

  it('Antigravity carries no forecast and Claude stays off under the test runner', async () => {
    const { body } = await get('/api/usage-limits');
    expect(body.claude).toEqual({ enabled: false });
    expect(JSON.stringify(body.antigravity)).not.toContain('forecast');
  });
});
```

Erwartungen hinter `atReset.median = 70`: Vorfenster `[prevEnd−7d, prevEnd)`, Bezugspunkt `= Vorfenster-Start + (now − Fensterstart) = now − 7 d` → Wert dort 10 (Punkt bei −7,5 d), am Ende 60 → +50; aktueller Wert 20.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run test/claude-usage.test.js test/aggregator.test.js test/usage-forecast-service.test.js test/usage-forecast-api.test.js`
Expected: FAIL (onData nie aufgerufen, `getCostPoints`/Modul fehlt, `forecast` undefined).

- [ ] **Step 3: Implement**

`lib/claude-usage.js`, in `_run()` direkt nach der `saveCache`-Zeile:

```js
    try { deps.onData && deps.onData(data, state.fetchedAt); } catch { /* a listener never breaks the poller */ }
```

`createDefaultPoller` bekommt `opts`:

```js
function createDefaultPoller(db, opts = {}) {
  return createPoller({
    intervalMs: intervalFromEnv(process.env.CLAUDE_USAGE_POLL_MINUTES),
    readToken: () => readToken(),
    request: requestUsage,
    loadCache: () => {
      const v = db.getMetadata(CACHE_KEY);
      return v ? JSON.parse(v) : null;
    },
    saveCache: (c) => db.setMetadata(CACHE_KEY, JSON.stringify(c)),
    onData: opts.onData,
    log: (msg) => console.warn(msg)
  });
}
```

`lib/aggregator.js`, als Methode der `Aggregator`-Klasse (neben den übrigen `get…`-Methoden):

```js
  /**
   * Claude message costs as [[ms, usd], …] since `sinceMs` (optional model
   * filter), plus `firstMs` — when this user's Claude history starts, which
   * tells the forecast how many past weeks are complete.
   */
  getCostPoints(sinceMs, match = null) {
    const points = [];
    let firstMs = null;
    for (const msg of this._messageById.values()) {
      if ((msg.provider || 'claude') !== 'claude') continue;
      if (firstMs === null || msg._ms < firstMs) firstMs = msg._ms;
      if (msg._ms < sinceMs) continue;
      if (match && !match(msg.model || '')) continue;
      points.push([msg._ms, msg._cost]);
    }
    return { points, firstMs };
  }
```

`lib/usage-forecast-service.js`:

```js
// Wires the pure forecast (lib/usage-forecast.js) to its data: the user's
// aggregator (Claude cost history), the usage_snapshots table and — locally —
// Codex's own log series. One result per user is cached for 60 s and reused
// while no limit value changed.

const { attachForecasts, snapshotsFromView, makeCostIndex, DAY } = require('./usage-forecast');

const HISTORY_MS = 36 * DAY;  // the running week, 4 past weeks and slack
const CACHE_MS = 60 * 1000;

function _signature(views) {
  const parts = [];
  for (const p of ['claude', 'codex']) {
    const v = views && views[p];
    const ls = v && v.data && Array.isArray(v.data.limits) ? v.data.limits : [];
    for (const l of ls) parts.push(`${p}:${l.id}:${l.percentUsed}:${l.resetsAt}:${l.reset ? 1 : 0}`);
  }
  return parts.join('|');
}

function createForecastService(deps) {
  const now = deps.now || Date.now;
  const cache = new Map();

  function attach({ userId, cacheKey, views, aggregator }) {
    const t = now();
    const sig = _signature(views);
    const hit = cache.get(cacheKey);
    if (hit && hit.sig === sig && t - hit.at < CACHE_MS) return hit.out;

    const since = t - HISTORY_MS;
    const costs = new Map();
    const ctx = {
      now: t,
      costIndexFor(scopeLabel) {
        const key = scopeLabel || '';
        if (costs.has(key)) return costs.get(key);
        let res = aggregator.getCostPoints(since);
        let mapped = true;
        if (scopeLabel) {
          const needle = scopeLabel.toLowerCase();
          const scoped = aggregator.getCostPoints(since,
            (model) => String(deps.getModelLabel(model) || model).toLowerCase().includes(needle));
          if (scoped.points.length) res = scoped;
          else mapped = false;
        }
        const coverageFrom = res.firstMs === null ? Infinity : Math.max(since, res.firstMs);
        const r = { index: makeCostIndex(res.points, coverageFrom), mapped };
        costs.set(key, r);
        return r;
      },
      snapshotsFor: (provider, limitId) => deps.getSnapshots(userId, provider, limitId, since),
      seriesFor: (limitId, windowMinutes) => (deps.codexSeries
        ? deps.codexSeries(`${limitId}:${windowMinutes}`)
        : deps.getSnapshots(userId, 'codex', `${limitId}:${windowMinutes}`, since))
    };
    const out = attachForecasts(views, ctx);
    cache.set(cacheKey, { at: t, sig, out });
    return out;
  }

  function record(userId, provider, view) {
    for (const s of snapshotsFromView(view)) {
      try { deps.recordSnapshot(userId, provider, s.limitId, s.at, s.percent, s.resetsAt); } catch { /* best effort */ }
    }
  }

  return { attach, record };
}

module.exports = { createForecastService, HISTORY_MS, CACHE_MS };
```

`server.js`:
1. Bei den `require`s: `const usageForecastService = require('./lib/usage-forecast-service');` und sicherstellen, dass `getModelLabel` aus `./lib/pricing` importiert ist (falls nicht, in die bestehende Destrukturierung von `require('./lib/pricing')` aufnehmen); `recordUsageSnapshot, getUsageSnapshots` in die bestehende Destrukturierung von `require('./lib/db')` aufnehmen.
2. Den Poller-Aufruf ändern:

```js
const usagePoller = CLAUDE_USAGE_ENABLED
  ? claudeUsage.createDefaultPoller(require('./lib/db'), {
    // Local snapshots for the forecast's calibration (numbers only).
    onData: (data, at) => forecastService.record(0, 'claude', { enabled: true, data, fetchedAt: new Date(at).toISOString() })
  })
  : null;
```

3. Direkt nach `const antigravityLimits = …`:

```js
// Pace and forecast for the usage limits (lib/usage-forecast-service.js).
// Locally Codex's own log series is the history; hosted, the snapshots the
// sync agents' reports leave in usage_snapshots.
const forecastService = usageForecastService.createForecastService({
  getSnapshots: (userId, provider, limitId, sinceMs) => getUsageSnapshots(userId, provider, limitId, sinceMs),
  recordSnapshot: recordUsageSnapshot,
  codexSeries: codexLimits ? (key) => codexLimits.series(key) : null,
  getModelLabel
});
```

(`onData` feuert erst nach `startServer()`, also nach dieser Zeile — keine TDZ.)

4. Im Sync-Handler, im `if (hasUsageLimits) { try { … } }`-Block nach `setMetadata(key, JSON.stringify(merged));`:

```js
          for (const p of ['claude', 'codex']) {
            forecastService.record(syncUser.id, p, usageLimitsStore.sanitizeView(body.usageLimits[p]));
          }
```

5. Die Route `/api/usage-limits` ersetzen durch:

```js
  if (pathname === '/api/usage-limits' && req.method === 'GET') {
    let views;
    let userId = 0;
    let agg = aggregator;
    if (MULTI_USER) {
      // Hosted: what this user's own sync agents reported, nothing read here.
      let stored = null;
      try { stored = JSON.parse(getMetadata(USAGE_LIMITS_KEY + user.id) || 'null'); } catch { stored = null; }
      views = usageLimitsStore.viewsFromStore(stored);
      userId = user.id;
      agg = aggregatorCache.get(user.id, null);
    } else {
      const off = { enabled: false };
      views = {
        claude: usagePoller ? usagePoller.view() : off,
        codex: codexLimits ? codexLimits.view() : off,
        antigravity: antigravityLimits ? antigravityLimits.view() : off
      };
    }
    try {
      return sendJSON(res, forecastService.attach({ userId, cacheKey: 'u' + userId, views, aggregator: agg }));
    } catch (e) {
      console.error('Usage forecast failed:', e.message);
      return sendJSON(res, views);
    }
  }
```

`docs/ARCHITECTURE.md` Modultabelle, nach der Zeile für `lib/usage-forecast.js`:

```markdown
| `lib/usage-forecast-service.js` | Wires the forecast to the user's aggregator (Claude costs, per-model filter for scoped weekly limits), `usage_snapshots` and Codex's log series; 60-s cache per user; records snapshots from the local poller and from sync reports. |
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run`
Expected: PASS (außer den beiden Badge-Tests, die erst in Task 8 nachgezogen werden). `npm run lint` ohne Fehler.

- [ ] **Step 5: Mutation probes**
- Poller: die neue `onData`-Zeile entfernen (onData-Test rot)
- Service: `if (scoped.points.length) res = scoped;` → `if (false) res = scoped;` (Scope-Test rot: k gleich)
- Service: `hit.sig === sig &&` entfernen (Cache-Test „recomputes when a value changes" rot)
- Server: im Sync-Handler die `forecastService.record`-Schleife entfernen — muss von einem Test gefangen werden; falls keiner rot wird, in `test/multi-user-api.test.js` (dessen Hilfsfunktionen für Sync mit API-Schlüssel benutzen) einen Test ergänzen: POST `/api/sync` mit `usageLimits.claude` (ein `weekly_all` mit `percentUsed: 12`, `resetsAt` in 3 Tagen, `fetchedAt` jetzt) → danach `getUsageSnapshots(userId, 'claude', 'weekly_all', 0)` hat eine Zeile mit `percent: 12`.

- [ ] **Step 6: Commit**

```bash
git add lib/claude-usage.js lib/aggregator.js lib/usage-forecast-service.js server.js docs/ARCHITECTURE.md test/claude-usage.test.js test/aggregator.test.js test/usage-forecast-service.test.js test/usage-forecast-api.test.js test/multi-user-api.test.js
git commit -m "feat(usage): attach the forecast to /api/usage-limits and record snapshots"
```

---

### Task 6: Oberfläche Ebene 1 — Text, Balken, Töne, Chips

**Files:**
- Modify: `public/js/app.js` (Helfer + `_usageBarRow` + `_usageProviderGroup` + `_renderUsageChip`)
- Modify: `public/js/i18n.js` (Schlüssel `fc*` in `LANG.en` und `LANG.de`)
- Modify: `public/css/style.css`
- Create: `test/usage-forecast-ui.test.js`

**Interfaces:**
- Consumes: `forecast`-Objekt (Task 2).
- Produces (globale Funktionen in `app.js`):
  - `usageForecastSummary(f) → { text, tone: 'ok'|'warn'|'danger'|'' }`
  - `usageBarParts(pct, f) → { used, plan: number|null, forecastTo: number|null, overflow: boolean }`
  - `usageWorstTone(view) → 'danger'|'warn'|''`
  - `usageFcNotes(f) → string[]`

- [ ] **Step 1: Write the failing tests**

`test/usage-forecast-ui.test.js`:

```js
const fs = require('fs');
const path = require('path');
const { loadFrontend } = require('./helpers/frontend');

const W = { start: '2026-10-03T23:00:00.000Z', end: '2026-10-10T23:00:00.000Z' };
const fc = (o = {}) => ({
  version: 1, basis: 'calibrated', confidence: 'good', status: 'reserve', window: W, now: '2026-10-06T23:00:00.000Z',
  pace: { planPercent: 42.9, deltaPoints: -7.4 }, atReset: { median: 78.4, low: 61, high: 96.2 },
  exhaustsAt: null, k: 0.01, notes: [], series: null, ...o
});

describe('usage forecast — UI helpers', () => {
  let F;
  beforeEach(() => { F = loadFrontend(); F.setLang('de'); });

  it('reserve: points of reserve and the value at reset', () => {
    expect(F.usageForecastSummary(fc())).toEqual({ text: '7 Punkte Reserve · voraussichtlich 78 % beim Reset', tone: 'ok' });
  });

  it('ahead, on plan, rough', () => {
    expect(F.usageForecastSummary(fc({ status: 'ahead', pace: { planPercent: 40, deltaPoints: 8.2 } })).text).toMatch(/^8 Punkte voraus · /);
    expect(F.usageForecastSummary(fc({ status: 'ahead', pace: { planPercent: 40, deltaPoints: 8.2 } })).tone).toBe('warn');
    expect(F.usageForecastSummary(fc({ pace: { planPercent: 40, deltaPoints: 0.4 } })).text).toMatch(/^genau im Plan/);
    expect(F.usageForecastSummary(fc({ confidence: 'rough' })).text).toMatch(/ · grobe Schätzung$/);
  });

  it('exhausts in a weekly window: weekday and rounded time in Berlin, with the range', () => {
    const r = F.usageForecastSummary(fc({
      status: 'exhausts', atReset: { median: 130, low: 90, high: 170 },
      exhaustsAt: { median: '2026-10-08T12:17:00Z', early: '2026-10-07T20:02:00Z', late: '2026-10-09T07:00:00Z' }
    }));
    expect(r.tone).toBe('danger');
    expect(r.text).toContain('leer Do ~14:20');
    expect(r.text).toContain('(Mi ~22:00 – Fr ~09:00)');
  });

  it('exhausts in a 5-hour window: duration instead of a date', () => {
    const r = F.usageForecastSummary(fc({
      status: 'exhausts', window: { start: '2026-10-06T20:00:00Z', end: '2026-10-07T01:00:00Z' },
      now: '2026-10-06T23:00:00Z', exhaustsAt: { median: '2026-10-07T00:40:00Z', early: null, late: null }
    }));
    expect(r.text).toContain('leer in ~1:40 h');
  });

  it('idle, too early, unknown', () => {
    expect(F.usageForecastSummary(fc({ status: 'idle', atReset: null })).text).toBe('noch nichts verbraucht');
    expect(F.usageForecastSummary(fc({ basis: 'none', atReset: null, notes: ['too_early'], pace: { planPercent: 5, deltaPoints: 0 } })).text)
      .toBe('genau im Plan · noch zu früh für eine Prognose');
    expect(F.usageForecastSummary(fc({ status: 'unknown', pace: null }))).toEqual({ text: '', tone: '' });
    expect(F.usageForecastSummary(undefined)).toEqual({ text: '', tone: '' });
  });

  it('bar parts: plan tick, hatched forecast, overflow cap', () => {
    expect(F.usageBarParts(30, fc())).toEqual({ used: 30, plan: 42.9, forecastTo: 78.4, overflow: false });
    expect(F.usageBarParts(30, fc({ atReset: { median: 130, low: 90, high: 170 } }))).toEqual({ used: 30, plan: 42.9, forecastTo: 100, overflow: true });
    expect(F.usageBarParts(30, null)).toEqual({ used: 30, plan: null, forecastTo: null, overflow: false });
    expect(F.usageBarParts(30, fc({ status: 'unknown' })).plan).toBeNull();
  });

  it('worst tone of a provider', () => {
    const v = (...fs) => ({ enabled: true, data: { limits: fs.map(f => ({ forecast: f })) } });
    expect(F.usageWorstTone(v(fc(), fc({ status: 'ahead' })))).toBe('warn');
    expect(F.usageWorstTone(v(fc({ status: 'ahead' }), fc({ status: 'exhausts' })))).toBe('danger');
    expect(F.usageWorstTone(v(fc()))).toBe('');
    expect(F.usageWorstTone({ enabled: false })).toBe('');
  });

  it('notes in plain words', () => {
    expect(F.usageFcNotes(fc({ basis: 'linear', notes: ['chat_invisible', 'scope_unmapped'] }))).toEqual([
      'lineare Hochrechnung',
      'Chat-Nutzung auf claude.ai fließt nur über den Kalibrierfaktor ein',
      'Modell nicht zuordenbar — alle Claude-Kosten verwendet'
    ]);
  });

  it('every fc key exists in both languages', () => {
    const { LANG } = F.pick(['LANG']);
    const de = Object.keys(LANG.de).filter(k => k.startsWith('fc')).sort();
    const en = Object.keys(LANG.en).filter(k => k.startsWith('fc')).sort();
    expect(de).toEqual(en);
    expect(de.length).toBeGreaterThanOrEqual(20);
  });
});

describe('usage forecast — bar markup', () => {
  const app = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'app.js'), 'utf8');
  it('the bar row draws the plan tick and the hatched forecast from usageBarParts', () => {
    const fn = app.slice(app.indexOf('function _usageBarRow('), app.indexOf('function _usageProviderGroup('));
    expect(fn).toMatch(/usageBarParts\(/);
    expect(fn).toMatch(/plan-usage-fc-plan/);
    expect(fn).toMatch(/plan-usage-fc-hatch/);
  });
  it('the header chip takes the provider\'s worst forecast tone', () => {
    const fn = app.slice(app.indexOf('function _renderUsageChip('), app.indexOf('function renderUsageLimits('));
    expect(fn).toMatch(/usageWorstTone\(view\)/);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run test/usage-forecast-ui.test.js`
Expected: FAIL — `F.usageForecastSummary is not a function`.

- [ ] **Step 3: Implement**

`public/js/i18n.js` — in `LANG.en` (bei den `usage*`-Schlüsseln):

```js
    fcReserve: '{0} points in reserve',
    fcAhead: '{0} points ahead of plan',
    fcOnPlan: 'right on plan',
    fcAtReset: 'about {0} % at reset',
    fcEmptyAt: 'runs out {0}',
    fcEmptyRange: '({0} – {1})',
    fcEmptyIn: 'runs out in ~{0}',
    fcTooEarly: 'too early to forecast',
    fcIdle: 'nothing used yet',
    fcRough: 'rough estimate',
    fcChartToggle: 'History & forecast',
    fcLegendActual: 'Actual',
    fcLegendMeasured: 'measured',
    fcLegendPlan: 'Plan',
    fcLegendForecast: 'Forecast',
    fcLegendBand: 'Range of past weeks',
    fcLegendGhost: 'Past weeks',
    fcNow: 'now',
    fcEmptyMarker: 'runs out',
    fcLinearNote: 'linear projection',
    fcNoteChat: 'Chat use on claude.ai only enters through the calibration factor',
    fcNoteScope: 'Model not matched — using all Claude costs',
    fcNoteFewWeeks: 'only one past week to compare',
```

in `LANG.de`:

```js
    fcReserve: '{0} Punkte Reserve',
    fcAhead: '{0} Punkte voraus',
    fcOnPlan: 'genau im Plan',
    fcAtReset: 'voraussichtlich {0} % beim Reset',
    fcEmptyAt: 'leer {0}',
    fcEmptyRange: '({0} – {1})',
    fcEmptyIn: 'leer in ~{0}',
    fcTooEarly: 'noch zu früh für eine Prognose',
    fcIdle: 'noch nichts verbraucht',
    fcRough: 'grobe Schätzung',
    fcChartToggle: 'Verlauf & Prognose',
    fcLegendActual: 'Ist',
    fcLegendMeasured: 'gemessen',
    fcLegendPlan: 'Plan',
    fcLegendForecast: 'Prognose',
    fcLegendBand: 'Spanne der Vorwochen',
    fcLegendGhost: 'Vorwochen',
    fcNow: 'jetzt',
    fcEmptyMarker: 'leer',
    fcLinearNote: 'lineare Hochrechnung',
    fcNoteChat: 'Chat-Nutzung auf claude.ai fließt nur über den Kalibrierfaktor ein',
    fcNoteScope: 'Modell nicht zuordenbar — alle Claude-Kosten verwendet',
    fcNoteFewWeeks: 'nur eine Vorwoche zum Vergleich',
```

`public/js/app.js` — nach `usageStatusText` einfügen:

```js
// --- Usage forecast (pace, value at reset, when a limit runs out) ---

/** "Do ~14:20" in Europe/Berlin, minutes rounded to 10. */
function _fcWhen(iso) {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return '?';
  const r = Math.round(ms / 600000) * 600000;
  const lang = currentLang === 'de' ? 'de-DE' : 'en-GB';
  const parts = new Intl.DateTimeFormat(lang, {
    timeZone: USAGE_TZ, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date(r));
  const get = (type) => (parts.find(p => p.type === type) || {}).value || '';
  return get('weekday').replace('.', '') + ' ~' + get('hour') + ':' + get('minute');
}

/** "1:40 h" */
function _fcDuration(ms) {
  const min = Math.max(0, Math.round(ms / 60000));
  return Math.floor(min / 60) + ':' + String(min % 60).padStart(2, '0') + ' h';
}

function usageForecastSummary(f) {
  if (!f || f.status === 'unknown' || !f.pace) return { text: '', tone: '' };
  const lang = currentLang === 'de' ? 'de-DE' : 'en-US';
  const n = (v) => Math.round(Math.abs(v)).toLocaleString(lang);
  const parts = [];
  const d = f.pace.deltaPoints;
  if (f.status === 'idle') parts.push(t('fcIdle'));
  else parts.push(d <= -1 ? t('fcReserve').replace('{0}', n(d)) : d >= 1 ? t('fcAhead').replace('{0}', n(d)) : t('fcOnPlan'));
  const lenMs = Date.parse(f.window && f.window.end) - Date.parse(f.window && f.window.start);
  const ex = f.exhaustsAt;
  if (ex && ex.median) {
    if (lenMs < 86400000) {
      parts.push(t('fcEmptyIn').replace('{0}', _fcDuration(Date.parse(ex.median) - Date.parse(f.now))));
    } else {
      let s = t('fcEmptyAt').replace('{0}', _fcWhen(ex.median));
      if (ex.early && ex.late && ex.early !== ex.late) {
        s += ' ' + t('fcEmptyRange').replace('{0}', _fcWhen(ex.early)).replace('{1}', _fcWhen(ex.late));
      }
      parts.push(s);
    }
  } else if (f.atReset && f.status !== 'idle') {
    parts.push(t('fcAtReset').replace('{0}', n(f.atReset.median)));
  } else if (Array.isArray(f.notes) && f.notes.includes('too_early')) {
    parts.push(t('fcTooEarly'));
  }
  if (f.confidence === 'rough' && parts.length > 1) parts.push(t('fcRough'));
  const tone = f.status === 'exhausts' ? 'danger' : f.status === 'ahead' ? 'warn'
    : (f.status === 'reserve' || f.status === 'idle') ? 'ok' : '';
  return { text: parts.join(' · '), tone };
}

function usageBarParts(pct, f) {
  const used = typeof pct === 'number' ? Math.max(0, Math.min(pct, 100)) : 0;
  const live = f && f.status !== 'unknown';
  const plan = live && f.pace ? Math.max(0, Math.min(100, f.pace.planPercent)) : null;
  const target = live && f.atReset && typeof f.atReset.median === 'number' ? f.atReset.median : null;
  return {
    used,
    plan,
    forecastTo: target === null ? null : Math.max(used, Math.min(target, 100)),
    overflow: target !== null && target > 100
  };
}

function usageWorstTone(view) {
  const ls = view && view.enabled && view.data && Array.isArray(view.data.limits) ? view.data.limits : [];
  if (ls.some(l => l.forecast && l.forecast.status === 'exhausts')) return 'danger';
  if (ls.some(l => l.forecast && l.forecast.status === 'ahead')) return 'warn';
  return '';
}

function usageFcNotes(f) {
  if (!f) return [];
  const out = [];
  if (f.basis === 'linear') out.push(t('fcLinearNote'));
  const notes = Array.isArray(f.notes) ? f.notes : [];
  if (notes.includes('chat_invisible')) out.push(t('fcNoteChat'));
  if (notes.includes('scope_unmapped')) out.push(t('fcNoteScope'));
  if (notes.includes('few_weeks')) out.push(t('fcNoteFewWeeks'));
  return out;
}
```

`_usageBarRow(l)` ersetzen durch:

```js
function _usageBarRow(l) {
  const pct = l ? l.percentUsed : null;
  const f = l ? l.forecast : null;
  const parts = usageBarParts(pct, f);
  const tone = usageForecastSummary(f).tone;
  const row = document.createElement('div');
  row.className = 'plan-usage-bar-row';
  const track = document.createElement('div');
  track.className = 'plan-usage-bar-container';
  const bar = document.createElement('div');
  const sev = usageSeverity(pct);
  bar.className = 'plan-usage-bar' + (sev ? ' ' + sev : '');
  bar.style.width = parts.used + '%';
  track.appendChild(bar);
  if (parts.forecastTo !== null && parts.forecastTo > parts.used) {
    const hatch = document.createElement('div');
    hatch.className = 'plan-usage-fc-hatch' + (tone && tone !== 'ok' ? ' ' + tone : '') + (parts.overflow ? ' overflow' : '');
    hatch.style.left = parts.used + '%';
    hatch.style.width = (parts.forecastTo - parts.used) + '%';
    track.appendChild(hatch);
  }
  if (parts.plan !== null) {
    const tick = document.createElement('div');
    tick.className = 'plan-usage-fc-plan';
    tick.style.left = parts.plan + '%';
    tick.title = t('fcLegendPlan') + ': ' + Math.round(parts.plan) + ' %';
    track.appendChild(tick);
  }
  const pctEl = document.createElement('div');
  pctEl.className = 'plan-usage-pct';
  pctEl.textContent = _usagePctText(l);
  row.append(track, pctEl);
  return row;
}
```

In `_usageProviderGroup` in der `for (const l of limits)`-Schleife nach `item.append(label, meta, _usageBarRow(l));`:

```js
    const sum = usageForecastSummary(l.forecast);
    if (sum.text) {
      const fcLine = document.createElement('div');
      fcLine.className = 'plan-usage-fc' + (sum.tone ? ' ' + sum.tone : '');
      fcLine.textContent = sum.text;
      item.appendChild(fcLine);
    }
```

In `_renderUsageChip` vor `chip.title = tip.join(' · ');`:

```js
  const fcTone = usageWorstTone(view);
  chip.classList.toggle('fc-warn', fcTone === 'warn');
  chip.classList.toggle('fc-danger', fcTone === 'danger');
```

`public/css/style.css` — `.plan-usage-bar-container` bekommt `position: relative;` und `overflow: visible;` (statt `hidden`; die Füllung behält ihre eigenen Rundungen). Dazu nach `.plan-usage-bar.danger …`:

```css
/* Forecast on the bar: hatched until the expected value at reset, a tick at the plan position */
.plan-usage-fc-hatch {
  position: absolute;
  top: 0;
  bottom: 0;
  background: repeating-linear-gradient(135deg,
    color-mix(in srgb, var(--accent) 55%, transparent) 0 3px, transparent 3px 6px);
  border-radius: 0 4px 4px 0;
}
.plan-usage-fc-hatch.warn { background: repeating-linear-gradient(135deg, color-mix(in srgb, var(--orange) 60%, transparent) 0 3px, transparent 3px 6px); }
.plan-usage-fc-hatch.danger { background: repeating-linear-gradient(135deg, color-mix(in srgb, var(--red) 60%, transparent) 0 3px, transparent 3px 6px); }
.plan-usage-fc-hatch.overflow::after {
  content: '';
  position: absolute;
  right: -2px;
  top: -3px;
  bottom: -3px;
  width: 4px;
  border-radius: 2px;
  background: var(--red);
}
.plan-usage-fc-plan {
  position: absolute;
  top: -3px;
  bottom: -3px;
  width: 2px;
  margin-left: -1px;
  border-radius: 1px;
  background: var(--text);
  opacity: 0.75;
}
.plan-usage-fc { font-size: 0.82em; color: var(--text-muted); margin-top: 4px; }
.plan-usage-fc.ok { color: var(--green); }
.plan-usage-fc.warn { color: var(--orange); }
.plan-usage-fc.danger { color: var(--red); font-weight: 600; }
.usage-chip.fc-warn { border-color: var(--orange); }
.usage-chip.fc-danger { border-color: var(--red); }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run test/usage-forecast-ui.test.js test/claude-usage-ui.test.js`
Expected: PASS. Schlägt die Wochentags-Erwartung `Do ~14:20` fehl: prüfen, dass `formatToParts` in Node `Do.` liefert (der Punkt wird entfernt) — nicht den Test aufweichen.

- [ ] **Step 5: Mutation probes**
- `d <= -1 ? … : d >= 1 ? …` → Vorzeichen tauschen (Reserve-Test rot)
- `Math.round(ms / 600000) * 600000` → `ms` (Text `~14:17`, Test rot)
- `Math.min(target, 100)` → `target` (Overflow-Test rot)
- in `_renderUsageChip` die `fc-danger`-Zeile entfernen (Markup-Pin rot)

- [ ] **Step 6: Commit**

```bash
git add public/js/app.js public/js/i18n.js public/css/style.css test/usage-forecast-ui.test.js
git commit -m "feat(ui): pace, forecast and run-out time on every usage bar"
```

---

### Task 7: Oberfläche Ebene 2 — Fenster-Grafik

**Files:**
- Modify: `public/js/charts.js` (`nightIntervals`, `buildUsageForecastConfig`, `USAGE_FC_PLUGIN`, `createUsageForecastChart`)
- Modify: `public/js/app.js` (Umschalter, Box, Canvas-Erhalt in `renderUsageLimits`)
- Modify: `public/css/style.css`
- Modify: `public/js/demo-data.js`
- Modify: `test/usage-forecast-ui.test.js`

**Interfaces:**
- Consumes: Task 2 (`forecast.series`), Task 6 (`usageFcNotes`).
- Produces:
  - `nightIntervals(startMs, endMs) → [fromMs, toMs][]` (22–7 Uhr Europe/Berlin)
  - `buildUsageForecastConfig(f, opts) → Chart.js-Konfiguration` (datasets tragen `_role`)
  - `createUsageForecastChart(canvasId, f)` (über `renderChart`)
  - `usageFcOpenKeys() → string[]`, `usageFcToggle(key) → boolean` (localStorage `usageForecastOpen`)

- [ ] **Step 1: Write the failing tests** (an `test/usage-forecast-ui.test.js` anhängen)

```js
describe('usage forecast — chart', () => {
  let F;
  beforeEach(() => { F = loadFrontend(); F.setLang('de'); });
  const series = {
    actual: [['2026-10-03T23:00:00.000Z', 0], ['2026-10-06T23:00:00.000Z', 30]],
    measured: [['2026-10-06T22:00:00.000Z', 29]],
    forecast: [['2026-10-07T23:00:00.000Z', 45, 40, 60], ['2026-10-10T23:00:00.000Z', 112, 90, 140]],
    ghosts: [{ start: '2026-09-26T23:00:00.000Z', points: [[0, 0], [10080, 80]] }]
  };

  it('night intervals cover 22:00–07:00 Berlin (summer time = UTC+2)', () => {
    const s = Date.parse('2026-10-06T12:00:00Z'), e = Date.parse('2026-10-07T12:00:00Z');
    expect(F.nightIntervals(s, e)).toEqual([[Date.parse('2026-10-06T20:00:00Z'), Date.parse('2026-10-07T05:00:00Z')]]);
  });

  it('builds plan, band, median, actual, measured, ghost and the run-out marker', () => {
    const f = fc({ status: 'exhausts', series, atReset: { median: 112, low: 90, high: 140 },
      exhaustsAt: { median: '2026-10-09T23:00:00.000Z', early: null, late: null } });
    const cfg = F.buildUsageForecastConfig(f, { reducedMotion: true });
    const roles = cfg.data.datasets.map(d => d._role);
    expect(roles).toEqual(['ghost', 'plan', 'bandHigh', 'bandLow', 'median', 'actual', 'measured', 'exhaust']);
    const by = (r) => cfg.data.datasets.find(d => d._role === r);
    expect(by('plan').data).toEqual([{ x: Date.parse(W.start), y: 0 }, { x: Date.parse(W.end), y: 100 }]);
    expect(by('median').data[0]).toEqual({ x: Date.parse('2026-10-06T23:00:00.000Z'), y: 30 });  // joins the actual line
    expect(by('bandLow').fill).toBe('-1');
    expect(by('ghost').data[1]).toEqual({ x: Date.parse(W.start) + 10080 * 60000, y: 80 });
    expect(cfg.options.scales.y.max).toBe(140);
    expect(cfg.options.scales.x.min).toBe(Date.parse(W.start));
    expect(cfg.options.animation).toBe(false);
    expect(cfg.options.plugins.usageFc.limit).toBe(100);
    expect(cfg.plugins[0].id).toBe('usageFc');
  });

  it('stays at a 0–100 axis while nothing goes above 100', () => {
    const cfg = F.buildUsageForecastConfig(fc({ series: { ...series, forecast: [['2026-10-10T23:00:00.000Z', 70, 60, 80]] } }), {});
    expect(cfg.options.scales.y.max).toBe(100);
    expect(cfg.data.datasets.some(d => d._role === 'exhaust')).toBe(false);
  });

  it('remembers open charts in localStorage', () => {
    expect(F.usageFcOpenKeys()).toEqual([]);
    expect(F.usageFcToggle('claude:weekly_all')).toBe(true);
    expect(F.usageFcOpenKeys()).toEqual(['claude:weekly_all']);
    expect(F.usageFcToggle('claude:weekly_all')).toBe(false);
    F.localStorage.setItem('usageForecastOpen', 'garbage');
    expect(F.usageFcOpenKeys()).toEqual([]);
  });
});

describe('usage forecast — chart wiring', () => {
  const app = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'app.js'), 'utf8');
  const charts = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'charts.js'), 'utf8');

  it("keeps the open chart's canvas across a rebuild and destroys closed ones", () => {
    const fn = app.slice(app.indexOf('function renderUsageLimits('), app.indexOf('async function loadPlanUsage('));
    expect(fn).toMatch(/querySelectorAll\('\.usage-fc-box'\)/);       // stash before clearing
    expect(fn.indexOf("querySelectorAll('.usage-fc-box')")).toBeLessThan(fn.indexOf("list.textContent = ''"));
    expect(fn).toMatch(/destroyChart\(/);
    expect(fn).toMatch(/createUsageForecastChart\(/);
  });

  it('draws through renderChart (in place, no new Chart per refresh)', () => {
    const fn = charts.slice(charts.indexOf('function createUsageForecastChart('));
    expect(fn.slice(0, 600)).toMatch(/renderChart\(/);
    expect(fn.slice(0, 600)).not.toMatch(/new Chart\(/);
  });
});
```

Falls `F.localStorage` im Sandbox-Objekt nicht direkt erreichbar ist: über `F.pick(['localStorage']).localStorage` gehen (siehe `test/helpers/frontend.js`).

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run test/usage-forecast-ui.test.js`
Expected: FAIL — `F.nightIntervals is not a function`.

- [ ] **Step 3: Implement**

`public/js/charts.js` (am Ende der Datei):

```js
// --- Usage forecast window chart (overview box, weekly limits) ---

const _FC_HOUR = 3600000;
const _FC_DAY = 24 * _FC_HOUR;
const _fcBerlinHour = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', hour: '2-digit', hourCycle: 'h23' });

/** [[from, to], …] of the hours 22:00–07:00 Europe/Berlin inside [startMs, endMs]. */
function nightIntervals(startMs, endMs) {
  const out = [];
  let cur = null;
  for (let t = Math.ceil(startMs / _FC_HOUR) * _FC_HOUR; t < endMs; t += _FC_HOUR) {
    const h = Number(_fcBerlinHour.format(new Date(t)));
    const night = h >= 22 || h < 7;
    if (night && !cur) cur = [t, Math.min(t + _FC_HOUR, endMs)];
    else if (night) cur[1] = Math.min(t + _FC_HOUR, endMs);
    else if (cur) { out.push(cur); cur = null; }
  }
  if (cur) out.push(cur);
  return out;
}

function _fcAlpha(hex, a) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || '');
  return m ? `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${a})` : hex;
}

function _fcTick(ms, withTime) {
  const lang = typeof currentLang !== 'undefined' && currentLang === 'de' ? 'de-DE' : 'en-GB';
  const o = withTime
    ? { timeZone: 'Europe/Berlin', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }
    : { timeZone: 'Europe/Berlin', weekday: 'short', hour: '2-digit', hourCycle: 'h23' };
  return new Intl.DateTimeFormat(lang, o).format(new Date(ms));
}

const USAGE_FC_PLUGIN = {
  id: 'usageFc',
  beforeDatasetsDraw(chart, _args, o) {
    const a = chart.chartArea;
    if (!o || !a) return;
    const { x, y } = chart.scales;
    const ctx = chart.ctx;
    ctx.save();
    ctx.fillStyle = o.nightFill;
    for (const [s, e] of o.nights || []) {
      const l = Math.max(a.left, x.getPixelForValue(s)), r = Math.min(a.right, x.getPixelForValue(e));
      if (r > l) ctx.fillRect(l, a.top, r - l, a.bottom - a.top);
    }
    const yl = y.getPixelForValue(o.limit);
    if (y.max > o.limit) { ctx.fillStyle = o.redFill; ctx.fillRect(a.left, a.top, a.right - a.left, yl - a.top); }
    ctx.strokeStyle = o.red;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(a.left, yl); ctx.lineTo(a.right, yl); ctx.stroke();
    if (Number.isFinite(o.now)) {
      const xn = x.getPixelForValue(o.now);
      ctx.strokeStyle = o.nowColor;
      ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.moveTo(xn, a.top); ctx.lineTo(xn, a.bottom); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = o.nowColor;
      ctx.font = '11px sans-serif';
      ctx.fillText(o.nowLabel, xn + 4, a.top + 12);
    }
    ctx.restore();
  },
  afterDatasetsDraw(chart, _args, o) {
    if (!o || !Number.isFinite(o.exhaustAt) || !chart.chartArea) return;
    const { x, y } = chart.scales;
    const ctx = chart.ctx;
    const px = x.getPixelForValue(o.exhaustAt), py = y.getPixelForValue(o.limit);
    ctx.save();
    ctx.fillStyle = o.red;
    ctx.font = '600 11px sans-serif';
    ctx.textAlign = px > chart.chartArea.right - 90 ? 'right' : 'left';
    ctx.fillText(o.exhaustLabel, px + (ctx.textAlign === 'right' ? -8 : 8), py - 8);
    ctx.restore();
  }
};

/** Chart.js config for one limit's window. Pure apart from t(); tested without a canvas. */
function buildUsageForecastConfig(f, opts = {}) {
  const s = f.series || {};
  const start = Date.parse(f.window.start), end = Date.parse(f.window.end), now = Date.parse(f.now);
  const accent = opts.accent || '#58a6ff', red = opts.red || '#f85149';
  const muted = opts.muted || 'rgba(139,148,158,0.55)';
  const pt = (r, i = 1) => ({ x: Date.parse(r[0]), y: r[i] });
  const fc = s.forecast || [];
  const actual = s.actual || [];
  const last = actual.length ? actual[actual.length - 1] : null;
  const peak = Math.max(100, ...fc.map(r => r[3]), ...actual.map(r => r[1]));
  const yMax = peak > 100 ? Math.min(150, Math.ceil(peak / 10) * 10) : 100;
  const ex = f.exhaustsAt && f.exhaustsAt.median ? Date.parse(f.exhaustsAt.median) : null;

  const datasets = [];
  for (const g of s.ghosts || []) {
    datasets.push({ label: t('fcLegendGhost'), _role: 'ghost', data: g.points.map(([off, v]) => ({ x: start + off * 60000, y: v })),
      borderColor: muted, borderWidth: 1, pointRadius: 0, fill: false });
  }
  datasets.push({ label: t('fcLegendPlan'), _role: 'plan', data: [{ x: start, y: 0 }, { x: end, y: 100 }],
    borderColor: muted, borderDash: [6, 4], borderWidth: 1.5, pointRadius: 0, fill: false });
  datasets.push({ label: t('fcLegendBand'), _role: 'bandHigh', data: fc.map(r => pt(r, 3)), borderWidth: 0, pointRadius: 0, fill: false });
  datasets.push({ label: t('fcLegendBand'), _role: 'bandLow', data: fc.map(r => pt(r, 2)), borderWidth: 0, pointRadius: 0,
    backgroundColor: _fcAlpha(accent, 0.16), fill: '-1' });
  datasets.push({ label: t('fcLegendForecast'), _role: 'median', data: [...(last ? [pt(last)] : []), ...fc.map(r => pt(r, 1))],
    borderColor: accent, borderDash: [5, 4], borderWidth: 2, pointRadius: 0, fill: false });
  datasets.push({ label: t('fcLegendActual'), _role: 'actual', data: actual.map(r => pt(r)),
    borderColor: accent, borderWidth: 2, pointRadius: 0, fill: false });
  datasets.push({ label: t('fcLegendMeasured'), _role: 'measured', data: (s.measured || []).map(r => pt(r)),
    showLine: false, pointRadius: 2.5, backgroundColor: accent, borderColor: accent });
  if (ex !== null) {
    datasets.push({ label: t('fcEmptyMarker'), _role: 'exhaust', data: [{ x: ex, y: 100 }],
      showLine: false, pointRadius: 5, backgroundColor: red, borderColor: red });
  }

  return {
    type: 'line',
    data: { datasets },
    plugins: [USAGE_FC_PLUGIN],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: opts.reducedMotion ? false : { duration: 400 },
      interaction: { mode: 'nearest', intersect: false },
      scales: {
        x: { type: 'linear', min: start, max: end,
          ticks: { stepSize: _FC_DAY, callback: (v) => _fcTick(v, false), color: muted, maxRotation: 0 },
          grid: { color: 'rgba(139,148,158,0.12)' } },
        y: { min: 0, max: yMax, ticks: { stepSize: 25, callback: (v) => v + ' %', color: muted },
          grid: { color: 'rgba(139,148,158,0.12)' } }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          filter: (item) => !['bandHigh', 'bandLow', 'ghost'].includes(item.dataset._role),
          callbacks: {
            title: (items) => (items.length ? _fcTick(items[0].parsed.x, true) : ''),
            label: (item) => item.dataset.label + ': ' + Math.round(item.parsed.y * 10) / 10 + ' %'
          }
        },
        usageFc: {
          nights: nightIntervals(start, end), now, limit: 100, red,
          redFill: _fcAlpha(red, 0.08), nightFill: 'rgba(127,127,127,0.07)', nowColor: muted,
          nowLabel: t('fcNow'), exhaustAt: ex, exhaustLabel: ex === null ? '' : t('fcEmptyMarker') + ' ' + _fcTick(ex, true)
        }
      }
    }
  };
}

function createUsageForecastChart(canvasId, f) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  const css = getComputedStyle(document.documentElement);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cfg = buildUsageForecastConfig(f, {
    reducedMotion: reduced,
    accent: css.getPropertyValue('--accent').trim() || undefined,
    red: css.getPropertyValue('--red').trim() || undefined
  });
  return renderChart(canvasId, canvas.getContext('2d'), cfg);
}
```

Hinweis: `getComputedStyle` gibt es im Test-Sandbox nicht — deshalb liegt die ganze Logik in `buildUsageForecastConfig`, und `createUsageForecastChart` wird in Tests nie aufgerufen.

`public/js/app.js` — nach `usageFcNotes`:

```js
const USAGE_FC_OPEN_KEY = 'usageForecastOpen';

function usageFcOpenKeys() {
  try {
    const v = JSON.parse(localStorage.getItem(USAGE_FC_OPEN_KEY) || '[]');
    return Array.isArray(v) ? v.filter(x => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function usageFcToggle(key) {
  const s = new Set(usageFcOpenKeys());
  if (s.has(key)) s.delete(key); else s.add(key);
  try { localStorage.setItem(USAGE_FC_OPEN_KEY, JSON.stringify([...s])); } catch { /* storage blocked */ }
  return s.has(key);
}

function _usageFcCanvasId(key) {
  return 'usage-fc-' + key.replace(/[^a-z0-9]+/gi, '-');
}

/** The chart box of one limit; reuses the stashed box (same canvas) when there is one. */
function _usageFcBox(key, f, rc) {
  let box = rc.stash.get(key);
  if (!box) {
    box = document.createElement('div');
    box.className = 'usage-fc-box';
    box.dataset.key = key;
    box.id = _usageFcCanvasId(key) + '-box';
    const wrap = document.createElement('div');
    wrap.className = 'usage-fc-canvas-wrap';
    const canvas = document.createElement('canvas');
    canvas.id = _usageFcCanvasId(key);
    canvas.setAttribute('role', 'img');
    wrap.appendChild(canvas);
    const legend = document.createElement('div');
    legend.className = 'usage-fc-legend';
    const notes = document.createElement('div');
    notes.className = 'usage-fc-notes';
    box.append(wrap, legend, notes);
  }
  const legend = box.querySelector('.usage-fc-legend');
  legend.textContent = '';
  const items = [['actual', t('fcLegendActual')], ['measured', t('fcLegendMeasured')], ['plan', t('fcLegendPlan')],
    ['median', t('fcLegendForecast')], ['band', t('fcLegendBand')]];
  if (f.series && f.series.ghosts && f.series.ghosts.length) items.push(['ghost', t('fcLegendGhost')]);
  for (const [role, text] of items) {
    const it = document.createElement('span');
    it.className = 'usage-fc-key usage-fc-key-' + role;
    it.textContent = text;
    legend.appendChild(it);
  }
  box.querySelector('.usage-fc-notes').textContent = usageFcNotes(f).join(' · ');
  box.querySelector('canvas').setAttribute('aria-label', usageForecastSummary(f).text);
  rc.used.add(key);
  rc.pending.push({ canvasId: box.querySelector('canvas').id, forecast: f });
  return box;
}
```

`_usageProviderGroup(provider, view, now)` → Signatur `_usageProviderGroup(provider, view, now, rc = null)`; in der Limit-Schleife das Erzeugen von `label` ersetzen durch:

```js
    const f = l.forecast;
    const key = provider + ':' + l.id;
    const chartable = rc && f && f.series && ((f.series.forecast && f.series.forecast.length) || (f.series.actual && f.series.actual.length));
    const open = chartable && usageFcOpenKeys().includes(key);
    const label = document.createElement(chartable ? 'button' : 'div');
    label.className = 'plan-usage-label' + (chartable ? ' plan-usage-fc-toggle' : '');
    label.textContent = usageRowLabel(provider, l);
    if (chartable) {
      label.type = 'button';
      label.setAttribute('aria-expanded', String(!!open));
      label.setAttribute('aria-controls', _usageFcCanvasId(key) + '-box');
      label.title = t('fcChartToggle');
      const caret = document.createElement('span');
      caret.className = 'active-collapse-caret';
      caret.setAttribute('aria-hidden', 'true');
      label.appendChild(caret);
      label.addEventListener('click', () => { usageFcToggle(key); renderUsageLimits(_usageLimits); });
    }
```

und am Ende der Schleife (nach der `fcLine`-Zeile aus Task 6):

```js
    if (open) item.appendChild(_usageFcBox(key, f, rc));
```

`renderUsageLimits` ersetzen durch:

```js
function renderUsageLimits(all, now = Date.now()) {
  const section = document.getElementById('plan-usage-section');
  const list = document.getElementById('plan-usage-list');
  const shown = USAGE_PROVIDERS.filter(p => all && all[p] && all[p].enabled);
  if (section) section.style.display = shown.length ? '' : 'none';
  initCollapsible(section, document.getElementById('plan-usage-toggle'), 'usageLimitsCollapsed');
  // Open charts survive the 60-s rebuild: their boxes (and canvases) are
  // stashed before the list is cleared and re-inserted, so renderChart updates
  // the same Chart in place instead of creating a new one.
  const rc = { stash: new Map(), used: new Set(), pending: [] };
  if (list) {
    for (const box of list.querySelectorAll('.usage-fc-box')) rc.stash.set(box.dataset.key, box);
    list.textContent = '';
    for (const p of shown) list.appendChild(_usageProviderGroup(p, all[p], now, rc));
  }
  for (const [key, box] of rc.stash) {
    if (!rc.used.has(key)) destroyChart(box.querySelector('canvas').id);
  }
  for (const job of rc.pending) {
    try { createUsageForecastChart(job.canvasId, job.forecast); } catch { /* a chart never breaks the box */ }
  }
  let anyChip = false;
  for (const p of USAGE_PROVIDERS) anyChip = _renderUsageChip(p, all ? all[p] : null, now) || anyChip;
  const chips = document.getElementById('usage-chips');
  if (chips) chips.style.display = anyChip ? '' : 'none';
}
```

`public/css/style.css` (nach dem Block aus Task 6):

```css
.plan-usage-fc-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0;
  min-height: 28px;
  background: none;
  border: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.plan-usage-fc-toggle:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; border-radius: 4px; }
.plan-usage-fc-toggle[aria-expanded="false"] .active-collapse-caret { transform: rotate(-90deg); }
.usage-fc-box { margin-top: 12px; }
.usage-fc-canvas-wrap { position: relative; height: 220px; }
.usage-fc-legend { display: flex; flex-wrap: wrap; gap: 6px 14px; margin-top: 8px; font-size: 0.78em; color: var(--text-muted); }
.usage-fc-key::before { content: ''; display: inline-block; width: 14px; height: 0; margin-right: 6px; vertical-align: middle; border-top: 2px solid var(--accent); }
.usage-fc-key-measured::before { width: 6px; height: 6px; border: none; border-radius: 50%; background: var(--accent); }
.usage-fc-key-plan::before, .usage-fc-key-median::before { border-top-style: dashed; }
.usage-fc-key-plan::before { border-top-color: var(--text-muted); }
.usage-fc-key-band::before { height: 8px; border: none; background: color-mix(in srgb, var(--accent) 20%, transparent); }
.usage-fc-key-ghost::before { border-top: 1px solid var(--text-muted); }
.usage-fc-notes { margin-top: 4px; font-size: 0.76em; color: var(--text-muted); }
.usage-fc-notes:empty { display: none; }
@media (max-width: 600px) {
  .usage-fc-canvas-wrap { height: 180px; }
}
@media (prefers-reduced-motion: reduce) {
  .plan-usage-fc-toggle .active-collapse-caret { transition: none; }
}
```

`public/js/demo-data.js` — vor `const claudeUsageData = {` eine Fabrik:

```js
  // Synthetic forecast for the demo (shape = /api/usage-limits forecast v1).
  function demoForecast(pct, daysLeft, perDay, status) {
    const HOUR = 3600000, DAY = 24 * HOUR;
    const end = Date.now() + daysLeft * DAY, start = end - 7 * DAY, nowMs = Date.now();
    const iso = (ms) => new Date(ms).toISOString();
    const elapsedDays = (nowMs - start) / DAY;
    const actual = [];
    for (let t = start; t < nowMs; t += 6 * HOUR) actual.push([iso(t), Math.round(pct * (t - start) / (nowMs - start) * 10) / 10]);
    actual.push([iso(nowMs), pct]);
    const forecast = [];
    for (let t = nowMs + 6 * HOUR; t <= end; t += 6 * HOUR) {
      const inc = perDay * (t - nowMs) / DAY;
      forecast.push([iso(t), Math.round((pct + inc) * 10) / 10, Math.round((pct + inc * 0.7) * 10) / 10, Math.round((pct + inc * 1.3) * 10) / 10]);
    }
    const med = pct + perDay * daysLeft;
    const runOut = med >= 100 ? nowMs + ((100 - pct) / perDay) * DAY : null;
    return {
      version: 1, basis: 'calibrated', confidence: 'good', status,
      window: { start: iso(start), end: iso(end) }, now: iso(nowMs),
      pace: { planPercent: Math.round(elapsedDays / 7 * 1000) / 10, deltaPoints: Math.round((pct - elapsedDays / 7 * 100) * 10) / 10 },
      atReset: { median: Math.round(med * 10) / 10, low: Math.round((pct + perDay * daysLeft * 0.7) * 10) / 10, high: Math.round((pct + perDay * daysLeft * 1.3) * 10) / 10 },
      exhaustsAt: runOut ? { median: iso(runOut), early: iso(runOut - 0.4 * DAY), late: iso(runOut + 0.5 * DAY) } : null,
      k: 0.0123, notes: ['chat_invisible'],
      series: { actual, measured: actual.filter((_, i) => i % 2 === 1).slice(-6), forecast,
        ghosts: [{ start: iso(start - 7 * DAY), points: Array.from({ length: 29 }, (_, i) => [i * 360, Math.min(95, i * 3.2)]) }] }
    };
  }
```

und in `claudeUsageData.data.limits` den beiden Wochenlimits je ein Feld geben: `weekly_all` → `forecast: demoForecast(56, 4, 14, 'exhausts')`, `weekly_scoped:fable` → `forecast: demoForecast(41, 4, 7, 'reserve')`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run test/usage-forecast-ui.test.js test/claude-usage-ui.test.js` dann `npx vitest run` und `npm run lint`.
Expected: PASS (bis auf die Badge-Tests).

- [ ] **Step 5: Mutation probes**
- `rc.stash.set(...)`-Schleife entfernen (Wiring-Pin rot)
- `if (!rc.used.has(key)) destroyChart(...)` → ohne `destroyChart` (Pin rot)
- in `buildUsageForecastConfig` `fill: '-1'` → `fill: false` (Chart-Test rot)
- in `nightIntervals` `h >= 22 || h < 7` → `h >= 23 || h < 7` (Nacht-Test rot)

- [ ] **Step 6: Commit**

```bash
git add public/js/charts.js public/js/app.js public/css/style.css public/js/demo-data.js test/usage-forecast-ui.test.js
git commit -m "feat(ui): window chart with plan line, forecast band, past weeks and run-out marker"
```

---

### Task 8: Sichtprüfung, Doku, Version 0.8.0

**Files:**
- Modify: `docs/API.md` (Abschnitt „Usage limits": Feld `forecast` mit dem Vertrag aus dem Spec, Abschnitt „API-Vertrag" wörtlich), `CLAUDE.md` (Frontend-Notiz „Usage limits" + Modulnotizen für `lib/usage-forecast*.js` und `usage_snapshots`), `README.md`, `README_EN.md`, `README_DE.md` (Featurepunkt „Hochrechnung"), `CHANGELOG.md` (`## [0.8.0] — <Datum>`), `package.json` (+ `package-lock.json` via `npm i --package-lock-only`)

- [ ] **Step 1: Browser-Sichtprüfung** (lokal, `launchctl kickstart -k gui/$(id -u)/io.celox.token-tracker`, warten bis `curl -sf localhost:5010/api/usage-limits` 200 liefert)

Mit Playwright auf `http://localhost:5010/`, je Punkt messen statt schätzen:
1. Jede Claude-/Codex-Zeile hat einen `.plan-usage-fc-plan`-Strich an `left = planPercent %` (aus `/api/usage-limits` gegenrechnen) und, wo `atReset` existiert, eine Schraffur bis dorthin.
2. Klick auf ein Wochenlimit öffnet die Grafik; `chartInstances['usage-fc-…']` existiert; nach `await loadPlanUsage()` ist **dasselbe** Canvas-Element verbunden (`===`-Vergleich vor/nach) und es gibt keine zweite Instanz.
3. Zuklappen → Instanz ist zerstört (`chartInstances[id]` undefined).
4. Reload → geöffnete Grafik ist wieder offen.
5. `prefers-reduced-motion: reduce` emulieren → `chart.options.animation === false`.
6. 390 px Breite: Grafik 180 px hoch, kein horizontaler Überlauf (`document.documentElement.scrollWidth <= 390`).
7. Screenshot der offenen Grafik ansehen: Plan-Linie, Ist, Median gestrichelt, Band, Nachtstreifen, „jetzt"-Linie lesbar.
Gefundene Fehler: Test schreiben, fixen, erneut prüfen.

- [ ] **Step 2: Doku**

`CHANGELOG.md` oben:

```markdown
## [0.8.0] — 2026-10-05

### Added

- **Hochrechnung bei den Nutzungslimits.** Jede Claude- und Codex-Zeile zeigt,
  ob du im Plan liegst (Strich an der gleichmäßigen Position im Fenster) und wo
  du beim Reset voraussichtlich landest (schraffiert) — oder wann das Limit leer
  ist, mit Spanne. Die Kopfzeilen-Chips färben sich bernstein bzw. rot.
- **Fenster-Grafik für Wochenlimits.** Ein Klick auf die Zeile öffnet Ist-Verlauf,
  Plan-Linie, Prognose mit der Spanne der Vorwochen, die Vorwochen als blasse
  Linien und die Nachtstunden; der Zustand bleibt im Browser gespeichert.
- **So rechnet es:** Claude meldet nur ganze Prozent. Der Tracker schreibt die
  Werte mit (`usage_snapshots`, nur bei Änderung, 60 Tage) und eicht sie gegen
  deine eigenen Claude-Kosten (Prozentpunkte je USD); damit wird der Verlauf
  fein, und die Prognose spielt ab, was du in den letzten bis zu 4 Wochen im
  gleichen Abschnitt verbraucht hast. Codex bringt seinen Verlauf in den Logs
  mit. Ohne Vorwochen: lineare Hochrechnung, als „grobe Schätzung" markiert.
- `/api/usage-limits` liefert dafür je Limit ein Feld `forecast` (Version 1) —
  auch für Inspector Rust.
```

README-Abschnitte „Usage Limits" / „Nutzungslimits" je einen Punkt „Forecast" / „Hochrechnung" mit demselben Inhalt in zwei Sätzen; `README.md` Featureliste einen Halbsatz ergänzen. `docs/API.md` im Abschnitt „Usage limits" das `forecast`-Feld mit dem JSON-Block aus dem Spec dokumentieren.

- [ ] **Step 3: Version + Badges + volle Suite**

```bash
npm version 0.8.0 --no-git-tag-version
git add -A public lib server.js test docs CHANGELOG.md CLAUDE.md README*.md package.json package-lock.json
npx vitest run --reporter=json --outputFile=.r.json >/dev/null 2>&1; node scripts/update-badges.js --report .r.json; rm -f .r.json
git add README*.md
npx vitest run && npm run lint
```

Expected: alle Tests grün, 0 Lint-Fehler.

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(usage): forecast and pace for the usage limits — v0.8.0"
```

Push und Deploy (`bash scripts/deploy.sh`) **nur auf ausdrückliche Anweisung** des Nutzers.
