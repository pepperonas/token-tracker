// Claude subscription usage limits (session, weekly, per-model weekly, extra
// usage) — the numbers Claude Code shows under /usage.
//
// There is no official API for this. Claude Code itself reads the undocumented
//   GET https://api.anthropic.com/api/oauth/usage
// with its own OAuth access token. This module does the same, read-only:
//
//   * The token is read FRESH from the macOS keychain (service
//     "Claude Code-credentials") or ~/.claude/.credentials.json on every
//     fetch. It is never stored, logged, cached or written back. There is
//     deliberately no refresh flow — writing to Claude Code's credentials
//     could break its login. An expired token means "start Claude Code once".
//   * The request goes to api.anthropic.com only.
//   * The schema is not guaranteed. Parsing is defensive field by field; one
//     malformed limit never drops the others, and unknown kinds are kept with
//     their raw name (codename objects outside limits[] are ignored). The
//     real response this was derived from is in
//     docs/usage-api-sample.json.
//   * The endpoint rate-limits aggressively: one server-side poller (default
//     every 5 minutes, minimum 2), exponential backoff on 429, and the UI only
//     ever reads the cached result.
//
// Single-user (local) only — see server.js.

const https = require('https');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const HOST = 'api.anthropic.com';
const PATH = '/api/oauth/usage';
const KEYCHAIN_SERVICE = 'Claude Code-credentials';
const DEFAULT_INTERVAL_MIN = 5;
const MIN_INTERVAL_MIN = 2;
const MAX_BACKOFF_MS = 60 * 60 * 1000;
const MANUAL_REFRESH_MIN_MS = 2 * 60 * 1000;
const EXPIRY_SKEW_MS = 60 * 1000;
const CACHE_KEY = 'claude_usage_cache';

// ---------------------------------------------------------------- parsing --

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const str = (v) => (typeof v === 'string' && v ? v : null);
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

const LEGACY = [
  { key: 'five_hour', kind: 'session', group: 'session' },
  { key: 'seven_day', kind: 'weekly_all', group: 'weekly' }
];

function _scopeLabel(scope) {
  if (!isObj(scope)) return null;
  const model = isObj(scope.model) ? (str(scope.model.display_name) || str(scope.model.id)) : null;
  const surface = isObj(scope.surface) ? (str(scope.surface.display_name) || str(scope.surface.id)) : str(scope.surface);
  return model || surface || null;
}

function _slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function _fromLimitsEntry(e, seen) {
  if (!isObj(e)) return null;
  const kind = str(e.kind) || 'unknown';
  const scopeLabel = _scopeLabel(e.scope);
  let id = scopeLabel ? `${kind}:${_slug(scopeLabel)}` : kind;
  // Two entries of the same kind without a telling scope still need distinct ids.
  let n = 2;
  while (seen.has(id)) id = `${kind}:${n++}`;
  seen.add(id);
  return {
    id,
    kind,
    name: kind,
    group: str(e.group),
    percentUsed: num(e.percent),
    resetsAt: str(e.resets_at),
    severity: str(e.severity),
    isActive: typeof e.is_active === 'boolean' ? e.is_active : null,
    scope: isObj(e.scope) ? e.scope : null,
    scopeLabel
  };
}

function _fromUtilizationObject(key, o, kind, group) {
  if (!isObj(o) || num(o.utilization) === null) return null;
  const used = num(o.used_dollars);
  const limit = num(o.limit_dollars);
  return {
    id: key,
    kind,
    name: key,
    group,
    percentUsed: num(o.utilization),
    resetsAt: str(o.resets_at),
    severity: null,
    isActive: null,
    scope: null,
    scopeLabel: null,
    lockedReason: str(o.locked_reason),
    dollars: used !== null || limit !== null ? { used, limit } : null
  };
}

function _extraUsage(raw) {
  // Prefer the structured `spend` block (minor units + exponent), fall back to
  // the older `extra_usage` (whole-unit credits with decimal_places).
  const s = raw.spend;
  if (isObj(s) && isObj(s.used) && isObj(s.limit)) {
    const exp = num(s.used.exponent) ?? 2;
    const scale = Math.pow(10, exp);
    const used = num(s.used.amount_minor);
    const limit = num(s.limit.amount_minor);
    return {
      enabled: s.enabled === true,
      used: used === null ? null : used / scale,
      limit: limit === null ? null : limit / scale,
      currency: str(s.used.currency) || str(s.limit.currency),
      percentUsed: num(s.percent),
      disabledReason: str(s.disabled_reason)
    };
  }
  const e = raw.extra_usage;
  if (isObj(e)) {
    const dp = num(e.decimal_places) ?? 2;
    const scale = Math.pow(10, dp);
    const used = num(e.used_credits);
    const limit = num(e.monthly_limit);
    return {
      enabled: e.is_enabled === true,
      used: used === null ? null : used / scale,
      limit: limit === null ? null : limit / scale,
      currency: str(e.currency),
      percentUsed: num(e.utilization),
      disabledReason: str(e.disabled_reason)
    };
  }
  return null;
}

function _breakdown(raw) {
  const b = raw.seven_day_breakdown;
  if (!isObj(b) || !Array.isArray(b.rows)) return null;
  const rows = b.rows
    .filter(isObj)
    .map(r => ({ key: str(r.key), label: str(r.display_name), percent: num(r.percent) }))
    .filter(r => r.key && r.percent !== null);
  return rows.length ? rows : null;
}

/**
 * Turn a decoded response into { source, limits[], extraUsage, breakdown }.
 * Never throws: a non-object payload yields an empty result (source 'none').
 */
function parseUsage(raw) {
  const out = { source: 'none', limits: [], extraUsage: null, breakdown: null };
  if (!isObj(raw)) return out;

  const seen = new Set();
  if (Array.isArray(raw.limits) && raw.limits.length > 0) {
    for (const e of raw.limits) {
      try {
        const l = _fromLimitsEntry(e, seen);
        if (l) out.limits.push(l);
      } catch { /* one bad entry must not drop the rest */ }
    }
  }

  if (out.limits.length > 0) {
    out.source = 'limits';
  } else {
    for (const { key, kind, group } of LEGACY) {
      const l = _fromUtilizationObject(key, raw[key], kind, group);
      if (l) { out.limits.push(l); seen.add(key); }
    }
    if (out.limits.length > 0) out.source = 'legacy';
  }

  // The ~20 codename objects next to limits[] (tangelo, iguana_necktie, …) are
  // deliberately ignored: iguana_necktie turned out to be a one-off promotion
  // (user decision 2026-10-04), and a codename says nothing a user could act
  // on. Unknown kinds INSIDE limits[] are still shown with their raw name.

  try { out.extraUsage = _extraUsage(raw); } catch { out.extraUsage = null; }
  try { out.breakdown = _breakdown(raw); } catch { out.breakdown = null; }
  return out;
}

class UsageError extends Error {
  constructor(code) { super(code); this.code = code; }
}

function parseUsageText(text) {
  let raw;
  try { raw = JSON.parse(text); } catch { throw new UsageError('BAD_JSON'); }
  return parseUsage(raw);
}

// ------------------------------------------------------------------ token --

function _defaultReadKeychain() {
  return execFileSync('security', ['find-generic-password', '-s', KEYCHAIN_SERVICE, '-w'], {
    encoding: 'utf8', timeout: 10000, stdio: ['ignore', 'pipe', 'ignore']
  }).trim();
}

function _defaultReadFile() {
  return fs.readFileSync(path.join(os.homedir(), '.claude', '.credentials.json'), 'utf8');
}

/**
 * Read the current access token. Returns { token, expiresAt, source } or
 * { error: 'NO_TOKEN' | 'TOKEN_EXPIRED' }. Sources are tried in order; an
 * expired one is skipped (on macOS the file is often a stale copy).
 */
function readToken(opts = {}) {
  const platform = opts.platform || os.platform();
  const now = opts.now ?? Date.now();
  const sources = [];
  if (platform === 'darwin') sources.push(['keychain', opts.readKeychain || _defaultReadKeychain]);
  sources.push(['file', opts.readFile || _defaultReadFile]);

  let sawExpired = false;
  for (const [source, read] of sources) {
    let oauth;
    try { oauth = JSON.parse(read()).claudeAiOauth; } catch { continue; }
    if (!isObj(oauth) || !str(oauth.accessToken)) continue;
    const expiresAt = num(oauth.expiresAt);
    if (expiresAt !== null && expiresAt <= now + EXPIRY_SKEW_MS) { sawExpired = true; continue; }
    return { token: oauth.accessToken, expiresAt, source };
  }
  return { error: sawExpired ? 'TOKEN_EXPIRED' : 'NO_TOKEN' };
}

// ---------------------------------------------------------------- request --

/** One GET to the usage endpoint. Resolves { status, body, headers }; never rejects. */
function requestUsage(token) {
  return new Promise((resolve) => {
    const req = https.request({
      hostname: HOST,
      path: PATH,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'anthropic-beta': 'oauth-2025-04-20',
        'User-Agent': 'claude-token-tracker'
      }
    }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', c => { if (body.length < 1e6) body += c; });
      res.on('end', () => resolve({ status: res.statusCode, body, headers: res.headers }));
    });
    req.on('error', () => resolve({ status: 0, body: '', headers: {} }));
    req.setTimeout(15000, () => req.destroy());
    req.end();
  });
}

// ----------------------------------------------------------------- poller --

function intervalFromEnv(value) {
  const n = parseFloat(value);
  const minutes = Number.isFinite(n) ? Math.max(MIN_INTERVAL_MIN, n) : DEFAULT_INTERVAL_MIN;
  return Math.round(minutes * 60 * 1000);
}

function _retryAfterMs(headers) {
  const v = headers && (headers['retry-after'] ?? headers['Retry-After']);
  const n = parseFloat(v);
  return Number.isFinite(n) && n > 0 ? n * 1000 : 0;
}

/**
 * The polling state machine. Every dependency is injected so the tests can
 * drive time, the token source and the endpoint.
 */
function createPoller(deps) {
  const intervalMs = deps.intervalMs;
  const now = deps.now || Date.now;
  const log = deps.log || (() => {});
  const state = {
    data: null,
    fetchedAt: null,      // ms of the last successful fetch
    lastAttemptAt: null,  // ms
    error: null,          // code of the last failed attempt, null after success
    nextAttemptAt: null,  // ms
    backoffMs: 0,
    inFlight: null
  };

  try {
    const c = deps.loadCache && deps.loadCache();
    if (c && isObj(c.data) && Array.isArray(c.data.limits) && c.fetchedAt) {
      state.data = c.data;
      state.fetchedAt = Date.parse(c.fetchedAt);
    }
  } catch { /* corrupt cache = no cache */ }

  function _fail(code, extraDelay = 0) {
    state.error = code;
    if (code === 'RATE_LIMITED') {
      state.backoffMs = state.backoffMs ? Math.min(state.backoffMs * 2, MAX_BACKOFF_MS) : Math.min(intervalMs * 2, MAX_BACKOFF_MS);
      state.nextAttemptAt = now() + Math.max(state.backoffMs, extraDelay);
    } else {
      state.nextAttemptAt = now() + intervalMs;
    }
    log(`Claude usage: fetch failed (${code})`);
  }

  async function _run() {
    state.lastAttemptAt = now();
    const tok = deps.readToken();
    if (!tok || !tok.token) return _fail((tok && tok.error) || 'NO_TOKEN');

    let res;
    try { res = await deps.request(tok.token); } catch { res = null; }
    if (!res || !res.status) return _fail('NETWORK');
    if (res.status === 429) return _fail('RATE_LIMITED', _retryAfterMs(res.headers));
    if (res.status === 401 || res.status === 403) return _fail('TOKEN_EXPIRED');
    if (res.status !== 200) return _fail(`HTTP_${res.status}`);

    let data;
    try { data = parseUsageText(res.body); } catch (e) { return _fail(e.code || 'BAD_JSON'); }
    state.data = data;
    state.fetchedAt = now();
    state.error = null;
    state.backoffMs = 0;
    state.nextAttemptAt = now() + intervalMs;
    try { deps.saveCache && deps.saveCache({ data, fetchedAt: new Date(state.fetchedAt).toISOString() }); } catch { /* cache is best effort */ }
  }

  function fetchNow() {
    if (!state.inFlight) state.inFlight = _run().finally(() => { state.inFlight = null; });
    return state.inFlight;
  }

  async function refresh() {
    const t = now();
    const tooSoon = state.lastAttemptAt !== null && t - state.lastAttemptAt < MANUAL_REFRESH_MIN_MS;
    const backingOff = state.backoffMs > 0 && state.nextAttemptAt !== null && t < state.nextAttemptAt;
    if (tooSoon || backingOff) return { throttled: true, view: view() };
    await fetchNow();
    return { throttled: false, view: view() };
  }

  function view() {
    const t = now();
    let status;
    if (state.data) {
      const old = state.fetchedAt !== null && t - state.fetchedAt > 2 * intervalMs;
      status = state.error || old ? 'stale' : 'ok';
    } else if (state.error) {
      status = 'error';
    } else {
      status = 'loading';
    }
    const iso = (ms) => (ms === null ? null : new Date(ms).toISOString());
    return {
      enabled: true,
      status,
      error: state.error,
      data: state.data,
      fetchedAt: iso(state.fetchedAt),
      lastAttemptAt: iso(state.lastAttemptAt),
      nextAttemptAt: iso(state.nextAttemptAt),
      intervalMinutes: intervalMs / 60000
    };
  }

  let timer = null;
  function start() {
    const loop = async () => {
      if (state.nextAttemptAt === null || now() >= state.nextAttemptAt) await fetchNow();
      const wait = Math.max(5000, (state.nextAttemptAt ?? now() + intervalMs) - now());
      timer = setTimeout(loop, wait);
      if (timer.unref) timer.unref();
    };
    loop();
  }
  function stop() { if (timer) clearTimeout(timer); timer = null; }

  return { fetchNow, refresh, view, start, stop, _state: state };
}

/** Wire the poller to the real keychain, the endpoint and the metadata table. */
function createDefaultPoller(db) {
  return createPoller({
    intervalMs: intervalFromEnv(process.env.CLAUDE_USAGE_POLL_MINUTES),
    readToken: () => readToken(),
    request: requestUsage,
    loadCache: () => {
      const v = db.getMetadata(CACHE_KEY);
      return v ? JSON.parse(v) : null;
    },
    saveCache: (c) => db.setMetadata(CACHE_KEY, JSON.stringify(c)),
    log: (msg) => console.warn(msg)
  });
}

module.exports = {
  parseUsage,
  parseUsageText,
  readToken,
  requestUsage,
  createPoller,
  createDefaultPoller,
  intervalFromEnv,
  UsageError,
  CACHE_KEY
};
