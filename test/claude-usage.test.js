const fs = require('fs');
const path = require('path');
const usage = require('../lib/claude-usage');

const SAMPLE = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'docs', 'usage-api-sample.json'), 'utf8')).body;
const clone = (o) => JSON.parse(JSON.stringify(o));

describe('claude-usage — parseUsage', () => {
  it('reads the real sample: limits[], extra usage, breakdown — and no codename objects', () => {
    const r = usage.parseUsage(SAMPLE);
    expect(r.source).toBe('limits');
    const byId = Object.fromEntries(r.limits.map(l => [l.id, l]));
    expect(byId.session).toMatchObject({ kind: 'session', group: 'session', percentUsed: 4, resetsAt: '2026-10-04T04:00:00.046105+00:00' });
    expect(byId.weekly_all).toMatchObject({ kind: 'weekly_all', group: 'weekly', percentUsed: 2 });
    const scoped = r.limits.find(l => l.kind === 'weekly_scoped');
    expect(scoped.percentUsed).toBe(0);
    expect(scoped.scope).toBeTruthy();
    // iguana_necktie carries real usage in the sample but was a one-off
    // promotion: codename objects outside limits[] are not shown (2026-10-04).
    expect(byId.iguana_necktie).toBeUndefined();
    expect(r.limits.map(l => l.kind)).toEqual(['session', 'weekly_all', 'weekly_scoped']);
    // Legacy objects are NOT duplicated while limits[] is present.
    expect(r.limits.filter(l => l.kind === 'legacy_five_hour' || l.kind === 'legacy_seven_day')).toEqual([]);
    expect(r.extraUsage).toMatchObject({ enabled: false, used: 0, limit: 50, currency: 'EUR', disabledReason: 'out_of_credits' });
    expect(r.breakdown.map(b => [b.key, b.percent])).toEqual([['claude_code', 98], ['chat', 2], ['cowork', 0], ['other', 0]]);
  });

  it('falls back to the legacy objects when limits[] is missing', () => {
    const r = usage.parseUsage({
      five_hour: { utilization: 31, resets_at: '2026-10-04T04:00:00Z' },
      seven_day: { utilization: 12.5, resets_at: '2026-10-10T23:00:00Z' }
    });
    expect(r.source).toBe('legacy');
    expect(r.limits.map(l => [l.id, l.kind, l.percentUsed])).toEqual([
      ['five_hour', 'session', 31],
      ['seven_day', 'weekly_all', 12.5]
    ]);
  });

  it('falls back to the legacy objects when limits[] is empty', () => {
    const raw = clone(SAMPLE);
    raw.limits = [];
    const r = usage.parseUsage(raw);
    expect(r.source).toBe('legacy');
    expect(r.limits.find(l => l.id === 'five_hour').percentUsed).toBe(4);
    expect(r.limits.find(l => l.id === 'seven_day').percentUsed).toBe(2);
  });

  it('keeps an unknown limit kind with its raw name', () => {
    const r = usage.parseUsage({ limits: [{ kind: 'monthly_mystery', group: 'monthly', percent: 17, resets_at: '2026-11-01T00:00:00Z' }] });
    expect(r.limits).toHaveLength(1);
    expect(r.limits[0]).toMatchObject({ kind: 'monthly_mystery', name: 'monthly_mystery', percentUsed: 17 });
  });

  it('one broken limit does not take the others down', () => {
    const r = usage.parseUsage({ limits: [
      null, 42, 'x',
      { kind: 'session', percent: 'NaN-ish', resets_at: 12 },
      { kind: 'weekly_all', percent: 9, resets_at: '2026-10-10T23:00:00Z' }
    ] });
    expect(r.limits.map(l => [l.kind, l.percentUsed, l.resetsAt])).toEqual([
      ['session', null, null],
      ['weekly_all', 9, '2026-10-10T23:00:00Z']
    ]);
  });

  it('gives two scoped limits distinct ids', () => {
    const r = usage.parseUsage({ limits: [
      { kind: 'weekly_scoped', percent: 1, scope: { model: { display_name: 'Fable' } } },
      { kind: 'weekly_scoped', percent: 2, scope: { model: { display_name: 'Opus' } } }
    ] });
    expect(r.limits.map(l => l.id)).toEqual(['weekly_scoped:fable', 'weekly_scoped:opus']);
    expect(r.limits.map(l => l.scopeLabel)).toEqual(['Fable', 'Opus']);
  });

  it('treats a non-object payload as an empty, changed schema instead of throwing', () => {
    for (const v of [null, [], 42, 'x']) {
      const r = usage.parseUsage(v);
      expect(r.limits).toEqual([]);
      expect(r.source).toBe('none');
    }
  });

  it('ignores codename objects, even ones that carry utilization', () => {
    const r = usage.parseUsage({ limits: [{ kind: 'session', percent: 1 }], tangelo: null, cinder_cove: { foo: 1 },
      iguana_necktie: { utilization: 99.6, resets_at: '2026-11-05T07:59:00Z', limit_dollars: 250, used_dollars: 249 } });
    expect(r.limits.map(l => l.id)).toEqual(['session']);
  });
});

describe('claude-usage — parseUsageText', () => {
  it('rejects broken JSON with a typed error', () => {
    expect(() => usage.parseUsageText('{"limits": [')).toThrow(expect.objectContaining({ code: 'BAD_JSON' }));
  });

  it('parses a valid body', () => {
    expect(usage.parseUsageText(JSON.stringify(SAMPLE)).source).toBe('limits');
  });
});

describe('claude-usage — readToken', () => {
  const NOW = Date.parse('2026-10-04T00:00:00Z');
  const creds = (expiresAt, token = 'sk-ant-oat01-FAKE') => JSON.stringify({ claudeAiOauth: { accessToken: token, expiresAt } });

  it('prefers the macOS keychain', () => {
    const r = usage.readToken({
      platform: 'darwin', now: NOW,
      readKeychain: () => creds(NOW + 3600e3, 'sk-ant-oat01-KEYCHAIN'),
      readFile: () => creds(NOW + 3600e3, 'sk-ant-oat01-FILE')
    });
    expect(r).toMatchObject({ token: 'sk-ant-oat01-KEYCHAIN', source: 'keychain' });
  });

  it('skips an expired keychain token and uses a valid file token', () => {
    const r = usage.readToken({
      platform: 'darwin', now: NOW,
      readKeychain: () => creds(NOW - 1),
      readFile: () => creds(NOW + 3600e3, 'sk-ant-oat01-FILE')
    });
    expect(r).toMatchObject({ token: 'sk-ant-oat01-FILE', source: 'file' });
  });

  it('reports TOKEN_EXPIRED when every source is expired', () => {
    const r = usage.readToken({ platform: 'darwin', now: NOW, readKeychain: () => creds(NOW - 1), readFile: () => creds(NOW - 1) });
    expect(r).toEqual({ error: 'TOKEN_EXPIRED' });
  });

  it('treats a token expiring within a minute as expired', () => {
    const r = usage.readToken({ platform: 'linux', now: NOW, readFile: () => creds(NOW + 30e3) });
    expect(r).toEqual({ error: 'TOKEN_EXPIRED' });
  });

  it('reports NO_TOKEN when nothing is readable', () => {
    const r = usage.readToken({ platform: 'linux', now: NOW, readFile: () => { throw new Error('ENOENT'); } });
    expect(r).toEqual({ error: 'NO_TOKEN' });
  });

  it('does not use the keychain off macOS', () => {
    let called = false;
    usage.readToken({ platform: 'linux', now: NOW, readKeychain: () => { called = true; return creds(NOW + 3600e3); }, readFile: () => creds(NOW + 3600e3) });
    expect(called).toBe(false);
  });
});

describe('claude-usage — poller', () => {
  const MIN = 60e3;
  function makePoller({ responses, token = { token: 'sk-ant-oat01-FAKE' }, start = Date.parse('2026-10-04T10:00:00Z') }) {
    let now = start;
    const calls = [];
    const store = {};
    const p = usage.createPoller({
      intervalMs: 5 * MIN,
      now: () => now,
      readToken: () => token,
      request: async (tok) => { calls.push(tok); return responses.shift(); },
      loadCache: () => store.cache || null,
      saveCache: (c) => { store.cache = c; },
      log: () => {}
    });
    return { p, calls, store, tick: (ms) => { now += ms; }, at: () => now };
  }

  it('caches a successful fetch with a timestamp', async () => {
    const t = makePoller({ responses: [{ status: 200, body: JSON.stringify(SAMPLE) }] });
    await t.p.fetchNow();
    const v = t.p.view();
    expect(v.status).toBe('ok');
    expect(v.fetchedAt).toBe('2026-10-04T10:00:00.000Z');
    expect(v.data.limits.length).toBeGreaterThan(0);
    expect(t.store.cache.fetchedAt).toBe('2026-10-04T10:00:00.000Z');
  });

  it('on 429 keeps the last data, marks it stale and backs off exponentially', async () => {
    const t = makePoller({ responses: [
      { status: 200, body: JSON.stringify(SAMPLE) },
      { status: 429, body: '', headers: {} },
      { status: 429, body: '', headers: {} }
    ] });
    await t.p.fetchNow();
    t.tick(5 * MIN);
    await t.p.fetchNow();
    let v = t.p.view();
    expect(v.status).toBe('stale');
    expect(v.error).toBe('RATE_LIMITED');
    expect(v.data.limits.length).toBeGreaterThan(0);
    expect(Date.parse(v.nextAttemptAt) - t.at()).toBe(10 * MIN);
    t.tick(10 * MIN);
    await t.p.fetchNow();
    v = t.p.view();
    expect(Date.parse(v.nextAttemptAt) - t.at()).toBe(20 * MIN);
  });

  it('caps the backoff at 60 minutes and resets it after a success', async () => {
    const responses = Array.from({ length: 6 }, () => ({ status: 429, body: '' }));
    responses.push({ status: 200, body: JSON.stringify(SAMPLE) });
    const t = makePoller({ responses });
    for (let i = 0; i < 6; i++) { await t.p.fetchNow(); t.tick(61 * MIN); }
    expect(Date.parse(t.p.view().nextAttemptAt) - (t.at() - 61 * MIN)).toBe(60 * MIN);
    await t.p.fetchNow();
    expect(Date.parse(t.p.view().nextAttemptAt) - t.at()).toBe(5 * MIN);
  });

  it('honours a Retry-After longer than the backoff', async () => {
    const t = makePoller({ responses: [{ status: 429, body: '', headers: { 'retry-after': '1800' } }] });
    await t.p.fetchNow();
    expect(Date.parse(t.p.view().nextAttemptAt) - t.at()).toBe(30 * MIN);
  });

  it('on 401 reports TOKEN_EXPIRED and keeps the data', async () => {
    const t = makePoller({ responses: [{ status: 200, body: JSON.stringify(SAMPLE) }, { status: 401, body: '' }] });
    await t.p.fetchNow();
    t.tick(5 * MIN);
    await t.p.fetchNow();
    expect(t.p.view()).toMatchObject({ status: 'stale', error: 'TOKEN_EXPIRED' });
  });

  it('does not call the endpoint at all with an expired token', async () => {
    const t = makePoller({ responses: [], token: { error: 'TOKEN_EXPIRED' } });
    await t.p.fetchNow();
    expect(t.calls).toEqual([]);
    expect(t.p.view()).toMatchObject({ status: 'error', error: 'TOKEN_EXPIRED' });
  });

  it('survives broken JSON from the endpoint', async () => {
    const t = makePoller({ responses: [{ status: 200, body: '{nope' }] });
    await t.p.fetchNow();
    expect(t.p.view()).toMatchObject({ status: 'error', error: 'BAD_JSON' });
  });

  it('survives a network failure', async () => {
    const t = makePoller({ responses: [] });
    // request resolves undefined → treated as a failed call, not a crash
    await t.p.fetchNow();
    expect(t.p.view().status).toBe('error');
  });

  it('refuses a manual refresh within two minutes of the last attempt', async () => {
    const t = makePoller({ responses: [{ status: 200, body: JSON.stringify(SAMPLE) }, { status: 200, body: JSON.stringify(SAMPLE) }] });
    await t.p.fetchNow();
    t.tick(1 * MIN);
    expect(await t.p.refresh()).toMatchObject({ throttled: true });
    expect(t.calls).toHaveLength(1);
    t.tick(1 * MIN);
    expect(await t.p.refresh()).toMatchObject({ throttled: false });
    expect(t.calls).toHaveLength(2);
  });

  it('refuses a manual refresh while backing off from a 429', async () => {
    const t = makePoller({ responses: [{ status: 429, body: '' }] });
    await t.p.fetchNow();
    t.tick(3 * MIN);
    expect(await t.p.refresh()).toMatchObject({ throttled: true });
    expect(t.calls).toHaveLength(1);
  });

  it('restores the cached state after a restart', () => {
    const store = { cache: { data: usage.parseUsage(SAMPLE), fetchedAt: '2026-10-04T09:00:00.000Z' } };
    const p = usage.createPoller({
      intervalMs: 5 * MIN, now: () => Date.parse('2026-10-04T09:02:00Z'),
      readToken: () => ({ error: 'NO_TOKEN' }), request: async () => null,
      loadCache: () => store.cache, saveCache: () => {}, log: () => {}
    });
    expect(p.view()).toMatchObject({ status: 'ok', fetchedAt: '2026-10-04T09:00:00.000Z' });
  });

  it('never puts the token into the view, the cache or a log line', async () => {
    const lines = [];
    let saved = null;
    const SECRET = 'sk-ant-oat01-SECRET-DO-NOT-LEAK';
    const p = usage.createPoller({
      intervalMs: 5 * MIN, now: () => Date.parse('2026-10-04T10:00:00Z'),
      readToken: () => ({ token: SECRET }),
      request: async () => ({ status: 500, body: `echo ${SECRET}` }),
      loadCache: () => null, saveCache: (c) => { saved = c; },
      log: (...a) => lines.push(a.join(' '))
    });
    await p.fetchNow();
    const all = JSON.stringify([p.view(), saved, lines]);
    expect(all).not.toContain(SECRET);
    expect(all).not.toContain('sk-ant-');
  });
});

describe('claude-usage — clamps the polling interval', () => {
  it('defaults to 5 minutes and never goes below 2', () => {
    expect(usage.intervalFromEnv(undefined)).toBe(5 * 60e3);
    expect(usage.intervalFromEnv('10')).toBe(10 * 60e3);
    expect(usage.intervalFromEnv('1')).toBe(2 * 60e3);
    expect(usage.intervalFromEnv('0')).toBe(2 * 60e3);
    expect(usage.intervalFromEnv('abc')).toBe(5 * 60e3);
  });
});

describe('no token anywhere in the repository', () => {
  it('tracked files and the sample contain no OAuth or API key', () => {
    const { execFileSync } = require('child_process');
    const root = path.join(__dirname, '..');
    const files = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean);
    files.push('docs/usage-api-sample.json');
    // A real key is sk-ant- followed by a long base64url run; the fake ones in
    // this test file are short and spelled out on purpose.
    const real = /sk-ant-(oat|ort|api|admin)\d{2}-[A-Za-z0-9_-]{40,}/;
    const hits = files.filter(f => {
      try { return real.test(fs.readFileSync(path.join(root, f), 'utf8')); } catch { return false; }
    });
    expect(hits).toEqual([]);
  });
});
