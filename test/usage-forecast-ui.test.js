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
    // A lone status line gets no "rough estimate" — there is no estimate to qualify.
    expect(F.usageForecastSummary(fc({ status: 'idle', atReset: null, confidence: 'rough' })).text).toBe('noch nichts verbraucht');
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
    expect(fn).toMatch(/classList\.toggle\('fc-warn', fcTone === 'warn'\)/);
    expect(fn).toMatch(/classList\.toggle\('fc-danger', fcTone === 'danger'\)/);
  });
});
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

  it('reuses the stashed box, so the chart keeps its canvas across a rebuild', () => {
    const el = () => ({ textContent: '', attrs: {}, children: [], setAttribute(k, v) { this.attrs[k] = v; },
      appendChild(c) { this.children.push(c); } });
    const canvas = { id: 'usage-fc-claude-weekly-all', ...el() };
    const legend = el(), notes = el();
    const stashed = { dataset: { key: 'claude:weekly_all' },
      querySelector: (q) => (q === 'canvas' ? canvas : q === '.usage-fc-legend' ? legend : notes) };
    const rc = { stash: new Map([['claude:weekly_all', stashed]]), used: new Set(), pending: [] };
    const f = fc({ series });
    expect(F._usageFcBox('claude:weekly_all', f, rc)).toBe(stashed);
    expect(rc.used.has('claude:weekly_all')).toBe(true);
    expect(rc.pending).toEqual([{ canvasId: 'usage-fc-claude-weekly-all', forecast: f }]);
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

describe('usage forecast — review fixes (UI)', () => {
  it('an exhausted limit says "aufgebraucht", not "leer in ~0:00 h"', () => {
    const F = loadFrontend(); F.setLang('de');
    const r = F.usageForecastSummary(fc({ status: 'exhausts', exhaustsAt: { median: '2026-10-06T23:00:00.000Z', early: '2026-10-06T23:00:00.000Z', late: '2026-10-06T23:00:00.000Z' } }));
    expect(r.text).toContain('aufgebraucht');
    expect(r.text).not.toContain('leer');
  });
});
