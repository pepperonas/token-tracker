// Google Antigravity quota state, read from Antigravity's own CLI logs.
//
// Antigravity fetches its quota from an internal Google endpoint but never
// writes the numbers anywhere. What it does log is the moment a quota runs
// out (glog format, local time, the year only in the file name):
//
//   E0929 22:34:22.784686 25522 errorreport.go:224] … RESOURCE_EXHAUSTED
//     (code 429): Individual quota reached. … Resets in 4h39m10s.
//
// So this module can say "quota exhausted, resets at …" — and nothing about
// percentages. That is deliberate (user decision 2026-10-04): no undocumented
// endpoint, no token. Logs only, no network.

const fs = require('fs');
const path = require('path');

const MAX_FILES = 10;
const MAX_BYTES_PER_FILE = 8 * 1024 * 1024; // read the tail only
const CACHE_MS = 30 * 1000;

const LINE_RE = /^[IWEF](\d{2})(\d{2}) (\d{2}):(\d{2}):(\d{2})\.\d+\s.*RESOURCE_EXHAUSTED.*?(?:\.\s*)?Resets in ((?:\d+h)?(?:\d+m)?(?:[\d.]+s)?)/;
const FILE_RE = /^cli-(\d{4})(\d{2})(\d{2})_\d{6}\.log$/;

/** "4h39m10s" → milliseconds, null if nothing parses. */
function parseDuration(s) {
  if (typeof s !== 'string' || !s) return null;
  const m = s.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:([\d.]+)s)?$/);
  if (!m || (!m[1] && !m[2] && !m[3])) return null;
  return ((+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (parseFloat(m[3]) || 0)) * 1000;
}

/**
 * Quota-exhausted events in one log file. Pure — exported for tests.
 * `fileYear`/`fileMonth` come from the file name: glog lines carry no year,
 * and a log started in December can contain January lines.
 */
function parseLog(text, fileYear, fileMonth) {
  const events = [];
  for (const line of String(text).split('\n')) {
    if (!line.includes('RESOURCE_EXHAUSTED') || !line.includes('Resets in')) continue;
    const m = line.match(LINE_RE);
    if (!m) continue;
    const month = +m[1];
    const year = month < fileMonth ? fileYear + 1 : fileYear;
    const at = new Date(year, month - 1, +m[2], +m[3], +m[4], +m[5]).getTime(); // local time, like glog
    const dur = parseDuration(m[6]);
    if (!Number.isFinite(at) || dur === null) continue;
    events.push({ at, resetsAt: at + dur });
  }
  return events;
}

/** Shared provider view (same shape as the Claude view). */
function buildView(events, now = Date.now()) {
  const latest = events.reduce((a, e) => (!a || e.at > a.at ? e : a), null);
  const active = latest && latest.resetsAt > now ? latest : null;
  const limits = active ? [{
    id: 'quota',
    kind: 'exhausted',
    name: 'quota',
    percentUsed: 100,
    resetsAt: new Date(active.resetsAt).toISOString()
  }] : [];
  return {
    enabled: true,
    status: 'ok',
    error: null,
    fetchedAt: latest ? new Date(latest.at).toISOString() : null,
    data: {
      source: 'antigravity-logs',
      limits,
      extraUsage: null,
      breakdown: null,
      // When the quota last ran out, even if it has reset since — the only
      // usage signal these logs carry.
      lastExhaustedAt: latest ? new Date(latest.at).toISOString() : null,
      percentAvailable: false
    }
  };
}

function createAntigravityUsage(logDir, opts = {}) {
  const now = opts.now || Date.now;
  let cache = null;
  return {
    view() {
      const t = now();
      if (cache && t - cache.at < CACHE_MS) return cache.view;
      let view;
      let names;
      try { names = fs.readdirSync(logDir); } catch { names = null; }
      if (!names) {
        view = { enabled: false };
      } else {
        const events = [];
        const logs = names.filter(n => FILE_RE.test(n)).sort().slice(-MAX_FILES);
        for (const n of logs) {
          const [, y, mo] = n.match(FILE_RE);
          try {
            const file = path.join(logDir, n);
            const size = fs.statSync(file).size;
            const fd = fs.openSync(file, 'r');
            try {
              const len = Math.min(size, MAX_BYTES_PER_FILE);
              const buf = Buffer.alloc(len);
              fs.readSync(fd, buf, 0, len, size - len);
              events.push(...parseLog(buf.toString('utf8'), +y, +mo));
            } finally { fs.closeSync(fd); }
          } catch { /* skip unreadable log */ }
        }
        view = buildView(events, t);
      }
      cache = { at: t, view };
      return view;
    }
  };
}

module.exports = { parseDuration, parseLog, buildView, createAntigravityUsage };
