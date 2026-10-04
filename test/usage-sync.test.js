const fs = require('fs');
const os = require('os');
const path = require('path');
const store = require('../lib/usage-limits-store');
const { buildUsageBundle, MODULES } = require('../lib/agent-usage-bundle');
const { loadFrontend } = require('./helpers/frontend');

const ROOT = path.join(__dirname, '..');
const view = (pct) => ({ enabled: true, status: 'ok', fetchedAt: '2026-10-04T00:00:00Z',
  data: { source: 'limits', limits: [{ id: 'session', kind: 'session', percentUsed: pct }] } });

describe('usage-limits-store', () => {
  it('rebuilds a view from a whitelist', () => {
    const v = store.sanitizeView({
      enabled: true, status: 'ok', fetchedAt: '2026-10-04T00:00:00Z', token: 'sk-ant-oat01-x', lastAttemptAt: 'x',
      data: { source: 'limits', raw: { a: 1 }, limits: [{ id: 'session', kind: 'session', percentUsed: 4, accessToken: 'x' }] }
    });
    expect(v).toEqual({
      enabled: true, status: 'ok', error: null, fetchedAt: '2026-10-04T00:00:00Z',
      data: expect.objectContaining({ source: 'limits', limits: [expect.objectContaining({ id: 'session', percentUsed: 4 })] })
    });
    expect(JSON.stringify(v)).not.toMatch(/sk-ant|accessToken|raw/);
  });

  it('caps lengths and counts', () => {
    const v = store.sanitizeView({ enabled: true, status: 'weird', error: 'E'.repeat(500),
      data: { limits: Array.from({ length: 100 }, (_, i) => ({ id: 'x' + i, name: 'n'.repeat(500) })) } });
    expect(v.status).toBe('error');
    expect(v.error.length).toBe(40);
    expect(v.data.limits).toHaveLength(30);
    expect(v.data.limits[0].name.length).toBe(80);
  });

  it('turns anything that is not an enabled object into a disabled view', () => {
    for (const x of [null, 1, 'x', [], {}, { enabled: 'yes' }]) expect(store.sanitizeView(x)).toEqual({ enabled: false });
  });

  it('merges per provider and never lets a disabled report wipe stored data', () => {
    let s = store.mergeReport(null, { claude: view(10), codex: view(50) }, '2026-10-04T00:00:00Z', 'mac');
    s = store.mergeReport(s, { claude: view(20), codex: { enabled: false } }, '2026-10-04T00:05:00Z', 'vps');
    expect(s.claude.view.data.limits[0].percentUsed).toBe(20);
    expect(s.claude.device).toBe('vps');
    expect(s.codex.view.data.limits[0].percentUsed).toBe(50);
    expect(s.codex.device).toBe('mac');
  });

  it('marks a provider whose agent went quiet as stale', () => {
    const s = store.mergeReport(null, { claude: view(10) }, '2026-10-04T00:00:00Z', 'mac');
    const fresh = store.viewsFromStore(s, Date.parse('2026-10-04T00:10:00Z'));
    expect(fresh.claude).toMatchObject({ status: 'ok', via: 'sync', receivedAt: '2026-10-04T00:00:00Z' });
    const quiet = store.viewsFromStore(s, Date.parse('2026-10-04T00:21:00Z'));
    expect(quiet.claude).toMatchObject({ status: 'stale', error: 'AGENT_SILENT' });
    expect(quiet.codex).toEqual({ enabled: false });
  });

  it('answers all-disabled when nothing was ever reported', () => {
    expect(store.viewsFromStore(null)).toEqual({ claude: { enabled: false }, codex: { enabled: false }, antigravity: { enabled: false } });
  });
});

describe('agent usage bundle', () => {
  it('bundles the three readers into one loadable file', () => {
    const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'bundle-')), 'usage-lib.js');
    fs.writeFileSync(f, buildUsageBundle());
    const lib = require(f);
    expect(typeof lib.claude.createPoller).toBe('function');
    expect(typeof lib.claude.readToken).toBe('function');
    expect(typeof lib.codex.createCodexUsage).toBe('function');
    expect(typeof lib.antigravity.createAntigravityUsage).toBe('function');
    fs.rmSync(path.dirname(f), { recursive: true, force: true });
  });

  it('only works because the readers need nothing but Node built-ins', () => {
    const builtins = new Set(require('module').builtinModules);
    for (const [, file] of MODULES) {
      const src = fs.readFileSync(path.join(ROOT, 'lib', file), 'utf8');
      const reqs = [...src.matchAll(/require\(['"]([^'"]+)['"]\)/g)].map(m => m[1]);
      expect(reqs.filter(r => !builtins.has(r))).toEqual([]);
    }
  });

  it('cannot end the installers\' here-documents early', () => {
    const lines = buildUsageBundle().split('\n');
    expect(lines.filter(l => l.trim() === 'SYNCAGENTEOF')).toEqual([]); // bash heredoc delimiter
    expect(lines.filter(l => l.startsWith("'@"))).toEqual([]);          // PowerShell here-string end
  });
});

describe('sync agent wiring', () => {
  const agent = fs.readFileSync(path.join(ROOT, 'sync-agent', 'index.js'), 'utf8');
  const server = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');

  it('both installers write usage-lib.js next to index.js', () => {
    expect(server).toMatch(/cat > "\\\$INSTALL_DIR\/usage-lib\.js" << 'SYNCAGENTEOF'\n\$\{SYNC_AGENT_USAGE_LIB\}/);
    expect(server).toMatch(/\$usageLib = @'\n\$\{SYNC_AGENT_USAGE_LIB\}\n'@/);
  });

  it('the agent loads the bundle, starts the reporter and sends under usageLimits', () => {
    expect(agent).toContain("require('./usage-lib.js')");
    expect(agent).toMatch(/\n  startUsageReporter\(config\);\n/);
    expect(agent).toContain('{ usageLimits: report }');
  });

  it('the agent asks the local tracker before calling the Claude endpoint itself', () => {
    const tick = agent.slice(agent.indexOf('const tick = async'), agent.indexOf('tick();'));
    expect(tick.indexOf('getLocalClaudeView')).toBeGreaterThan(-1);
    expect(tick.indexOf('getLocalClaudeView')).toBeLessThan(tick.indexOf('claude.fetchNow'));
  });
});

describe('frontend — quiet agent', () => {
  it('says the agent went quiet instead of showing old numbers silently', () => {
    const F = loadFrontend();
    F.setLang('de');
    const text = F.usageProviderStatus('codex', { enabled: true, status: 'stale', error: 'AGENT_SILENT', receivedAt: '2026-10-04T08:15:00Z', data: { limits: [] } });
    expect(text).toMatch(/^Sync-Agent meldet sich nicht \(zuletzt .*10:15\)$/);
  });
});
