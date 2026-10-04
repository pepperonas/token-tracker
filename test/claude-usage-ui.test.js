const fs = require('fs');
const path = require('path');
const { loadFrontend } = require('./helpers/frontend');
const { parseUsage } = require('../lib/claude-usage');

const SAMPLE = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'docs', 'usage-api-sample.json'), 'utf8')).body;

describe('claude usage — frontend helpers', () => {
  let F;
  beforeAll(() => { F = loadFrontend(); });
  afterEach(() => F.setLang('de'));

  it('names known kinds and keeps unknown ones raw', () => {
    F.setLang('de');
    expect(F.usageLimitLabel({ kind: 'session' })).toBe('Aktuelle Sitzung');
    expect(F.usageLimitLabel({ kind: 'weekly_all' })).toBe('Woche · alle Modelle');
    expect(F.usageLimitLabel({ kind: 'weekly_scoped', scopeLabel: 'Fable' })).toBe('Woche · Fable');
    expect(F.usageLimitLabel({ kind: 'other', name: 'iguana_necktie' })).toBe('iguana_necktie');
    expect(F.usageLimitLabel({ kind: 'monthly_mystery', name: 'monthly_mystery' })).toBe('monthly_mystery');
  });

  it('labels every limit of the real sample without falling back to "?"', () => {
    for (const l of parseUsage(SAMPLE).limits) {
      expect(F.usageLimitLabel(l)).toBeTruthy();
    }
  });

  it('formats the reset relative to now', () => {
    F.setLang('de');
    const now = Date.parse('2026-10-04T01:22:00Z');
    expect(F.formatUsageRelative('2026-10-04T04:00:00Z', now)).toBe('Reset in 2 Std. 38 Min.');
    expect(F.formatUsageRelative('2026-10-10T23:00:00Z', now)).toBe('Reset in 6 Tg. 21 Std.');
    expect(F.formatUsageRelative('2026-10-04T01:30:00Z', now)).toBe('Reset in 8 Min.');
    expect(F.formatUsageRelative('2026-10-04T01:00:00Z', now)).toBe('Reset läuft');
    expect(F.formatUsageRelative(null, now)).toBeNull();
    F.setLang('en');
    expect(F.formatUsageRelative('2026-10-04T04:00:00Z', now)).toBe('resets in 2h 38m');
  });

  it('shows the absolute reset in Europe/Berlin, not in the machine zone', () => {
    F.setLang('de');
    // 04:00 UTC on 4 Oct = 06:00 CEST; 23:00 UTC on 31 Oct = 00:00 CET on 1 Nov.
    expect(F.formatUsageAbsolute('2026-10-04T04:00:00.046105+00:00')).toMatch(/04\.10\..*06:00/);
    expect(F.formatUsageAbsolute('2026-10-31T23:00:00Z')).toMatch(/01\.11\..*00:00/);
    expect(F.formatUsageAbsolute('garbage')).toBeNull();
  });

  it('grades severity at 70 and 90 percent', () => {
    expect(F.usageSeverity(69.9)).toBe('');
    expect(F.usageSeverity(70)).toBe('warn');
    expect(F.usageSeverity(99.66)).toBe('danger');
    expect(F.usageSeverity(null)).toBe('');
  });

  it('describes loading, stale and error states', () => {
    F.setLang('de');
    expect(F.usageStatusText({ enabled: true, status: 'ok' })).toBe('');
    expect(F.usageStatusText({ enabled: true, status: 'loading' })).toBe('Lädt…');
    expect(F.usageStatusText({ enabled: true, status: 'error', error: 'TOKEN_EXPIRED' }))
      .toBe('Token abgelaufen, Claude Code einmal starten');
    const stale = F.usageStatusText({ enabled: true, status: 'stale', error: 'RATE_LIMITED', fetchedAt: '2026-10-04T08:15:00Z' });
    expect(stale).toMatch(/^Stand: .*10:15 · Abfragelimit erreicht/);
    expect(F.usageStatusText({ enabled: false })).toBe('');
  });

  it('has German and English texts for every usage key', () => {
    const { LANG } = F.pick(['LANG']);
    const keys = Object.keys(LANG.de).filter(k => k.startsWith('usage'));
    expect(keys.length).toBeGreaterThanOrEqual(30);
    for (const k of keys) expect(LANG.en[k]).toBeTruthy();
  });
});

describe('usage limits — Codex and Antigravity in the frontend', () => {
  let F;
  beforeAll(() => { F = loadFrontend(); });
  afterEach(() => F.setLang('de'));
  const codexView = (limits, extra = {}) => ({ enabled: true, status: 'ok', fetchedAt: '2026-10-03T22:26:42Z', data: { limits, ...extra } });

  it('labels Codex windows and keeps other limit ids visible', () => {
    F.setLang('de');
    expect(F.usageRowLabel('codex', { kind: 'session', limitId: 'codex', windowMinutes: 300 })).toBe('5-Stunden-Fenster');
    expect(F.usageRowLabel('codex', { kind: 'weekly', limitId: 'codex', windowMinutes: 10080 })).toBe('Woche');
    expect(F.usageRowLabel('codex', { kind: 'weekly', limitId: 'base_model_inference', windowMinutes: 10080 }))
      .toBe('Woche · base_model_inference');
    expect(F.usageRowLabel('codex', { kind: 'window', limitId: 'codex', windowMinutes: 60 })).toBe('60-Minuten-Fenster');
    expect(F.usageRowLabel('antigravity', { kind: 'exhausted' })).toBe('Kontingent erschöpft');
    expect(F.usageRowLabel('claude', { kind: 'session' })).toBe('Aktuelle Sitzung');
  });

  it('chooses the chip value: the short window per provider', () => {
    const codex = codexView([
      { kind: 'weekly', limitId: 'codex', percentUsed: 38 },
      { kind: 'session', limitId: 'codex', percentUsed: 94 }
    ]);
    expect(F.usageChipValue('codex', codex).pct).toBe(94);
    expect(F.usageChipValue('claude', { enabled: true, data: { limits: [{ kind: 'session', percentUsed: 9 }] } }).pct).toBe(9);
  });

  it('shows no percentage for a Codex window that has already reset', () => {
    const v = F.usageChipValue('codex', codexView([{ kind: 'session', limitId: 'codex', percentUsed: 94, reset: true }]));
    expect(v.pct).toBeNull();
    expect(v.reset).toBe(true);
  });

  it('shows an Antigravity chip only while the quota is exhausted', () => {
    expect(F.usageChipValue('antigravity', { enabled: true, data: { limits: [] } })).toBeNull();
    expect(F.usageChipValue('antigravity', { enabled: true, data: { limits: [{ kind: 'exhausted', percentUsed: 100 }] } }).pct).toBe(100);
  });

  it('shows no chip for a disabled provider', () => {
    for (const p of ['claude', 'codex', 'antigravity']) expect(F.usageChipValue(p, { enabled: false })).toBeNull();
  });

  it('says honestly what each source is', () => {
    F.setLang('de');
    expect(F.usageProviderStatus('codex', codexView([]))).toMatch(/^Stand der letzten Codex-Nutzung: /);
    expect(F.usageProviderStatus('codex', { enabled: true, status: 'empty' })).toBe('Keine Codex-Limits in den Logs der letzten 8 Tage');
    expect(F.usageProviderStatus('codex', { enabled: true, status: 'loading' })).toBe('Lädt…');
    expect(F.usageProviderStatus('antigravity', { enabled: true, status: 'ok', data: { limits: [], lastExhaustedAt: '2026-10-03T04:11:11Z' } }))
      .toMatch(/^Antigravity protokolliert keine Prozentwerte · zuletzt erschöpft /);
  });
});

describe('claude usage — markup and wiring', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
  const app = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'app.js'), 'utf8');

  it('has the containers the renderer writes into', () => {
    for (const id of ['plan-usage-section', 'plan-usage-list', 'plan-usage-refresh', 'plan-usage-note',
      'usage-chips', 'usage-chip-claude', 'usage-chip-codex', 'usage-chip-antigravity']) {
      expect(html).toContain(`id="${id}"`);
    }
  });

  it('starts hidden — shown only once the server says it is enabled', () => {
    expect(html).toMatch(/id="plan-usage-section"[^>]*display:none/);
    expect(html).toMatch(/id="usage-chips"[^>]*display:none/);
    for (const p of ['claude', 'codex', 'antigravity']) expect(html).toMatch(new RegExp(`id="usage-chip-${p}"[^>]*display:none`));
  });

  it('talks to the new routes only', () => {
    expect(app).toContain("api('usage-limits')");
    expect(app).toContain("'/api/claude-usage/refresh'");
    expect(app).not.toContain('/api/plan-usage');
  });
});

describe('usage box — collapsible, and the state survives reload and re-login', () => {
  // A small fake DOM element with a real classList and attribute store, so the
  // toggle's behaviour is tested, not just its presence in the source.
  const el = () => {
    const cls = new Set(), attrs = {}, handlers = {};
    return {
      dataset: {},
      classList: {
        add: c => cls.add(c), remove: c => cls.delete(c), contains: c => cls.has(c),
        toggle: (c, on) => { const v = on === undefined ? !cls.has(c) : !!on; v ? cls.add(c) : cls.delete(c); return v; }
      },
      setAttribute: (k, v) => { attrs[k] = String(v); },
      getAttribute: k => (k in attrs ? attrs[k] : null),
      addEventListener: (ev, fn) => { (handlers[ev] = handlers[ev] || []).push(fn); },
      click() { (handlers.click || []).forEach(fn => fn()); },
      handlerCount: ev => (handlers[ev] || []).length
    };
  };

  let F;
  beforeEach(() => { F = loadFrontend(); });

  it('collapses on click, stores it, and restores it on the next page load', () => {
    const box = el(), btn = el();
    F.initCollapsible(box, btn, 'usageLimitsCollapsed');
    expect(box.classList.contains('collapsed')).toBe(false);
    expect(btn.getAttribute('aria-expanded')).toBe('true');

    btn.click();
    expect(box.classList.contains('collapsed')).toBe(true);
    expect(btn.getAttribute('aria-expanded')).toBe('false');

    // A reload (or logout + login) builds fresh elements; the stored choice wins.
    const box2 = el(), btn2 = el();
    F.initCollapsible(box2, btn2, 'usageLimitsCollapsed');
    expect(box2.classList.contains('collapsed')).toBe(true);
    expect(btn2.getAttribute('aria-expanded')).toBe('false');

    btn2.click();
    const box3 = el(), btn3 = el();
    F.initCollapsible(box3, btn3, 'usageLimitsCollapsed');
    expect(box3.classList.contains('collapsed')).toBe(false);
  });

  it('binds the click handler once, however often the overview re-renders', () => {
    const box = el(), btn = el();
    for (let i = 0; i < 5; i++) F.initCollapsible(box, btn, 'usageLimitsCollapsed');
    expect(btn.handlerCount('click')).toBe(1);
    btn.click();
    expect(box.classList.contains('collapsed')).toBe(true); // one toggle, not five
  });

  it('keeps the two boxes independent', () => {
    const a = el(), aBtn = el(), b = el(), bBtn = el();
    F.initCollapsible(a, aBtn, 'usageLimitsCollapsed');
    F.initCollapsible(b, bBtn, 'activeSessionsCollapsed');
    aBtn.click();
    expect(a.classList.contains('collapsed')).toBe(true);
    expect(b.classList.contains('collapsed')).toBe(false);
  });

  it('the usage box is wired to its OWN key, separate from the active-sessions box', () => {
    const app = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'app.js'), 'utf8');
    const render = app.slice(app.indexOf('function renderUsageLimits('), app.indexOf('function renderUsageLimits(') + 3000);
    expect(render).toMatch(/initCollapsible\(section,\s*document\.getElementById\('plan-usage-toggle'\),\s*'usageLimitsCollapsed'\)/);
    const active = app.slice(app.indexOf('function initActiveSessionsCollapse('), app.indexOf('function initCollapsible('));
    expect(active).toMatch(/'activeSessionsCollapsed'/);
    expect(active).not.toMatch(/usageLimitsCollapsed/);
  });

  it('logout leaves the stored choice alone', () => {
    const app = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'app.js'), 'utf8');
    const logout = app.slice(app.indexOf('async function logout('), app.indexOf('}', app.indexOf('async function logout(')) + 1);
    expect(logout).not.toMatch(/localStorage\.(clear|removeItem)/);
  });

  it('the header is a real button inside the heading, and the translated label sits in its own span', () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
    const head = html.slice(html.indexOf('id="plan-usage-section"'), html.indexOf('id="plan-usage-list"'));
    // A <button> may not contain an <h3>; the heading wraps the button instead.
    expect(head).toMatch(/<h3[^>]*>\s*<button[^>]*id="plan-usage-toggle"/);
    expect(head).toMatch(/aria-controls="plan-usage-body"/);
    // applyTranslations() replaces textContent — on the button it would wipe the caret.
    expect(head).toMatch(/<span data-i18n="planUsageHeader">/);
    expect(head).not.toMatch(/<(h3|button)[^>]*data-i18n=/);
    expect(html).toMatch(/id="plan-usage-body"[\s\S]*id="plan-usage-list"[\s\S]*id="plan-usage-refresh"/);
  });
});
