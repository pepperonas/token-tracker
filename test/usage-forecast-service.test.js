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
