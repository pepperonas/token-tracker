# API reference

71 routes. Unless stated otherwise a route is `GET`, returns JSON, and accepts
the period parameters below.

## Authentication

| Mode | Rule |
|---|---|
| **Single-user** (default) | No authentication. The server binds to `localhost` and every route is open to anything that can reach the port. |
| **Multi-user** (`MULTI_USER=true`) | Every `/api/*` route requires a session cookie from the GitHub OAuth flow, except the four exceptions below. |

Exceptions that never require a session:

| Route | Authorised by |
|---|---|
| `GET /api/pricing` | nothing — deliberately public for transparency |
| `GET /api/public/share/:token` | the 48-character share token |
| `POST /api/sync` | device API key (`Authorization: Bearer …`) |
| `GET /api/sync-agent/install.{sh,ps1}` | API key in the query string |

**CORS**: `sendJSON()` sets no `Access-Control-Allow-Origin` at all; it only
passes through one a route set beforehand. Only the public share endpoint does,
and only for an allowlisted origin. Do not reintroduce a wildcard — a blanket
`*` let any website read the (unauthenticated) local API, and because
`writeHead()` wins over `setHeader()` it also silently overrode the share
endpoint's allowlist.

## Common parameters

| Parameter | Applies to | Meaning |
|---|---|---|
| `from`, `to` | all analytics routes | Inclusive `YYYY-MM-DD` local dates. Omit both for all time. |
| `device` | all analytics routes | Numeric device ID. Omit for the aggregated all-devices view. |

---

## Analytics

| Route | Description |
|---|---|
| `/api/overview` | KPI totals: tokens by type, cost, sessions, messages, lines, `totalActiveMin`, `avgActiveMinPerDay`, `activeDays`, rate-limit hits. |
| `/api/providers` | Aggregated tokens, cost, messages, sessions, projects, and models broken down by provider (`claude`, `codex`, `antigravity`). |
| `/api/daily` | Per-day aggregates including a four-part cost breakdown (`inputCost`, `outputCost`, `cacheReadCost`, `cacheCreateCost`). |
| `/api/daily-by-model` | Daily tokens split by model. |
| `/api/daily-cost-breakdown` | Daily cost split by token type. |
| `/api/cumulative-cost` | Running cost total over the period. |
| `/api/hourly` | Activity by hour of day (local time). |
| `/api/hourly-by-model` | Hourly split by model. |
| `/api/hourly-weekday` | 7 × 24 grid for the overview heatmap, with per-cell tokens/messages/cost and global maxima for colour scaling. |
| `/api/day-of-week` | Activity by weekday. |
| `/api/trends` | The overview trend cards and their five charts in **one** payload: four now-anchored comparisons (today, calendar week, month, rolling 7 days), each against the previous period cut off at the same point; plus `daily90` and `momentum`. Independent of the period filter. |
| `/api/sessions` | Sessions with `durationMin`, `activeMin`, tokens, cost, lines, tool calls. |
| `/api/active-sessions` | Sessions with a message in the last 10 minutes. |
| `/api/session-depth`, `/api/session-efficiency` | Distribution and per-session efficiency metrics. |
| `/api/projects` | Per-project totals. |
| `/api/project-detail?name=…` | One project in full: totals, per-component cost, cache-TTL coverage, `spanMin`, `totalActiveMin`, daily series, model and tool breakdown, session list. |
| `/api/project-report?name=…` | **HTML, not JSON.** A standalone print-optimised report. `&download=1` sets a `Content-Disposition` filename; `&print=1` opens the browser print dialog on load (this is the PDF path — there is no server-side PDF engine). |
| `/api/models`, `/api/model-efficiency` | Per-model totals and efficiency. |
| `/api/tools` | Tool call counts. |
| `/api/tool-stats` | Tool cost attribution — message cost distributed proportionally across that message's tool calls. |
| `/api/tool-cost-daily` | Tool cost over time. |
| `/api/mcp-servers` | Breakdown by MCP server, detected from the `mcp__server__tool` prefix. |
| `/api/subagent-stats` | Sub-agent messages, tokens and cost. |
| `/api/cache-efficiency` | Cache hit rate and savings. |
| `/api/productivity`, `/api/efficiency-trend` | Tokens/min, lines/hour, cost/line and their trend. |
| `/api/stop-reasons` | Distribution of `stop_reason`. |
| `/api/rate-limits` | Rate-limit events, total and per day. |
| `/api/global-averages` | This account against the average of all users (multi-user only). |

## Achievements

| Route | Description |
|---|---|
| `/api/achievements` | All 1,224 active achievements with unlock status, tier, points and unlock date. Since 0.10.0 also `wave` (1/2/3), `addedAt` (the wave's ship date, `null` for wave 1) and, for **locked** achievements, `progress: {value, target, pct, metric, unit, parts, daysNeeded?}` — `null` when no target can be read from the condition (booleans, ratios), and for unlocked ones. With several conditions it describes the weakest; `pct` is floored; `unit` is one of `int`/`usd`/`pct`/`share`/`min`/`h`/`dec`. Computed from one `buildStats` per request (~90 ms at 360k messages). Additive — existing fields are unchanged. |
| `POST /api/achievements/recompute` | Replays the history and rewrites unlock dates. **No UI** — the automatic paths (fresh install, `ACH_BACKFILL_FLAG` bump) cover every normal case; this is the maintainer's recovery path. |

## Pricing

| Route | Description |
|---|---|
| `/api/pricing` | **Public.** Effective prices per model with `origin: 'litellm' \| 'fallback'`, the 1-hour cache-write price, epochs, recorded price changes (`priceChanges`), and the last fetch error if any. |
| `POST /api/pricing/refresh` | Force a LiteLLM refresh. |

## Projects: merge

Non-destructive. The original `project` on each message is never modified;
a `project_aliases` row rewrites the name at the single choke-point every
message passes through.

| Route | Description |
|---|---|
| `/api/project-aliases` | Active merges. |
| `POST /api/project-merge` | `{ sources: [], target }`. Every name is validated against the requesting user's own project list. |
| `DELETE /api/project-aliases` | `{ alias }` — un-merge. |

## Devices (multi-user)

| Route | Description |
|---|---|
| `/api/devices` | List, and `POST` to create — returns the API key **once**. |
| `/api/devices/:id` | `PATCH` to rename, `DELETE` to remove. Deleting a device **orphans** its messages (`device_id = NULL`); it never deletes data, and the all-devices view still shows them. |
| `POST /api/devices/:id/regenerate-key` | Invalidates the old key immediately. |

## Sync

| Route | Description |
|---|---|
| `POST /api/sync` | Device API key. Body `{ messages[], rateLimitEvents?[], usageLimits? }`. `usageLimits` = `{ claude, codex, antigravity }` views read on the agent's machine; sanitized against a whitelist and stored per user (a disabled provider never overwrites a stored one). A `planUsage` field from older agents is accepted and ignored. Idempotent — messages are upserted by ID. |
| `/api/sync-key` | The legacy account-level key. |
| `/api/sync-agent/install.sh?key=…` | A personalised installer with the config baked in. `install.ps1` for Windows. |

## Share API

| Route | Auth | Description |
|---|---|---|
| `/api/share-admin-key` | Operator | Read, `POST` to regenerate. One key per instance, so it answers to the operator (`OWNER_GITHUB_ID`). |
| `/api/shares` | Admin key or session | List, `POST` to create `{ project, label, expires_in_days }`. |
| `/api/shares/:id` | Admin key or session | `DELETE` — revocation takes effect immediately. |
| `/api/shares/projects` | Admin key or session | Projects with stats, for the share picker. |
| `/api/public/share/:token` | **Public** | Sanitised project data. 30 requests/min/IP, CORS allowlist. Never exposes the internal project path. |

**Scope.** The admin key and the operator manage the instance's share links —
that is the path an external consumer such as OPS uses. Any other signed-in
session manages its own: it lists and revokes the links it created, and may
publish only a project it actually has. A link records who created it and
resolves against that account's data, so two accounts with a project of the
same name get two different links.

## GitHub

All stale-while-revalidate cached; see [CONFIGURATION.md](CONFIGURATION.md).

| Route | Description |
|---|---|
| `/api/github/stats` | Contributions, repositories, pull requests. |
| `/api/github/billing` | Plan detection, Actions minutes, storage, packages. |
| `/api/github/actions-usage` | Per-repository Actions cost with OS multipliers (Ubuntu 1×, macOS 10×, Windows 2×). |
| `/api/github/code-stats`, `/api/github/code-frequency`, `/api/github/languages` | Lines of code and language mix. |
| `POST /api/github/refresh` | Drop the cache and refetch. |

## Anthropic Admin API

| Route | Description |
|---|---|
| `/api/anthropic/dashboard` | Organisation usage and cost, including a per-API-key breakdown. |
| `/api/anthropic/budget` | Read and `POST` a budget. |
| `POST /api/anthropic/refresh` | Force a refresh. |
| `POST /api/user/anthropic-key` | Store the key AES-256-GCM encrypted. |

## Usage limits (Claude, Codex, Antigravity)

Single-user: read on this machine (the Claude poller is off under the test
runner and with `CLAUDE_USAGE_ENABLED=false`). Multi-user: nothing is read on
the server — `/api/usage-limits` returns what the user's own sync agents
reported, with `via: 'sync'`, `receivedAt`, `device`, and `status: 'stale'`
+ `error: 'AGENT_SILENT'` after 20 minutes without a report.
Neither route ever returns or accepts a token.

| Route | Description |
|---|---|
| `/api/usage-limits` | All providers at once: `{ claude, codex, antigravity }`, each in the shape below (`{ enabled: false }` when unavailable). Codex comes from its session logs (`data.source: 'codex-logs'`, limits carry `limitId`, `windowMinutes`, `reset`; plus `plan`, `credits`, `reached`); Antigravity from its CLI logs (`'antigravity-logs'`: at most one `exhausted` limit while a quota is used up, plus `lastExhaustedAt`; it records no percentages). What the overview box and header chips read. |
| `/api/claude-usage` | The poller's cached view: `{ enabled, status: loading\|ok\|stale\|error, error, data: { source, limits[], extraUsage, breakdown }, fetchedAt, lastAttemptAt, nextAttemptAt, intervalMinutes }`. Never triggers an upstream call. Each limit is `{ id, kind, name, group, percentUsed, resetsAt, scopeLabel, dollars? }`; unknown kinds keep their raw name. |
| `POST /api/claude-usage/refresh` | Fetch now — at most every 2 minutes and never during a 429 backoff; otherwise returns the cached view with `throttled: true`. |

### Forecast (`forecast`, since 0.8.0)

Every Claude and Codex limit in `/api/usage-limits` may carry a `forecast`
object (Antigravity never does — it records no percentages). It is computed
on the server (`lib/usage-forecast.js`, wired by `lib/usage-forecast-service.js`)
and cached 60 s per user; a failure for one limit only leaves that limit
without the field. **The contract is additive and versioned** — Inspector Rust
reads it.

```jsonc
"forecast": {
  "version": 1,
  "basis": "calibrated" | "snapshots" | "linear" | "none",
  "confidence": "good" | "rough" | "none",
  "status": "reserve" | "ahead" | "exhausts" | "idle" | "unknown",
  "window": { "start": "ISO", "end": "ISO" },
  "now": "ISO",
  "pace": { "planPercent": 43.2, "deltaPoints": -7.1 },
  "atReset": { "median": 78.4, "low": 61.0, "high": 96.2 } | null,
  "exhaustsAt": { "median": "ISO", "early": "ISO", "late": "ISO|null" } | null,
  "k": 0.0123 | null,                       // nur Claude, % je USD
  "notes": ["scope_unmapped" | "too_early" | "few_weeks" | "chat_invisible"],
  "series": {                               // nur Wochenlimits
    "actual":   [["ISO", 12.3], …],         // ≤ 170, rekonstruiert/gemessen
    "measured": [["ISO", 12], …],           // echte Snapshots im Fenster
    "forecast": [["ISO", median, low, high], …], // stündlich ab now
    "ghosts":   [{ "start": "ISO", "points": [[offsetMin, pct], …] }] // ≤ 3
  }
}
```

- `pace.planPercent` = elapsed share of the window; `deltaPoints` = used − plan (positive = ahead).
- `basis`: `calibrated` (Claude: k = percentage points per USD of the user's own Claude cost, from snapshot steps of ≥ 3 points, fallback `percent / cost so far`; the remaining window replays the same span of up to 4 complete past weeks), `snapshots` (Codex: its own percent series), `linear` (no past week, and always for the 5-hour window), `none` (`too_early`: under 10 % of the window elapsed, or nothing used).
- `atReset` / `exhaustsAt`: median, min and max over the past weeks (linear: ±40 %). `exhaustsAt` is `null` when the median stays below 100 before the reset (reaching 100 exactly at the reset does not count); at ≥ 100 % it is `now`. The fallback `k` needs at least $1 of spend in the window.
- Codex windows are not periodic: past windows are found by their own reset time in the log series, not by end − n × length.
- Guard: a window that ends further away than its own length (or a Codex window over 30 days) gets `status: 'unknown'` — hosted limits are untrusted input and every forecast loop runs to the reset.
- Work per request is bounded: at most the newest 5000 snapshots per limit are read, grouping by reset time is a sort + sweep and value lookups are binary searches (a flood of hosted reports with ever-new reset times made the old quadratic grouping block the process).
- The 60-s cache holds only the forecasts; status, error, `fetchedAt` and the other providers always come fresh.
- `status`: `exhausts` > `idle` (0 %) > `ahead` (more than 5 points over plan) > `reserve`; `unknown` after a reset or without a percentage.
- Snapshots behind the calibration live in `usage_snapshots` (numbers only, change or 30-min heartbeat, 60 days). Hosted they come from sync reports; readings dated more than 10 minutes in the future are refused, and pruning runs on the server clock.

## Export and maintenance

| Route | Description |
|---|---|
| `/api/export` | JSON export of the requesting account's messages. |
| `/api/export-html` | Self-contained interactive HTML snapshot. |
| `/api/download-db` | A SQLite snapshot of the requesting account's own data, built per request (`lib/export-db.js`): messages, tools, rate-limit events, achievements and project aliases. Account records, session tokens, device API keys, cached third-party payloads and server configuration are not part of it. |
| `POST /api/backup` | Operator. Take a server-side snapshot now. |
| `POST /api/rebuild` | Reload the DB history **first**, then re-parse JSONL on top. Doing it the other way round silently dropped everything past the JSONL retention window. |
| `/api/config` | Mode and feature flags for the frontend. |
| `/api/stats-cache` | Local `.claude` statistics (single-user only). |

## Live updates

| Route | Description |
|---|---|
| `/api/live` | Server-Sent Events. Emits `update` when the watcher or a sync writes, and `achievement-unlocked` with emoji, tier and points. Filtered by user in multi-user mode. |
