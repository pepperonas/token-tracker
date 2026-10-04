// Usage limits reported by a sync agent (multi-user mode).
//
// On a hosted instance the server cannot read anyone's keychain or logs, so
// the agent on the user's machine reads them with the same modules as the
// local tracker and posts the finished views with its sync. Only percentages,
// reset times and labels travel — never a token. The views are untrusted
// input: everything is re-built from a whitelist with type and length checks.

const PROVIDERS = ['claude', 'codex', 'antigravity'];
const SILENT_AFTER_MS = 20 * 60 * 1000; // agent sends every ~5 min
const STATUSES = new Set(['loading', 'ok', 'stale', 'error', 'empty']);

const str = (v, max = 80) => (typeof v === 'string' && v ? v.slice(0, max) : null);
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const bool = (v) => (typeof v === 'boolean' ? v : null);
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function _limit(l) {
  if (!isObj(l)) return null;
  const out = {
    id: str(l.id), kind: str(l.kind, 40), name: str(l.name), group: str(l.group, 40),
    percentUsed: num(l.percentUsed), resetsAt: str(l.resetsAt, 40),
    scopeLabel: str(l.scopeLabel), limitId: str(l.limitId), windowMinutes: num(l.windowMinutes),
    reset: bool(l.reset)
  };
  return out.id || out.kind ? out : null;
}

function sanitizeView(v) {
  if (!isObj(v) || v.enabled !== true) return { enabled: false };
  const d = isObj(v.data) ? v.data : null;
  const view = {
    enabled: true,
    status: STATUSES.has(v.status) ? v.status : 'error',
    error: str(v.error, 40),
    fetchedAt: str(v.fetchedAt, 40),
    data: null
  };
  if (d) {
    const x = isObj(d.extraUsage) ? d.extraUsage : null;
    const c = isObj(d.credits) ? d.credits : null;
    view.data = {
      source: str(d.source, 30),
      limits: (Array.isArray(d.limits) ? d.limits : []).slice(0, 30).map(_limit).filter(Boolean),
      extraUsage: x ? { enabled: x.enabled === true, used: num(x.used), limit: num(x.limit), currency: str(x.currency, 8), percentUsed: num(x.percentUsed), disabledReason: str(x.disabledReason, 40) } : null,
      breakdown: Array.isArray(d.breakdown)
        ? d.breakdown.slice(0, 10).filter(isObj).map(r => ({ key: str(r.key, 40), label: str(r.label), percent: num(r.percent) })).filter(r => r.key && r.percent !== null)
        : null,
      plan: str(d.plan, 30),
      credits: c ? { hasCredits: c.hasCredits === true, unlimited: c.unlimited === true, balance: num(c.balance) } : null,
      reached: str(d.reached, 40),
      lastExhaustedAt: str(d.lastExhaustedAt, 40),
      percentAvailable: bool(d.percentAvailable)
    };
  }
  return view;
}

/**
 * Merge a report into what is stored for the user. A provider is replaced only
 * by an ENABLED view: a second machine without Codex must not wipe the Codex
 * numbers the first one reported.
 */
function mergeReport(stored, report, receivedAt, deviceName) {
  const out = isObj(stored) ? { ...stored } : {};
  if (!isObj(report)) return out;
  for (const p of PROVIDERS) {
    const v = sanitizeView(report[p]);
    if (v.enabled) out[p] = { view: v, receivedAt, device: str(deviceName, 60) };
  }
  return out;
}

/** The /api/usage-limits answer for a user, from what their agents reported. */
function viewsFromStore(stored, now = Date.now()) {
  const out = {};
  for (const p of PROVIDERS) {
    const e = isObj(stored) ? stored[p] : null;
    if (!e || !isObj(e.view) || !e.view.enabled) { out[p] = { enabled: false }; continue; }
    const view = { ...e.view, via: 'sync', receivedAt: e.receivedAt || null, device: e.device || null };
    const silent = !e.receivedAt || now - Date.parse(e.receivedAt) > SILENT_AFTER_MS;
    if (silent) { view.status = view.data ? 'stale' : 'error'; view.error = 'AGENT_SILENT'; }
    out[p] = view;
  }
  return out;
}

module.exports = { sanitizeView, mergeReport, viewsFromStore, PROVIDERS, SILENT_AFTER_MS };
