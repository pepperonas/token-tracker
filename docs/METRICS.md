# What every number means

Every figure on the dashboard comes from the JSONL session logs Claude Code
writes to `~/.claude/projects`. Nothing is estimated unless it says so. This
document is the written form of the dashboard's own **"How it adds up"**
dialog, and it also records the reasoning behind the definitions — including
the ones that used to be wrong.

---

## Messages

Assistant replies that carry a `usage` object, **deduplicated by the API
message ID**. Streaming writes the same ID several times as a response grows;
only the last one counts.

Verified against the real corpus: 0 assistant lines without a `message.id`, and
no ID appears in two projects or two sessions. Attribution is therefore stable —
a message can never be counted twice or land on the wrong project.

---

## Tokens

`input + output + cache_read + cache_creation`, taken straight from each API
response.

**Cache reads usually dominate** — on a heavy Claude Code history they are over
98 % of the total. That is re-read context, not new text, which is why the
number looks enormous next to the message count. The **"Include cache tokens"**
switch removes cache reads and writes from every token figure on the dashboard,
including the project detail dialog and the charts.

---

## Cost

Per message: `tokens / 1,000,000 × price of that component`, at the price valid
on the **message's own date**.

### Cache-write tiers

A cache write is billed by its time-to-live, and the two tiers cost different
amounts:

| Operation | Price | Example (Opus 5, $5/MTok input) |
|---|---|---|
| 5-minute cache write | 1.25 × input | $6.25 / MTok |
| **1-hour cache write** | **2 × input** | **$10 / MTok** |
| Cache read (hit) | 0.1 × input | $0.50 / MTok |

**Claude Code writes overwhelmingly to the 1-hour cache** — measured at 90.5 %
of all cache-write tokens. Charging every write at the 5-minute rate, as the
tracker did until 2026-08-30, understated cost by **8.5 %**.

Messages recorded before the split was parsed carry only the total and keep the
5-minute rate. Re-pricing them upward on data that can no longer be verified
would be worse than leaving them low; the dashboard and the per-project report
both state the coverage.

### What this number is not

It is the amount the same usage **would cost on the API**. On a Claude
subscription you do not pay it. It measures consumption, not billing.

### Where prices come from

Live from the [LiteLLM](https://github.com/BerriAI/litellm) community dataset,
refreshed daily and cached in the database so the first cost calculation after
a restart already uses fresh data. If the fetch fails, a built-in table takes
over — kept current so an offline boot cannot price a current model as Sonnet.

`PRICING_EPOCHS` pins historical prices for models whose price changed under the
same model ID, and wins over the live data: LiteLLM only knows the *current*
price, but a message sent inside an epoch must keep its historical price
forever. The table is currently empty — no live model has such a history.

Beyond those hand-made epochs, **every price change is recorded automatically**.
Each refresh compares the fetched prices with the last known ones; a model whose
price differs gets a new history entry starting at the moment of the fetch
(persisted as `pricing_history_json`). A message is always priced with the entry
that was current when it was sent. So past costs never move when a price
changes, while the current rates stay current: they are what `/api/pricing`
shows and what every message from the change onward is billed at. A model seen
for the first time gets an open-ended entry — there is no evidence of an earlier
price. Limitation: LiteLLM can lag an official change by a few days; to date it
exactly, add a manual epoch, which wins over the recorded history.

---

## Sessions

Distinct session IDs that produced at least one message **inside the selected
period**. The projects table and the project detail dialog use the same
definition; an earlier version counted sessions that merely *overlapped* the
period and the two disagreed under a date filter.

---

## Active working time

Gaps between consecutive messages on **one shared timeline**, each gap capped
at **5 minutes**.

The cap is what separates working from having the terminal open: a 90-minute
break contributes 5 minutes, not 90 and not 0. Parallel sessions — a main
session plus its sub-agents, or a second terminal — share the timeline, so the
same minute is never counted twice. The figure therefore can never exceed the
wall-clock time that has actually elapsed.

### Why not session duration

`durationMin` (last minus first message of a session) counts idle time as work
and adds up overlapping sessions. On the real corpus it ran **36× high**:

| | by session span | by real work |
|---|---|---|
| Sessions ≥ 2 h | 303 | 133 |
| Sessions ≥ 8 h | 224 | 46 |
| Sessions ≥ 16 h | 179 | **24** |
| Longest session | 4,044 h (168 days) | 106.8 h |
| Sum over all sessions | 62,147 h | 1,732 h |

Until 2026-08-30 the project detail dialog displayed that sum as "total time" —
2,344 h inside a 2,062 h window, and 659 h inside a 10-day filter. A figure
larger than the period it describes is not a measurement.

The span sum still exists as `sessionSpanSumMin` for reference and is shown in
the methodology dialog labelled as such. It is never a KPI.

---

## Net lines

Counted from the `Edit` and `Write` tool calls in the log: `Edit` compares
`old_string` against `new_string`, `Write` counts the content.

**This is a floor, not a total.** Edits made through `Bash` (`sed`, heredocs) or
in notebooks are invisible to it. A session that does most of its editing from
the shell will report far fewer lines than it changed.

---

## Cache savings

What the cache reads **would have cost** at full input price, minus what they
actually cost at the 0.1× read rate. It is money the cache saved, not money
spent — the only figure on the dashboard that goes up when you become cheaper.

---

## Sub-agents and MCP

Sub-agent messages are identified by the `/subagents/` path of the transcript
they were written to; all 14,995 in the reference corpus carry it, so the flag
is reliable. MCP tool calls are identified by the `mcp__<server>__<tool>` naming
convention, which also yields the server breakdown.

Both are real API calls and are included in every total. They are additionally
reported separately so orchestration cost is visible on its own.

---

## What is deliberately not counted

None of these occur in the reference corpus, so nothing is currently missing —
but if you start using them, cost will be understated:

| Feature | Effect on price | Detected via |
|---|---|---|
| Web search | +$10 per 1,000 searches | `server_tool_use.web_search_requests` |
| Fast mode | 2× (Opus 5/4.8 at $10/$50) | `usage.speed === 'fast'` |
| US-only inference | 1.1× on every category | `usage.inference_geo === 'us'` |
| Batch API | −50 % | `usage.service_tier === 'batch'` |

Web *fetch* is free beyond the tokens it brings in and needs no handling.

---

## Achievements

1,274 definitions in three waves, including 50 retired keys; 1,224 active achievements.

**Wave 1** (700) covers the ramp from first prompt to heavy daily use.

**Wave 2** (500, added 2026-08-30) starts where wave 1 ran out. Thresholds are
**derived, not guessed**: `today + measured rate × horizon`, against a snapshot
of the real history (208 active days, 1,192 messages and 388 M tokens per active
day). The nearest sit about three weeks of work away, the furthest about twenty
months. All 500 were locked the day they shipped, and a test pins that baseline
so the claim stays checkable.

**Wave 3** (74, added 2026-10-07) measures weekly and monthly rhythm,
code-and-tool days, project lifespan, and deep sessions using multiple models.
It uses `activeMin` for work time and counts all providers through the global
aggregator. All 74 were locked against the measured 246-day baseline. The
[audit and horizon report](achievements-wave3-2026-10.md) records the thresholds
and the 50 historical keys retired as semantic duplicates.

Unlock dates are **backdated**: the history is replayed day by day so an
achievement is stamped with the day its condition was first met, not the day the
definition was added. Ratio-type achievements (`avg_*`, `cache_rate_*`, …) are
additionally gated on a tier-scaled minimum number of active days — a ratio
computed over one day is a sample-size artifact, not an earned badge.

Eight wave-1 achievements were corrected in 2026-08 from **impossible** to hard:
`output_ratio_60/70/80` demanded a 60–80 % output-token share where the real
figure is 0.204 %, and `model_haiku_majority` demanded Haiku above half of all
messages against 2.9 % actual. An unreachable badge is padding, not a goal.

> ⚠️ **Open inconsistency (found 2026-10-08, not yet fixed):** the achievement
> stats compute daily working time by **summing each session's active minutes
> under its start date**. Parallel sessions are counted twice and multi-day
> sessions land on one day — the measured maximum is **6,714 minutes for a
> single day** (a day has 1,440). Affects `maxDayActiveMin` and the `deepDays_*`
> achievements, probably also the total working hours. Whether the overview's
> active time is inflated as well is still to be checked. Treat time-based
> achievement numbers as upper bounds until this is resolved.
> Details and the fix brief: [FIXME.md](../FIXME.md).

**Progress on a locked achievement** (since 0.10.0) is `value / target` of its
condition, read back out of the definition: wave 3 declares
`metric`/`threshold`/`requirements`, and for waves 1 and 2 the predicate's own
source is parsed — but only the narrow form `metric >= number [&& …]`.
Booleans, ratios built in the check (`a / b >= x`) and strict `>` get **no
bar**, rather than a guessed one (measured: 1,169 of 1,224 active achievements
have a target). With several conditions the bar shows the **weakest** one,
since that is the distance that actually remains; the percentage is floored,
so it never reads 100 while a condition is still short. A ratio achievement
whose value is there but whose active-day gate is not yet met holds at 99 %
and names the missing days. A test evaluates every achievement with a target
against its real check on boundary and random stat vectors, so a bar can
never claim "done" while the check says no.

**"Almost there"** means at least 80 % of that weakest condition. **"New"**
means the achievement's wave shipped within the last 30 days (wave 2:
2026-08-30, wave 3: 2026-10-07; wave 1 has no date). 30 rather than 60 so the
500-strong wave 2 stops counting as new and the wave that actually just
arrived is not buried under it.

---

## Multi-Provider Tracking & Filtering

The dashboard tracks tokens, costs, active time, and session metrics across multiple coding agent platforms:
* **Claude Code**: from `~/.claude/projects`
* **OpenAI Codex**: from `~/.codex/sessions/**/rollout-*.jsonl`
* **Google Antigravity**: from `~/.gemini/antigravity-cli/conversations/*.db`

### Global Provider Filtering
* The segmented pill switcher in the header (`[ Alle ] [ 🟠 Claude ] [ 🟢 Codex ] [ 🔵 Antigravity ]`) filters all dashboard metrics and charts across every tab.
* In the Overview tab:
  * When **All Providers** is active: an interactive multi-segment share bar displays the relative token or cost distribution, accompanied by summary cards for each provider.
  * When a single provider is selected: the breakdown area converts into a high-visibility filter banner with active statistics and a quick reset button (`✕ Show All Providers`), avoiding redundant 100 % self-referential charts.
