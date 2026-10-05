// Wires the pure forecast (lib/usage-forecast.js) to its data: the user's
// aggregator (Claude cost history), the usage_snapshots table and — locally —
// Codex's own log series. One result per user is cached for 60 s and reused
// while no limit value changed.

const { attachForecasts, snapshotsFromView, makeCostIndex, DAY } = require('./usage-forecast');

const HISTORY_MS = 36 * DAY;  // the running week, 4 past weeks and slack
const CACHE_MS = 60 * 1000;

function _signature(views) {
  const parts = [];
  for (const p of ['claude', 'codex']) {
    const v = views && views[p];
    const ls = v && v.data && Array.isArray(v.data.limits) ? v.data.limits : [];
    for (const l of ls) parts.push(`${p}:${l.id}:${l.percentUsed}:${l.resetsAt}:${l.reset ? 1 : 0}`);
  }
  return parts.join('|');
}

function createForecastService(deps) {
  const now = deps.now || Date.now;
  const cache = new Map();

  function attach({ userId, cacheKey, views, aggregator }) {
    const t = now();
    const sig = _signature(views);
    const hit = cache.get(cacheKey);
    if (hit && hit.sig === sig && t - hit.at < CACHE_MS) return hit.out;

    const since = t - HISTORY_MS;
    const costs = new Map();
    const ctx = {
      now: t,
      costIndexFor(scopeLabel) {
        const key = scopeLabel || '';
        if (costs.has(key)) return costs.get(key);
        let res = aggregator.getCostPoints(since);
        let mapped = true;
        if (scopeLabel) {
          const needle = scopeLabel.toLowerCase();
          const scoped = aggregator.getCostPoints(since,
            (model) => String(deps.getModelLabel(model) || model).toLowerCase().includes(needle));
          if (scoped.points.length) res = scoped;
          else mapped = false;
        }
        const coverageFrom = res.firstMs === null ? Infinity : Math.max(since, res.firstMs);
        const r = { index: makeCostIndex(res.points, coverageFrom), mapped };
        costs.set(key, r);
        return r;
      },
      snapshotsFor: (provider, limitId) => deps.getSnapshots(userId, provider, limitId, since),
      seriesFor: (limitId, windowMinutes) => (deps.codexSeries
        ? deps.codexSeries(`${limitId}:${windowMinutes}`)
        : deps.getSnapshots(userId, 'codex', `${limitId}:${windowMinutes}`, since))
    };
    const out = attachForecasts(views, ctx);
    cache.set(cacheKey, { at: t, sig, out });
    return out;
  }

  function record(userId, provider, view) {
    for (const s of snapshotsFromView(view)) {
      try { deps.recordSnapshot(userId, provider, s.limitId, s.at, s.percent, s.resetsAt); } catch { /* best effort */ }
    }
  }

  return { attach, record };
}

module.exports = { createForecastService, HISTORY_MS, CACHE_MS };
