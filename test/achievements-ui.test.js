const fs = require('fs');
const path = require('path');
const { loadFrontend } = require('./helpers/frontend');

const ROOT = path.join(__dirname, '..');
const APP = fs.readFileSync(path.join(ROOT, 'public', 'js', 'app.js'), 'utf8');
const HTML = fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8');
// Pins on source run against the comment-free text: comments explain the
// rules and would otherwise satisfy a pin even when the code is gone.
const APP_PUR = APP.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

function fnBody(name) {
  const start = APP_PUR.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('missing ' + name);
  const next = APP_PUR.indexOf('\nfunction ', start + 10);
  return APP_PUR.slice(start, next < 0 ? undefined : next);
}

const DAY = 86400000;
const NOW = new Date(2026, 9, 8, 12, 0, 0).getTime();

const ach = (key, extra = {}) => ({ key, points: 10, unlocked: false, unlockedAt: null, progress: null, addedAt: null, ...extra });
const prog = (pct, extra = {}) => ({ value: pct, target: 100, pct, metric: '', unit: 'int', parts: 1, ...extra });

describe('achievement filters', () => {
  let ctx;
  beforeEach(() => { ctx = loadFrontend(); });

  it('counts an achievement as new only inside the 30-day window', () => {
    expect(ctx.isNewAchievement(ach('a', { addedAt: '2026-10-07' }), NOW)).toBe(true);
    expect(ctx.isNewAchievement(ach('a', { addedAt: '2026-09-09' }), NOW)).toBe(true);
    expect(ctx.isNewAchievement(ach('a', { addedAt: '2026-08-30' }), NOW)).toBe(false);
    expect(ctx.isNewAchievement(ach('a', { addedAt: null }), NOW)).toBe(false);
    // A date in the future is not "new", it is wrong.
    expect(ctx.isNewAchievement(ach('a', { addedAt: '2026-12-01' }), NOW)).toBe(false);
  });

  it('calls a locked achievement near from 80 percent on', () => {
    expect(ctx.isNearAchievement(ach('a', { progress: prog(80) }))).toBe(true);
    expect(ctx.isNearAchievement(ach('a', { progress: prog(79) }))).toBe(false);
    expect(ctx.isNearAchievement(ach('a', { progress: null }))).toBe(false);
    expect(ctx.isNearAchievement(ach('a', { unlocked: true, progress: prog(100) }))).toBe(false);
  });

  it('counts every filter in one pass', () => {
    const data = [
      ach('a', { unlocked: true, unlockedAt: '2026-01-01' }),
      ach('b', { progress: prog(90), addedAt: '2026-10-07' }),
      ach('c', { progress: prog(10) }),
      ach('d')
    ];
    const c = ctx.achievementFilterCounts(data, NOW);
    expect({ ...c }).toEqual({ all: 4, new: 1, near: 1, unlocked: 1, locked: 3 });
    expect(ctx.achievementMatchesFilter(data[0], 'bogus', NOW)).toBe(true);
  });

  it('sorts closest first, then unmeasurable, then unlocked newest first', () => {
    const data = [
      ach('unl-old', { unlocked: true, unlockedAt: '2026-01-01' }),
      ach('none'),
      ach('p40', { progress: prog(40) }),
      ach('p95', { progress: prog(95) }),
      ach('unl-new', { unlocked: true, unlockedAt: '2026-10-01' }),
      ach('p95b', { progress: prog(95, { value: 96, target: 100 }) })
    ];
    expect(ctx.sortAchievementsNextFirst(data).map(a => a.key))
      .toEqual(['p95b', 'p95', 'p40', 'none', 'unl-new', 'unl-old']);
    // Never sorts in place: the cached API data keeps its order.
    expect(data[0].key).toBe('unl-old');
  });
});

describe('achievement progress text', () => {
  let ctx;
  beforeEach(() => { ctx = loadFrontend(); });

  it('reads like a sentence in German', () => {
    ctx.setLang('de');
    expect(ctx.formatAchProgress(prog(0, { value: 12430, target: 15000, metric: 'toolCallsByName.Read' })))
      .toBe('12.430 / 15.000 Read-Aufrufe');
    expect(ctx.formatAchProgress(prog(0, { value: 98.27, target: 99, metric: 'avgCacheRate', unit: 'pct' })))
      .toBe('Cache-Rate: 98,3 % / 99,0 %');
    expect(ctx.formatAchProgress(prog(0, { value: 2499.9, target: 2500, metric: 'totalActiveHours', unit: 'h' })))
      .toBe('Arbeitszeit: 2.499 Std. / 2.500 Std.');
  });

  it('and in English', () => {
    ctx.setLang('en');
    expect(ctx.formatAchProgress(prog(0, { value: 12430, target: 15000, metric: 'toolCallsByName.Read' })))
      .toBe('12,430 / 15,000 Read calls');
    expect(ctx.formatAchProgress(prog(0, { value: 1234.5, target: 200000, metric: 'totalCost', unit: 'usd' })))
      .toBe('cost: $1,235 / $200,000');
    expect(ctx.formatAchProgress(prog(0, { value: 0.9, target: 0.92, metric: 'codeToolDayShare', unit: 'share' })))
      .toBe('90.0% / 92.0%');
  });

  it('names the weakest of several conditions', () => {
    ctx.setLang('de');
    expect(ctx.formatAchProgress(prog(0, { value: 2, target: 10, metric: 'totalSessions', parts: 2 })))
      .toBe('2 / 10 Sitzungen · schwächste von 2 Bedingungen');
  });

  it('labels model and tool metrics', () => {
    ctx.setLang('de');
    expect(ctx.achievementMetricLabel('modelMessagesOf(Opus 5)')).toBe('Opus-5-Nachrichten');
    expect(ctx.achievementMetricLabel('modelMessages.opus')).toBe('Opus-Nachrichten');
    expect(ctx.achievementMetricLabel('somethingUnknown')).toBe('');
    ctx.setLang('en');
    expect(ctx.achievementMetricLabel('modelMessagesOf(Opus 5)')).toBe('Opus 5 messages');
  });

  it('never prints a value above what was reached by rounding up', () => {
    ctx.setLang('en');
    // 14,999.7 calls must not read as 15,000 / 15,000 while still locked.
    expect(ctx.formatAchValue(14999.7, 'int')).toBe('14,999');
    expect(ctx.formatAchValue(2499.9, 'h')).toBe('2,499 h');
  });

  it('returns nothing without progress', () => {
    expect(ctx.formatAchProgress(null)).toBe('');
  });
});

describe('achievement grid wiring', () => {
  it('filters before grouping and offers the closest-first sort', () => {
    const body = fnBody('renderAchievementsGrid');
    expect(body).toMatch(/achievementMatchesFilter\(a, _achievementFilter/);
    expect(body).toMatch(/sortMode === 'next'[\s\S]*sortAchievementsNextFirst\(data\)/);
    expect(body).toMatch(/!ach\.unlocked && ach\.progress/);
    expect(body).toMatch(/isNewAchievement\(ach, now\)/);
    expect(body).toMatch(/achFilterEmpty/);
  });

  it('persists filter and sort, and validates what it reads back', () => {
    expect(APP_PUR).toMatch(/localStorage\.setItem\('achFilter'/);
    expect(APP_PUR).toMatch(/localStorage\.setItem\('achSort'/);
    expect(APP_PUR).toMatch(/_achStored\('achFilter', ACH_FILTERS/);
    expect(APP_PUR).toMatch(/_achStored\('achSort', ACH_SORTS/);
  });

  it('falls back to the defaults on a stored value it does not know', () => {
    const ctx = loadFrontend();
    ctx.localStorage.setItem('achFilter', 'evil');
    expect(ctx.evalIn("_achStored('achFilter', ACH_FILTERS, 'all')")).toBe('all');
    ctx.localStorage.setItem('achFilter', 'near');
    expect(ctx.evalIn("_achStored('achFilter', ACH_FILTERS, 'all')")).toBe('near');
  });

  it('has a chip for every filter and a button for every sort', () => {
    const ctx = loadFrontend();
    const { ACH_FILTERS, ACH_SORTS } = ctx.pick(['ACH_FILTERS', 'ACH_SORTS']);
    for (const f of ACH_FILTERS) {
      expect(HTML).toContain(`data-filter="${f}"`);
      expect(HTML).toContain(`id="ach-count-${f}"`);
    }
    for (const s of ACH_SORTS) expect(HTML).toContain(`data-sort="${s}"`);
  });

  it('translates every new key in both languages', () => {
    const ctx = loadFrontend();
    const { LANG } = ctx.pick(['LANG']);
    for (const key of ['achievementsSortNext', 'achFilterLabel', 'achFilterAll', 'achFilterNew',
      'achFilterNear', 'achFilterUnlocked', 'achFilterLocked', 'achFilterEmpty', 'achNewPill',
      'achProgressWeakest', 'achProgressDaysNeeded', 'achProgressAria']) {
      expect(LANG.de[key]).toBeTruthy();
      expect(LANG.en[key]).toBeTruthy();
    }
  });
});
