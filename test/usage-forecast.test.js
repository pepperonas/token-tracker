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
    expect(f.series.ghosts).toHaveLength(1);
    expect(f.series.ghosts[0].points[1]).toEqual([6 * 24 * 60, 60]);   // minutes after the past window's start
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

describe('usage-forecast — review fixes', () => {
  const NOW = W.start + 3 * DAY;
  const noCost = { now: NOW, costIndexFor: () => ({ index: F.makeCostIndex([], Infinity), mapped: true }), snapshotsFor: () => [], seriesFor: () => [] };

  it('refuses a window that ends further away than its own length (untrusted sync input)', () => {
    // A hosted report with resetsAt in the year 9999 used to build ~3·10⁸ rows.
    const t0 = Date.now();
    const codex = F.forecastLimit('codex', { id: 'codex:x', limitId: 'codex', windowMinutes: 1e9, percentUsed: 50, resetsAt: '9999-01-01T00:00:00Z' }, noCost);
    const claude = F.forecastLimit('claude', { id: 'weekly_all', kind: 'weekly_all', percentUsed: 50, resetsAt: new Date(NOW + 30 * DAY).toISOString() }, noCost);
    expect(Date.now() - t0).toBeLessThan(200);
    expect(codex.status).toBe('unknown');
    expect(claude.status).toBe('unknown');
    expect(F.windowOf('codex', { windowMinutes: 1e9, resetsAt: '2026-10-10T23:00:00Z' })).toBeNull();
  });

  it('an exhausted limit is "exhausts" even in the first 10 % of its window', () => {
    const end = NOW + 4.8 * HOUR;     // 12 min into a 5-hour window: under 10 %
    const f = F.forecastLimit('claude', { id: 'session', kind: 'session', percentUsed: 100, resetsAt: new Date(end).toISOString() }, noCost);
    expect(f.status).toBe('exhausts');
    expect(f.exhaustsAt.median).toBe(new Date(NOW).toISOString());
  });

  it('reaching 100 exactly at the reset is not "runs out before the reset"', () => {
    const now = W.start + 3 * DAY;
    const b = F.forecastBands({ pct: 60, window: W, now, increments: [(tau) => 10 * (tau - now) / DAY], stepMs: HOUR });
    expect(b.atReset.median).toBe(100);
    expect(b.exhaustsAt).toBeNull();
  });

  it('codex: replays past windows by their own reset time, not by period (windows are not periodic)', () => {
    const r = W.start - 2 * DAY;          // a past window that ended two days before this one started
    const series = [
      { at: r - 6 * DAY, percent: 10, resetsAt: r },
      { at: r - 3 * DAY, percent: 30, resetsAt: r },
      { at: r - DAY, percent: 60, resetsAt: r },
      { at: W.start + DAY, percent: 20, resetsAt: W.end }   // the running window: never a "past" one
    ];
    const weeks = F.codexWeeks({ window: W, now: NOW, series });
    expect(weeks).toHaveLength(1);
    expect(weeks[0](W.end)).toBe(50);
    const f = F.forecastLimit('codex', { id: 'codex:10080', limitId: 'codex', windowMinutes: 10080, percentUsed: 20, resetsAt: new Date(W.end).toISOString() },
      { ...noCost, seriesFor: () => series });
    expect(f.basis).toBe('snapshots');
    expect(f.series.ghosts).toHaveLength(1);
    expect(f.series.ghosts[0].start).toBe(new Date(r - W.lenMs).toISOString());
  });

  it('the fallback k needs at least $1 of spend — cents would explode it', () => {
    const ix = F.makeCostIndex([[W.start + HOUR, 0.05]]);
    expect(F.calibrate({ snapshots: [], costIndex: ix, pct: 2, window: W, now: NOW }).k).toBeNull();
    const ok = F.makeCostIndex([[W.start + HOUR, 4]]);
    expect(F.calibrate({ snapshots: [], costIndex: ok, pct: 2, window: W, now: NOW }).k).toBeCloseTo(0.5, 5);
  });
});
