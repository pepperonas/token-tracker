const {
  parseCheckSource, requirementsOf, resolveValue, progressFor, unitOf
} = require('../lib/achievement-progress');
const {
  ACHIEVEMENTS, WAVE_ADDED_AT, RATIO_KEY_RE, MIN_ACTIVE_DAYS_BY_TIER, getAchievementsResponse
} = require('../lib/achievements');

const ACTIVE = ACHIEVEMENTS.filter(a => !a.retired);

// A stats object with every counter at zero, plus whatever a scenario sets.
// modelMessagesOf is a function in the real stats, so calls are routed
// through a per-label table.
function makeStats(values = {}, calls = {}) {
  const base = {
    modelNames: [], toolNames: new Set(), toolCallsByName: {},
    modelMessages: { sonnet: 0, opus: 0, haiku: 0 },
    modelMessagesOf: label => calls[label] || 0
  };
  for (const [path, value] of Object.entries(values)) {
    const segs = path.split('.');
    let cur = base;
    for (const seg of segs.slice(0, -1)) cur = cur[seg] = cur[seg] || {};
    cur[segs[segs.length - 1]] = value;
  }
  return new Proxy(base, {
    get: (t, k) => (k in t ? t[k] : (typeof k === 'string' && k.startsWith('has') ? false : 0))
  });
}

function statsFor(parts, valueOf) {
  const values = {};
  const calls = {};
  parts.forEach((p, i) => {
    const v = valueOf(p, i);
    if (p.call) calls[p.call.arg] = v;
    else values[p.path.join('.')] = v;
  });
  return makeStats(values, calls);
}

// Deterministic pseudo-random numbers, so a failure is reproducible.
function rng(seed) {
  let x = seed >>> 0;
  return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 2 ** 32; };
}

describe('parseCheckSource', () => {
  it('reads a plain threshold', () => {
    expect(parseCheckSource('s => s.totalTokens >= 1_000_000'))
      .toEqual([{ path: ['totalTokens'], target: 1000000 }]);
  });

  it('reads a defaulted, bracketed path', () => {
    expect(parseCheckSource("s => (s.toolCallsByName['Read'] || 0) >= 50000"))
      .toEqual([{ path: ['toolCallsByName', 'Read'], target: 50000 }]);
    expect(parseCheckSource('s => (s.toolCallsByName.Read||0) >= 5'))
      .toEqual([{ path: ['toolCallsByName', 'Read'], target: 5 }]);
  });

  it('reads nested paths and model calls', () => {
    expect(parseCheckSource('s => s.modelMessages.opus >= 10'))
      .toEqual([{ path: ['modelMessages', 'opus'], target: 10 }]);
    expect(parseCheckSource("s => s.modelMessagesOf('Opus 5') >= 2000"))
      .toEqual([{ path: [], call: { fn: 'modelMessagesOf', arg: 'Opus 5' }, target: 2000 }]);
  });

  it('reads a conjunction and decimals', () => {
    expect(parseCheckSource('s => s.avgCacheRate >= 90.5 && s.totalTokens >= 2e6')).toEqual([
      { path: ['avgCacheRate'], target: 90.5 },
      { path: ['totalTokens'], target: 2000000 }
    ]);
  });

  it('refuses everything outside the grammar instead of guessing', () => {
    for (const src of [
      's => s.weekendWarrior',
      "s => s.toolNames.has('Read')",
      's => s.modelNames.some(m => /opus/i.test(m))',
      's => s.activeDays > 5 && (s.totalMessages / s.activeDays) >= 100',
      's => s.totalMessages > 0 && s.modelMessages.opus > s.totalMessages * 0.5',
      's => s.a >= 1 || s.b >= 1',
      's => s.totalTokens >= 0',
      's => s.totalTokens <= 10',
      'function () { return true; }'
    ]) {
      expect(parseCheckSource(src)).toBeNull();
    }
  });
});

describe('requirementsOf', () => {
  it('uses the declared wave-3 fields', () => {
    const ladder = ACTIVE.find(a => a.key === 'w3_four_week_1');
    expect(requirementsOf(ladder)).toEqual([{ path: ['weeksAtLeast4Days'], target: 42 }]);
    const combo = ACTIVE.find(a => a.key === 'w3_combo_roots_1');
    expect(requirementsOf(combo)).toEqual([
      { path: ['weeksAtLeast4Days'], target: 45 },
      { path: ['projectsAtLeast90Days'], target: 35 }
    ]);
  });

  it('names a target for nearly every active achievement', () => {
    const named = ACTIVE.filter(a => requirementsOf(a)).length;
    // Measured 2026-10-08: 1169 of 1224. The rest are booleans and ratios.
    expect(named).toBeGreaterThanOrEqual(1150);
  });

  // The load-bearing guarantee: a bar may never claim "done" while the real
  // check says no, nor the reverse. Every achievement that gets a target is
  // evaluated against its real predicate on boundary and random vectors.
  it('agrees with the real check for every achievement that gets a target', () => {
    const next = rng(20261008);
    let checked = 0;
    for (const ach of ACTIVE) {
      const parts = requirementsOf(ach);
      if (!parts) continue;
      const scenarios = [
        () => 0,
        p => p.target,
        p => p.target * 2,
        ...parts.map((_, k) => (p, i) => (i === k ? p.target - Math.max(1e-9, p.target * 1e-6) : p.target)),
        ...Array.from({ length: 6 }, () => p => p.target * next() * 2)
      ];
      for (const scenario of scenarios) {
        const stats = statsFor(parts, scenario);
        const expected = parts.every(p => resolveValue(stats, p) >= p.target);
        if (ach.check(stats) !== expected) {
          throw new Error(`${ach.key}: check=${ach.check(stats)} but progress says ${expected}`);
        }
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(10000);
  });
});

describe('resolveValue', () => {
  it('walks paths and calls without evaluating code', () => {
    const s = makeStats({ 'toolCallsByName.Read': 7 }, { 'Opus 5': 3 });
    expect(resolveValue(s, { path: ['toolCallsByName', 'Read'] })).toBe(7);
    expect(resolveValue(s, { path: [], call: { fn: 'modelMessagesOf', arg: 'Opus 5' } })).toBe(3);
  });

  it('reads anything missing or non-numeric as 0', () => {
    expect(resolveValue({}, { path: ['a', 'b', 'c'] })).toBe(0);
    expect(resolveValue({ a: 'x' }, { path: ['a'] })).toBe(0);
    expect(resolveValue({ a: NaN }, { path: ['a'] })).toBe(0);
    expect(resolveValue({}, { path: [], call: { fn: 'modelMessagesOf', arg: 'x' } })).toBe(0);
    expect(resolveValue(null, { path: ['a'] })).toBe(0);
  });
});

describe('progressFor', () => {
  const single = { key: 'x', tier: 'gold', check: s => s.totalTokens >= 1000 };
  const combo = { key: 'y', tier: 'gold', check: s => s.totalTokens >= 1000 && s.totalCost >= 10 };

  it('reports value, target and a floored percentage', () => {
    expect(progressFor(single, makeStats({ totalTokens: 999 })))
      .toEqual({ value: 999, target: 1000, pct: 99, metric: 'totalTokens', unit: 'int', parts: 1 });
  });

  it('clamps above the target and below zero', () => {
    expect(progressFor(single, makeStats({ totalTokens: 5000 })).pct).toBe(100);
    expect(progressFor(single, makeStats({ totalTokens: -5 })).pct).toBe(0);
  });

  it('describes the weakest of several conditions', () => {
    const p = progressFor(combo, makeStats({ totalTokens: 900, totalCost: 2 }));
    expect(p).toMatchObject({ value: 2, target: 10, pct: 20, metric: 'totalCost', unit: 'usd', parts: 2 });
  });

  it('holds a gated badge below 100 and names the missing active days', () => {
    const p = progressFor(single, makeStats({ totalTokens: 5000, activeDays: 4 }), { minActiveDays: 7 });
    expect(p.pct).toBe(99);
    expect(p.daysNeeded).toBe(3);
    const ok = progressFor(single, makeStats({ totalTokens: 5000, activeDays: 7 }), { minActiveDays: 7 });
    expect(ok.pct).toBe(100);
    expect(ok.daysNeeded).toBeUndefined();
  });

  it('returns null when no target can be named', () => {
    expect(progressFor({ key: 'z', check: s => s.weekendWarrior }, makeStats())).toBeNull();
  });

  it('knows the units the dashboard formats', () => {
    expect(unitOf('totalCost')).toBe('usd');
    expect(unitOf('avgCacheRate')).toBe('pct');
    expect(unitOf('codeToolDayShare')).toBe('share');
    expect(unitOf('totalActiveHours')).toBe('h');
    expect(unitOf('maxSessionActiveMin')).toBe('min');
    expect(unitOf('toolCallsByName.Read')).toBe('int');
  });
});

describe('waves and the response', () => {
  it('assigns every achievement a wave, with wave 3 exactly the w3_ keys', () => {
    for (const a of ACHIEVEMENTS) expect([1, 2, 3]).toContain(a.wave);
    const w3 = ACHIEVEMENTS.filter(a => a.wave === 3).map(a => a.key);
    expect(w3.length).toBe(74);
    expect(w3.every(k => k.startsWith('w3_'))).toBe(true);
    expect(ACHIEVEMENTS.find(a => a.key === 'tokens_1k').wave).toBe(1);
    expect(ACHIEVEMENTS.find(a => a.key === 'deep_hours_2k').wave).toBe(2);
    expect(ACHIEVEMENTS.find(a => a.key === 'cmb_scale_5').wave).toBe(2);
    expect(ACHIEVEMENTS.filter(a => a.wave === 2).length).toBe(500);
  });

  it('dates every wave after the first, so a new wave cannot ship undated', () => {
    for (const wave of new Set(ACHIEVEMENTS.map(a => a.wave))) {
      if (wave === 1) continue;
      expect(WAVE_ADDED_AT[wave]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('adds wave, addedAt and progress for locked achievements only', () => {
    const db = { getUnlockedAchievements: () => [{ achievement_key: 'tokens_1k', unlocked_at: '2026-01-01T00:00:00Z' }] };
    const stats = makeStats({ totalTokens: 5000, activeDays: 1 });
    const res = getAchievementsResponse(0, db, stats);
    const unlocked = res.find(a => a.key === 'tokens_1k');
    expect(unlocked.progress).toBeNull();
    expect(unlocked.wave).toBe(1);
    expect(unlocked.addedAt).toBeNull();
    const locked = res.find(a => a.key === 'tokens_10k');
    expect(locked.progress).toMatchObject({ value: 5000, target: 10000, pct: 50 });
    const w3 = res.find(a => a.key === 'w3_four_week_1');
    expect(w3).toMatchObject({ wave: 3, addedAt: '2026-10-07' });
  });

  it('passes the ratio gate through to the progress', () => {
    const ratio = ACTIVE.find(a => RATIO_KEY_RE.test(a.key) && requirementsOf(a));
    const db = { getUnlockedAchievements: () => [] };
    const res = getAchievementsResponse(0, db, makeStats({ activeDays: 1 }));
    const p = res.find(a => a.key === ratio.key).progress;
    expect(p.daysNeeded).toBe(MIN_ACTIVE_DAYS_BY_TIER[ratio.tier] - 1);
  });

  it('sends no progress without stats', () => {
    const res = getAchievementsResponse(0, { getUnlockedAchievements: () => [] });
    expect(res.every(a => a.progress === null)).toBe(true);
  });
});
