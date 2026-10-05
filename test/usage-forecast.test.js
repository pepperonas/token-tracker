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

  it('a drop inside one window restarts the walk instead of waiting to climb back', () => {
    // 10 → 5 → 8 in the same window: the step 5 → 8 is a valid 3-point pair.
    const s = [snap(0, 10), snap(1, 5), snap(4, 8)];
    const c = F.calibrate({ snapshots: s, costIndex: ix, pct: 8, window: W, now: W.start + 4 * HOUR });
    expect(c.pairs).toBe(1);
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
