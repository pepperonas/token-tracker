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
