// OpenAI Codex rate limits, read from Codex's own session logs.
//
// Codex writes a `rate_limits` object into its rollout files
// (~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl) with every token_count
// event — no network call and no token needed:
//
//   { limit_id: 'codex' | 'base_model_inference' | 'premium' | …,
//     primary:   { used_percent, window_minutes, resets_at (epoch s) } | null,
//     secondary: { … } | null,
//     credits:   { has_credits, unlimited, balance } | null,
//     plan_type, rate_limit_reached_type }
//
// window_minutes 300 is the 5-hour window, 10080 the week. The newest snapshot
// per limit_id wins. These numbers are only as current as the last Codex
// response on THIS machine: a window whose reset time has passed is reported
// as `reset` with no percentage instead of an outdated figure.

const fs = require('fs');
const path = require('path');
const { StringDecoder } = require('string_decoder');

const MAX_AGE_MS = 8 * 24 * 60 * 60 * 1000; // a week window plus slack
const MAX_FILES = 40;
const CACHE_MS = 30 * 1000;

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function _listRollouts(sessionsDir, now) {
  const out = [];
  let years;
  try { years = fs.readdirSync(sessionsDir); } catch { return out; }
  for (const y of years) {
    for (const m of _dirs(path.join(sessionsDir, y))) {
      for (const d of _dirs(path.join(sessionsDir, y, m))) {
        const dir = path.join(sessionsDir, y, m, d);
        let names;
        try { names = fs.readdirSync(dir); } catch { continue; }
        for (const n of names) {
          if (!n.startsWith('rollout-') || !n.endsWith('.jsonl')) continue;
          const file = path.join(dir, n);
          try {
            const mtime = fs.statSync(file).mtimeMs;
            if (now - mtime <= MAX_AGE_MS) out.push({ file, mtime });
          } catch { /* vanished */ }
        }
      }
    }
  }
  return out.sort((a, b) => b.mtime - a.mtime).slice(0, MAX_FILES);
}

function _dirs(p) {
  try { return fs.readdirSync(p).filter(n => /^\d+$/.test(n)); } catch { return []; }
}

/** Fold one JSONL line into `best` (Map limitId → { at, rl }) if it is newer. */
function _absorb(line, best) {
  if (!line.includes('"rate_limits"')) return;
  let o;
  try { o = JSON.parse(line); } catch { return; }
  const rl = isObj(o.payload) ? o.payload.rate_limits : (isObj(o) ? o.rate_limits : null);
  if (!isObj(rl)) return;
  const at = typeof o.timestamp === 'string' ? o.timestamp : null;
  if (!at) return;
  const id = typeof rl.limit_id === 'string' && rl.limit_id ? rl.limit_id : 'default';
  const prev = best.get(id);
  if (!prev || at > prev.at) best.set(id, { at, rl });
}

/**
 * Newest rate_limits snapshot per limit_id from the given JSONL text blobs.
 * Pure — exported for tests. Returns Map(limitId → { at, rl }).
 */
function latestSnapshots(texts) {
  const best = new Map();
  for (const text of texts) {
    for (const line of String(text).split('\n')) _absorb(line, best);
  }
  return best;
}

function _window(limitId, w, now) {
  if (!isObj(w)) return null;
  const windowMinutes = num(w.window_minutes);
  const resetsSec = num(w.resets_at);
  const resetsAt = resetsSec === null ? null : new Date(resetsSec * 1000).toISOString();
  const reset = resetsSec !== null && resetsSec * 1000 <= now;
  const kind = windowMinutes === 300 ? 'session' : windowMinutes === 10080 ? 'weekly' : 'window';
  return {
    id: `${limitId}:${windowMinutes ?? 'x'}`,
    kind,
    name: limitId,
    limitId,
    windowMinutes,
    percentUsed: reset ? null : num(w.used_percent),
    resetsAt,
    reset
  };
}

/** Turn snapshots into the shared provider view (same shape as the Claude view). */
function buildView(snapshots, now = Date.now()) {
  if (!snapshots || snapshots.size === 0) {
    return { enabled: true, status: 'empty', error: null, fetchedAt: null, data: { source: 'codex-logs', limits: [], extraUsage: null, breakdown: null } };
  }
  const limits = [];
  let asOf = null, plan = null, credits = null, reached = null;
  // `codex` first, then alphabetical — stable order for the UI.
  const ids = [...snapshots.keys()].sort((a, b) => (a === 'codex' ? -1 : b === 'codex' ? 1 : a.localeCompare(b)));
  for (const id of ids) {
    const { at, rl } = snapshots.get(id);
    if (!asOf || at > asOf) asOf = at;
    for (const w of [rl.primary, rl.secondary]) {
      try {
        const l = _window(id, w, now);
        if (l) limits.push(l);
      } catch { /* one bad window must not drop the rest */ }
    }
    if (typeof rl.plan_type === 'string') plan = rl.plan_type;
    if (isObj(rl.credits) && (rl.credits.has_credits || rl.credits.unlimited || rl.credits.balance !== undefined)) {
      const bal = parseFloat(rl.credits.balance);
      credits = { hasCredits: rl.credits.has_credits === true, unlimited: rl.credits.unlimited === true, balance: Number.isFinite(bal) ? bal : null };
    }
    if (typeof rl.rate_limit_reached_type === 'string' && rl.rate_limit_reached_type) reached = rl.rate_limit_reached_type;
  }
  // Short windows first: 5 h, then week, then anything else.
  const order = { session: 0, weekly: 1, window: 2 };
  limits.sort((a, b) => (order[a.kind] - order[b.kind]) || (a.limitId === 'codex' ? -1 : b.limitId === 'codex' ? 1 : a.limitId.localeCompare(b.limitId)));
  return {
    enabled: true,
    status: 'ok',
    error: null,
    fetchedAt: asOf,
    data: { source: 'codex-logs', limits, extraUsage: null, breakdown: null, plan, credits, reached }
  };
}

const CHUNK = 4 * 1024 * 1024;

/**
 * Incremental reader. The rollout files are large (a single session reached
 * 62 MB, a week ~250 MB), so each file is read ONCE, asynchronously and in
 * chunks, and afterwards only the bytes appended since. view() never blocks:
 * it returns the current state and, at most every 30 s, starts a background
 * catch-up. Until the first scan has finished the status is 'loading'.
 */
function createCodexUsage(sessionsDir, opts = {}) {
  const now = opts.now || Date.now;
  const chunk = opts.chunkSize || CHUNK; // tests shrink it to force split characters
  const files = new Map(); // file → { offset, rest, best }
  let scanned = false;
  let running = null;
  let lastStart = 0;
  let failed = false;

  async function _readFrom(file, st) {
    const fh = await fs.promises.open(file, 'r');
    try {
      const { size } = await fh.stat();
      if (size < st.offset) { st.offset = 0; st.rest = ''; st.best = new Map(); st.decoder = new StringDecoder('utf8'); }
      const buf = Buffer.alloc(chunk);
      while (st.offset < size) {
        const { bytesRead } = await fh.read(buf, 0, Math.min(chunk, size - st.offset), st.offset);
        if (bytesRead <= 0) break;
        st.offset += bytesRead;
        // The decoder carries a multi-byte character split across two chunks.
        const text = st.rest + st.decoder.write(buf.subarray(0, bytesRead));
        const lines = text.split('\n');
        st.rest = lines.pop();            // possibly incomplete — finished by the next chunk
        if (st.rest.length > Math.max(chunk, CHUNK)) st.rest = ''; // a runaway line holds nothing we need
        for (const line of lines) _absorb(line, st.best);
      }
    } finally {
      await fh.close();
    }
  }

  async function _scan() {
    const t = now();
    const list = _listRollouts(sessionsDir, t);
    const keep = new Set(list.map(f => f.file));
    for (const f of [...files.keys()]) if (!keep.has(f)) files.delete(f);
    for (const { file } of list) {
      let st = files.get(file);
      if (!st) { st = { offset: 0, rest: '', best: new Map(), decoder: new StringDecoder('utf8') }; files.set(file, st); }
      try { await _readFrom(file, st); } catch { /* unreadable this round */ }
    }
    scanned = true;
  }

  function _kick() {
    if (running || now() - lastStart < CACHE_MS) return running;
    lastStart = now();
    running = _scan()
      .then(() => { failed = false; })
      .catch(() => { failed = true; })
      .finally(() => { running = null; });
    return running;
  }

  return {
    /** Await the current/next scan — for tests and warm-up. */
    refresh() { lastStart = 0; return _kick() || Promise.resolve(); },
    view() {
      if (!fs.existsSync(sessionsDir)) return { enabled: false };
      _kick();
      if (!scanned) return { enabled: true, status: failed ? 'error' : 'loading', error: failed ? 'READ_FAILED' : null, fetchedAt: null, data: null };
      const merged = new Map();
      for (const st of files.values()) {
        for (const [id, snap] of st.best) {
          const prev = merged.get(id);
          if (!prev || snap.at > prev.at) merged.set(id, snap);
        }
      }
      return buildView(merged, now());
    }
  };
}

module.exports = { latestSnapshots, buildView, createCodexUsage };
