const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

let baseUrl, serverInstance, tmpDir;
const get = (p) => new Promise((resolve, reject) => {
  http.get(baseUrl + p, (res) => {
    let b = ''; res.on('data', c => { b += c; });
    res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(b) }));
  }).on('error', reject);
});

const DAY = 86400e3, HOUR = 3600e3;
const line = (ms, rl) => JSON.stringify({ timestamp: new Date(ms).toISOString(), type: 'event_msg', payload: { type: 'token_count', rate_limits: rl } });
const RL = (p5, r5, pw, rw) => ({
  limit_id: 'codex',
  primary: { used_percent: p5, window_minutes: 300, resets_at: Math.floor(r5 / 1000) },
  secondary: { used_percent: pw, window_minutes: 10080, resets_at: Math.floor(rw / 1000) },
  plan_type: 'plus'
});

describe('GET /api/usage-limits — forecast', () => {
  const now = Date.now();
  const curEnd = now + 3 * DAY, prevEnd = curEnd - 7 * DAY;
  const r5 = now + 2 * HOUR;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tracker-fc-api-'));
    fs.mkdirSync(path.join(tmpDir, 'claude', 'projects'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'antigravity', 'log'), { recursive: true });
    const day = path.join(tmpDir, 'codex', 'sessions', '2026', '10', '05');
    fs.mkdirSync(day, { recursive: true });
    fs.writeFileSync(path.join(day, 'rollout-t.jsonl'), [
      line(now - 7.5 * DAY, RL(0, r5, 10, prevEnd)),
      line(now - 6 * DAY, RL(0, r5, 30, prevEnd)),
      line(now - 5 * DAY, RL(0, r5, 60, prevEnd)),
      line(now - 3.5 * DAY, RL(0, r5, 5, curEnd)),
      line(now - DAY, RL(10, r5, 20, curEnd))
    ].join('\n') + '\n');
    process.env.DB_PATH = path.join(tmpDir, 'tracker.db');
    process.env.CLAUDE_DIR = path.join(tmpDir, 'claude');
    process.env.CODEX_DIR = path.join(tmpDir, 'codex');
    process.env.ANTIGRAVITY_DIR = path.join(tmpDir, 'antigravity');
    for (const m of ['../lib/config', '../lib/db', '../lib/aggregator', '../server']) delete require.cache[require.resolve(m)];
    const port = 16010 + Math.floor(Math.random() * 1000);
    baseUrl = `http://localhost:${port}`;
    serverInstance = await require('../server').startServer(port);
  });

  afterAll(() => {
    if (serverInstance) serverInstance.close();
    try { require('../lib/watcher').stop(); } catch { /* not started */ }
    try { require('../lib/db').closeDB(); } catch { /* closed */ }
    for (const k of ['DB_PATH', 'CLAUDE_DIR', 'CODEX_DIR', 'ANTIGRAVITY_DIR']) delete process.env[k];
    for (const m of ['../lib/config', '../lib/db', '../lib/aggregator', '../server']) delete require.cache[require.resolve(m)];
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  async function codexView() {
    for (let i = 0; i < 40; i++) {
      const { body } = await get('/api/usage-limits');
      if (body.codex && body.codex.status === 'ok') return body.codex;
      await new Promise(r => setTimeout(r, 100));
    }
    throw new Error('codex view never left loading');
  }

  it('weekly Codex limit: forecast from the previous window', async () => {
    const v = await codexView();
    const week = v.data.limits.find(l => l.id === 'codex:10080');
    expect(week.forecast.basis).toBe('snapshots');
    expect(week.forecast.atReset.median).toBe(70);     // 20 + (60 − 10)
    expect(week.forecast.status).toBe('reserve');
    expect(week.forecast.series.ghosts).toHaveLength(1);
  });

  it('5-hour Codex limit: linear, no series', async () => {
    const v = await codexView();
    const s = v.data.limits.find(l => l.id === 'codex:300');
    expect(s.forecast.basis).toBe('linear');
    expect(s.forecast.series).toBeNull();
  });

  it('Antigravity carries no forecast and Claude stays off under the test runner', async () => {
    const { body } = await get('/api/usage-limits');
    expect(body.claude).toEqual({ enabled: false });
    expect(JSON.stringify(body.antigravity)).not.toContain('forecast');
  });
});
