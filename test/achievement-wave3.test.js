const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { ACHIEVEMENTS, buildStats, checkAchievements } = require('../lib/achievements');

const wave3 = ACHIEVEMENTS.filter(a => a.wave === 3);
const active = ACHIEVEMENTS.filter(a => !a.retired);
const tierRank = { bronze: 0, silver: 1, gold: 2, platinum: 3, diamond: 4 };

function translations() {
  const source = fs.readFileSync(path.join(__dirname, '../public/js/i18n.js'), 'utf8');
  const context = vm.createContext({
    localStorage: { getItem: () => null },
    navigator: { language: 'de' },
    document: { querySelectorAll: () => [] }
  });
  vm.runInContext(source, context);
  return vm.runInContext('LANG', context);
}

function simpleThreshold(a) {
  if (a.wave === 3) return a.metric ? [a.metric, a.threshold] : null;
  const body = a.check.toString().replace(/^s\s*=>\s*/, '')
    .replace(/\[['"]([\w$]+)['"]\]/g, '.$1')
    .replace(/\|\|\s*0/g, '')
    .replace(/_/g, '').replace(/\s/g, '').replace(/[()]/g, '');
  const match = body.match(/^s\.([\w.]+)>=(\d+(?:\.\d+)?)$/);
  return match ? [match[1], Number(match[2])] : null;
}

describe('third achievement wave', () => {
  it('counts rhythm, code days, project age and deep multi-model sessions from actual activity', () => {
    const dates = ['2026-01-05','2026-01-06','2026-01-07','2026-01-08','2026-01-09',
      '2026-01-12','2026-01-13','2026-01-14','2026-01-15'];
    const daily = dates.map((date, i) => ({ date, messages: 2, linesWritten: i < 4 ? 100 : 0,
      toolCalls: i < 4 ? 5 : 0 }));
    const agg = {
      getOverview: () => ({}),
      getSessions: () => [
        { activeMin: 61, durationMin: 10000, models: ['a', 'b'] },
        { activeMin: 59, durationMin: 10000, models: ['a', 'b'] },
        { activeMin: 61, durationMin: 10000, models: ['a'] }
      ],
      getProjects: () => [
        { firstTs: '2025-01-01T00:00:00Z', lastTs: '2026-01-01T00:00:00Z' },
        { firstTs: '2025-10-01T00:00:00Z', lastTs: '2026-01-01T00:00:00Z' }
      ],
      getModels: () => [], getTools: () => [], getDaily: () => daily,
      getHourly: () => Array.from({ length: 24 }, (_, hour) => ({ hour, messages: 0 }))
    };
    const s = buildStats(agg);
    expect([s.weeksAtLeast4Days, s.weeksAtLeast5Days, s.longestFourDayWeekRun]).toEqual([2, 1, 2]);
    expect([s.monthsAtLeast15Days, s.monthsAtLeast20Days]).toEqual([0, 0]);
    expect([s.codeToolDayCount, s.codeToolWeeks, s.codeToolDayShare]).toEqual([4, 1, 4 / 9]);
    expect([s.maxProjectAgeDays, s.projectsAtLeast90Days, s.projectsAtLeast180Days, s.projectsAtLeast365Days])
      .toEqual([365, 2, 1, 1]);
    expect(s.deepMultiModelSessions).toBe(1);
  });

  it('has distinct active keys and translated names', () => {
    const lang = translations();
    expect(active).toHaveLength(1224);
    expect(wave3).toHaveLength(74);
    expect(new Set(ACHIEVEMENTS.map(a => a.key)).size).toBe(1274);
    for (const locale of ['en', 'de']) {
      const names = active.map(a => lang[locale][`ach_${a.key}`]);
      expect(names.every(Boolean)).toBe(true);
      expect(new Set(names.map(n => n.toLocaleLowerCase(locale))).size).toBe(active.length);
      expect(active.every(a => lang[locale][`ach_${a.key}_desc`])).toBe(true);
    }
  });

  it('keeps text numbers aligned with every wave-3 threshold', () => {
    const lang = translations();
    const hasNumber = (text, n) => new RegExp(`(^|\\D)${n}(?!\\d)`).test(text.replace(',', '.'));
    for (const a of wave3) {
      const values = a.requirements ? a.requirements.map(([, n]) => n) : [a.threshold];
      for (const locale of ['en', 'de']) {
        const text = lang[locale][`ach_${a.key}_desc`];
        for (const value of values) {
          expect(hasNumber(text, value < 1 ? value * 100 : value), `${locale} ${a.key}: ${text}`).toBe(true);
        }
      }
    }
  });

  it('keeps simple threshold tiers monotone across the active catalogue', () => {
    const byMetric = new Map();
    for (const a of active) {
      const parsed = simpleThreshold(a);
      if (!parsed) continue;
      const [metric, threshold] = parsed;
      if (!byMetric.has(metric)) byMetric.set(metric, []);
      byMetric.get(metric).push({ key: a.key, threshold, tier: tierRank[a.tier] });
    }
    for (const group of byMetric.values()) {
      group.sort((a, b) => a.threshold - b.threshold || a.tier - b.tier);
      for (let i = 1; i < group.length; i++) {
        if (group[i].threshold > group[i - 1].threshold) {
          expect(group[i].tier, `${group[i - 1].key} → ${group[i].key}`).toBeGreaterThanOrEqual(group[i - 1].tier);
        }
      }
    }
  });

  it('avoids provider copies and duplicate behavior on threshold probes', () => {
    const legacy = active.filter(a => a.wave !== 3);
    const newFields = new Set(wave3.flatMap(a => a.requirements ? a.requirements.map(([m]) => m) : [a.metric]));
    const oldSources = legacy.map(a => a.check.toString());
    for (const field of newFields) expect(oldSources.some(s => s.includes(`s.${field}`))).toBe(false);
    for (const a of wave3) {
      expect(a.check.toString()).not.toMatch(/provider|codex|claude|antigravity/i);
      const first = a.requirements ? a.requirements[0] : [a.metric, a.threshold];
      const second = a.requirements?.[1];
      const low = { activeDays: 1000, [first[0]]: first[1] - (first[1] < 1 ? .001 : 1) };
      const high = { ...low, [first[0]]: first[1] };
      if (second) { low[second[0]] = second[1]; high[second[0]] = second[1]; }
      expect(a.check(low), a.key).toBe(false);
      expect(a.check(high), a.key).toBe(true);
    }
  });

  it('keeps the measured 2026-10 snapshot below the five-percent unlock limit', () => {
    const baseline = {
      weeksAtLeast4Days: 37, weeksAtLeast5Days: 35, monthsAtLeast15Days: 8,
      monthsAtLeast20Days: 8, longestFourDayWeekRun: 37, codeToolDayCount: 223,
      codeToolDayShare: .9065, codeToolWeeks: 39, maxProjectAgeDays: 253,
      projectsAtLeast90Days: 30, projectsAtLeast180Days: 7, projectsAtLeast365Days: 0,
      deepMultiModelSessions: 233, activeDays: 246
    };
    expect(wave3.filter(a => a.check(baseline)).length).toBeLessThanOrEqual(Math.floor(wave3.length * .05));
  });

  it('requires a tier-sized active-day sample for wave-3 ratios', () => {
    const testDays = count => Array.from({ length: count }, (_, i) => ({
      date: `2026-01-${String(i + 1).padStart(2, '0')}`, messages: 1,
      linesWritten: 100, toolCalls: 5
    }));
    const agg = count => ({
      getOverview: () => ({}), getSessions: () => [], getProjects: () => [],
      getModels: () => [], getTools: () => [], getDaily: () => testDays(count),
      getHourly: () => Array.from({ length: 24 }, (_, hour) => ({ hour, messages: 0 }))
    });
    const db = { getUnlockedAchievements: () => [], unlockAchievementsBatch: () => {} };
    expect(checkAchievements(agg(1), 0, db)).not.toContain('w3_ratio_code_1');
    expect(checkAchievements(agg(7), 0, db)).toContain('w3_ratio_code_1');
  });
});
