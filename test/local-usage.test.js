const fs = require('fs');
const os = require('os');
const path = require('path');
const codex = require('../lib/codex-usage');
const ag = require('../lib/antigravity-usage');

// Real line shapes, taken from this machine's logs (2026-10-04) and trimmed.
const rlLine = (ts, rl) => JSON.stringify({ timestamp: ts, type: 'event_msg', payload: { type: 'token_count', info: null, rate_limits: rl } });
const CODEX_RL = (used5h, usedWeek, resets5h, resetsWeek) => ({
  limit_id: 'codex', limit_name: null,
  primary: { used_percent: used5h, window_minutes: 300, resets_at: resets5h },
  secondary: { used_percent: usedWeek, window_minutes: 10080, resets_at: resetsWeek },
  credits: { has_credits: false, unlimited: false, balance: '0' },
  individual_limit: null, spend_control_reached: null, plan_type: 'plus', rate_limit_reached_type: null
});
const NOW = Date.parse('2026-10-04T00:00:00Z');
const S = (iso) => Date.parse(iso) / 1000;

describe('codex usage — snapshots', () => {
  it('keeps the newest snapshot per limit_id across files', () => {
    const a = [
      rlLine('2026-10-03T20:00:00Z', CODEX_RL(50, 30, S('2026-10-04T02:00:00Z'), S('2026-10-10T04:00:00Z'))),
      rlLine('2026-10-03T22:26:40Z', CODEX_RL(94, 38, S('2026-10-04T02:25:16Z'), S('2026-10-10T04:01:39Z')))
    ].join('\n');
    const b = rlLine('2026-10-01T21:07:29Z', {
      limit_id: 'base_model_inference',
      primary: { used_percent: 17, window_minutes: 10080, resets_at: S('2026-10-06T18:25:37Z') },
      secondary: null, plan_type: 'plus'
    });
    const snaps = codex.latestSnapshots([b, a]);
    expect([...snaps.keys()].sort()).toEqual(['base_model_inference', 'codex']);
    expect(snaps.get('codex').rl.primary.used_percent).toBe(94);
  });

  it('builds the view: 5-hour first, week next, other ids after codex', () => {
    const snaps = codex.latestSnapshots([[
      rlLine('2026-10-03T22:26:40Z', CODEX_RL(94, 38, S('2026-10-04T02:25:16Z'), S('2026-10-10T04:01:39Z'))),
      rlLine('2026-10-01T21:07:29Z', { limit_id: 'base_model_inference', primary: { used_percent: 17, window_minutes: 10080, resets_at: S('2026-10-06T18:25:37Z') }, secondary: null })
    ].join('\n')]);
    const v = codex.buildView(snaps, NOW);
    expect(v.status).toBe('ok');
    expect(v.fetchedAt).toBe('2026-10-03T22:26:40Z');
    expect(v.data.plan).toBe('plus');
    expect(v.data.limits.map(l => [l.id, l.kind, l.percentUsed])).toEqual([
      ['codex:300', 'session', 94],
      ['codex:10080', 'weekly', 38],
      ['base_model_inference:10080', 'weekly', 17]
    ]);
    expect(v.data.limits[0].resetsAt).toBe('2026-10-04T02:25:16.000Z');
  });

  it('reports a window whose reset has passed as reset, without a stale percentage', () => {
    const snaps = codex.latestSnapshots([rlLine('2026-10-03T10:00:00Z', CODEX_RL(94, 38, S('2026-10-03T12:00:00Z'), S('2026-10-10T04:00:00Z')))]);
    const [five, week] = codex.buildView(snaps, NOW).data.limits;
    expect(five).toMatchObject({ reset: true, percentUsed: null });
    expect(week).toMatchObject({ reset: false, percentUsed: 38 });
  });

  it('survives junk, missing windows and a snapshot without timestamp', () => {
    const text = [
      'not json "rate_limits"',
      JSON.stringify({ payload: { rate_limits: CODEX_RL(1, 2, 0, 0) } }),             // no timestamp → ignored
      rlLine('2026-10-03T10:00:00Z', { limit_id: 'premium', primary: null, secondary: null, credits: { has_credits: true, unlimited: false, balance: '12.5' } }),
      rlLine('2026-10-03T11:00:00Z', { limit_id: 'odd', primary: { used_percent: 'x', window_minutes: null } })
    ].join('\n');
    const v = codex.buildView(codex.latestSnapshots([text]), NOW);
    expect(v.data.limits.map(l => [l.id, l.percentUsed])).toEqual([['odd:x', null]]);
    expect(v.data.credits).toEqual({ hasCredits: true, unlimited: false, balance: 12.5 });
  });

  it('reports empty when the logs carry no limits', () => {
    expect(codex.buildView(new Map(), NOW)).toMatchObject({ enabled: true, status: 'empty' });
  });
});

describe('codex usage — incremental reader', () => {
  let dir;
  beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-usage-')); });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  const write = (rel, text, mtime = new Date()) => {
    const f = path.join(dir, rel);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, text);
    fs.utimesSync(f, mtime, mtime);
    return f;
  };

  it('is disabled when Codex is not installed', () => {
    expect(codex.createCodexUsage(path.join(dir, 'nope')).view()).toEqual({ enabled: false });
  });

  it('starts as loading, then reads, then picks up appended lines only', async () => {
    const f = write('2026/10/03/rollout-a.jsonl', rlLine('2026-10-03T20:00:00Z', CODEX_RL(50, 30, S('2099-01-01T00:00:00Z'), S('2099-01-02T00:00:00Z'))) + '\n');
    const r = codex.createCodexUsage(dir);
    expect(r.view().status).toBe('loading');
    await r.refresh();
    expect(r.view().data.limits[0].percentUsed).toBe(50);
    fs.appendFileSync(f, rlLine('2026-10-03T21:00:00Z', CODEX_RL(61, 31, S('2099-01-01T00:00:00Z'), S('2099-01-02T00:00:00Z'))) + '\n');
    await r.refresh();
    expect(r.view().data.limits[0].percentUsed).toBe(61);
  });

  it('completes a line that was cut off mid-write', async () => {
    const full = rlLine('2026-10-03T20:00:00Z', CODEX_RL(77, 30, S('2099-01-01T00:00:00Z'), S('2099-01-02T00:00:00Z'))) + '\n';
    const f = write('2026/10/03/rollout-b.jsonl', full.slice(0, 60));
    const r = codex.createCodexUsage(dir);
    await r.refresh();
    expect(r.view().status).toBe('empty');
    fs.appendFileSync(f, full.slice(60));
    await r.refresh();
    expect(r.view().data.limits[0].percentUsed).toBe(77);
  });

  it('ignores files older than a week', async () => {
    write('2026/09/01/rollout-old.jsonl', rlLine('2026-09-01T00:00:00Z', CODEX_RL(99, 99, S('2099-01-01T00:00:00Z'), S('2099-01-02T00:00:00Z'))) + '\n',
      new Date(Date.now() - 20 * 86400000));
    const r = codex.createCodexUsage(dir);
    await r.refresh();
    expect(r.view().status).toBe('empty');
  });

  it('keeps a per-limit series of value changes from the last 8 days', async () => {
    const now = Date.now();
    const iso = (ms) => new Date(ms).toISOString();
    const R5 = Math.floor((now + 3600e3) / 1000), RW = Math.floor((now + 3 * 86400e3) / 1000);
    write('2026/10/03/rollout-s.jsonl', [
      rlLine(iso(now - 9 * 86400e3), CODEX_RL(1, 1, R5, RW)),            // older than 8 days: dropped
      rlLine(iso(now - 3 * 3600e3), CODEX_RL(10, 20, R5, RW)),
      rlLine(iso(now - 2 * 3600e3), CODEX_RL(10, 20, R5, RW)),           // unchanged: no new point
      rlLine(iso(now - 3600e3), CODEX_RL(15, 22, R5, RW))
    ].join('\n') + '\n');
    const r = codex.createCodexUsage(dir);
    await r.refresh();
    expect(r.series('codex:300').map(p => p.percent)).toEqual([10, 15]);
    expect(r.series('codex:10080').map(p => p.percent)).toEqual([20, 22]);
    expect(r.series('codex:10080')[0]).toEqual({ at: Date.parse(iso(now - 3 * 3600e3)), percent: 20, resetsAt: RW * 1000 });
    expect(r.series('nope:1')).toEqual([]);
  });

  it('merges the series of two files in time order', async () => {
    const now = Date.now();
    const iso = (ms) => new Date(ms).toISOString();
    const RW = Math.floor((now + 3 * 86400e3) / 1000);
    write('2026/10/03/rollout-x.jsonl', rlLine(iso(now - 2 * 3600e3), CODEX_RL(5, 30, RW, RW)) + '\n');
    write('2026/10/03/rollout-y.jsonl', rlLine(iso(now - 5 * 3600e3), CODEX_RL(5, 25, RW, RW)) + '\n');
    const r = codex.createCodexUsage(dir);
    await r.refresh();
    expect(r.series('codex:10080').map(p => p.percent)).toEqual([25, 30]);
  });

  it('keeps a multi-byte character that straddles a read boundary', async () => {
    // With 3-byte reads every multi-byte character is split somewhere. A naive
    // per-chunk toString() turns "ü" into replacement characters — still valid
    // JSON, so the damage only shows in the decoded text: the limit id.
    const line = rlLine('2026-10-03T20:00:00Z', { limit_id: 'grün', primary: { used_percent: 5, window_minutes: 300, resets_at: S('2099-01-01T00:00:00Z') }, secondary: null });
    write('2026/10/03/rollout-c.jsonl', line + '\n');
    const r = codex.createCodexUsage(dir, { chunkSize: 3 });
    await r.refresh();
    expect(r.view().data.limits[0].limitId).toBe('grün');
  });
});

describe('antigravity usage — log parser', () => {
  const LINE = (stamp, dur) => `E${stamp} 25522 errorreport.go:224] generating and executing: RESOURCE_EXHAUSTED (code 429): Individual quota reached. Please upgrade your subscription to increase your limits. Resets in ${dur}.`;

  it('parses durations', () => {
    expect(ag.parseDuration('4h39m10s')).toBe((4 * 3600 + 39 * 60 + 10) * 1000);
    expect(ag.parseDuration('88h4m0s')).toBe((88 * 3600 + 4 * 60) * 1000);
    expect(ag.parseDuration('9m47s')).toBe((9 * 60 + 47) * 1000);
    expect(ag.parseDuration('26.5s')).toBe(26500);
    expect(ag.parseDuration('')).toBeNull();
    expect(ag.parseDuration('soon')).toBeNull();
  });

  it('reads the event time in local time and adds the reset duration', () => {
    const [e] = ag.parseLog(LINE('0929 22:34:22.784686', '4h39m10s'), 2026, 9);
    expect(e.at).toBe(new Date(2026, 8, 29, 22, 34, 22).getTime());
    expect(e.resetsAt - e.at).toBe((4 * 3600 + 39 * 60 + 10) * 1000);
  });

  it('rolls the year over for January lines in a December log', () => {
    const [e] = ag.parseLog(LINE('0102 01:00:00.000000', '1h'), 2026, 12);
    expect(new Date(e.at).getFullYear()).toBe(2027);
  });

  it('also reads the retry lines and ignores unrelated ones', () => {
    const text = [
      'I0929 22:24:48.343689 210 quota_manager.go:45] doRefreshQuota: starting reload (force=false)',
      `I0929 22:33:55.199625 25522 run.go:395] Run: attempt 8 failed (RESOURCE_EXHAUSTED (code 429): Individual quota reached. Please upgrade your subscription to increase your limits. Resets in 4h39m10s.), retrying in 26.47s`,
      'garbage RESOURCE_EXHAUSTED Resets in nothing'
    ].join('\n');
    expect(ag.parseLog(text, 2026, 9)).toHaveLength(1);
  });

  it('shows an exhausted quota until it resets, then only the last time it ran out', () => {
    const events = ag.parseLog(LINE('1003 06:11:11.000000', '88h2m37s'), 2026, 10);
    const during = ag.buildView(events, events[0].at + 3600e3);
    expect(during.data.limits).toEqual([expect.objectContaining({ kind: 'exhausted', percentUsed: 100 })]);
    const after = ag.buildView(events, events[0].resetsAt + 1);
    expect(after.data.limits).toEqual([]);
    expect(after.data.lastExhaustedAt).toBe(new Date(events[0].at).toISOString());
    expect(after.data.percentAvailable).toBe(false);
  });

  it('is disabled without an Antigravity log directory', () => {
    expect(ag.createAntigravityUsage(path.join(os.tmpdir(), 'no-such-ag-' + Date.now())).view()).toEqual({ enabled: false });
  });

  it('reads the newest logs from a directory and takes the latest event', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ag-usage-'));
    try {
      fs.writeFileSync(path.join(dir, 'cli-20260929_221235.log'), LINE('0929 22:34:22.000000', '4h') + '\n');
      fs.writeFileSync(path.join(dir, 'cli-20261003_060915.log'), LINE('1003 06:11:11.000000', '88h') + '\n');
      fs.writeFileSync(path.join(dir, 'not-a-log.txt'), LINE('1231 23:59:59.000000', '999h') + '\n');
      const v = ag.createAntigravityUsage(dir, { now: () => new Date(2026, 9, 3, 7, 0, 0).getTime() }).view();
      expect(v.data.limits[0].resetsAt).toBe(new Date(new Date(2026, 9, 3, 6, 11, 11).getTime() + 88 * 3600e3).toISOString());
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
