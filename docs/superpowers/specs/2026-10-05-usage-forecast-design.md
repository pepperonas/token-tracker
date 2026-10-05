# Nutzungslimits: Hochrechnung, Tempo und Fenster-Grafik — Design

Stand: 2026-10-05 · Version des Features: 0.8.0 · Status: vom Nutzer im Chat
freigegeben (Rechenteil, Grafik, Daten/Fehler/Tests), Spec zur Durchsicht.

## Ziel

Die Box „Nutzungslimits" beantwortet je Limit zwei Fragen:

1. **Liege ich im Plan?** Ist-Verbrauch gegen die gleichmäßige Linie über das
   Fenster (nach 3 von 7 Tagen sind 43 % „genau im Plan").
2. **Wann ist es aufgebraucht?** Erreicht der Verbrauch 100 % vor dem Reset —
   und wenn ja, wann (mit Spanne)?

Beides sichtbar: im vorhandenen Balken (immer) und in einer aufklappbaren
Fenster-Grafik (Wochenlimits).

## Was der Nutzer gesagt hat / was angenommen ist

- Gesagt: Hochrechnung „bin ich im Plan?", „wann geht die Nutzung beim
  historischen Verlauf aus?", visuell als Grafik. Prognosebasis **Hybrid**
  (Snapshots mitschreiben + gegen eigene Token-Historie kalibrieren).
  Dasselbe Feature soll später Inspector Rust bekommen (eigene Session, eigenes
  Spec im dortigen Repo) — die API hier ist dafür der Vertrag.
- Angenommen: Die Wochenlimits sind die wichtigen; das 5-h-Fenster bekommt nur
  die Balken-Ebene mit linearer Hochrechnung.

## Ausgangslage (gemessen)

- Claude liefert Prozente nur als **ganze Zahlen** (`limits[].percent: 2`) und
  nur den aktuellen Wert. Der Tracker speichert bisher nur den letzten Stand
  (`claude_usage_cache`).
- Codex schreibt `rate_limits` in jedes `token_count`-Event seiner Logs — ein
  Verlauf über die letzten 8 Tage ist rückwirkend lesbar.
- Antigravity protokolliert keine Prozente → keine Hochrechnung.
- Der Aggregator kennt jede Claude-Nachricht mit Zeit (`_ms`), Kosten
  (`_cost`) und Modell — die Grundlage für Kalibrierung und Wochenmuster.

## Rechenmodell (`lib/usage-forecast.js`, rein, Uhr injizierbar)

Verdrahtet wird es von `lib/usage-forecast-service.js` (Aggregator-Kosten,
Snapshot-Tabelle, Codex-Logreihe, 60-s-Zwischenspeicher); `server.js` ruft
nur `attach()` und `record()`.

Begriffe: Fenster = `[start, end)`, `end = resetsAt`, `start = end − Länge`
(Claude: `session` 300 min, `weekly_*` 10080 min; Codex: `windowMinutes`).

### Tempo

`planPercent = 100 × (now − start) / (end − start)`,
`deltaPoints = percentUsed − planPercent` (positiv = voraus).

### Kalibrierung (nur Claude)

Kostenreihe = Claude-Nachrichten (`(msg.provider || 'claude') === 'claude'`,
wie der Provider-Umschalter der App), beim `weekly_scoped`-Limit nur Nachrichten, deren Modell-Label den
`scopeLabel` enthält (z. B. „Fable"); lässt sich der Scope keinem Modell
zuordnen → alle Claude-Kosten, Hinweis `scope_unmapped`.

`k` (Prozentpunkte je USD):

1. Aus Snapshot-Paaren `(i, j)` **desselben Fensters** mit `p_j − p_i ≥ 3`:
   `k_ij = (p_j − p_i) / Kosten(t_i, t_j]`; Paare mit Kosten 0 fallen weg.
   `k = Median` aller `k_ij` der letzten 4 Fenster. Mindestabstand 3 Punkte,
   damit die Ganzzahl-Stufen (±1) das Verhältnis nicht dominieren.
2. Rückfall ohne geeignete Paare: `k = percentUsed / Kosten(start, now]`,
   nur wenn `percentUsed ≥ 2` und Kosten > 0.
3. Sonst `k = null`.

Güte: `good` bei ≥ 3 Paaren, `rough` beim Rückfall, `none` ohne `k`.

### Rekonstruierter Ist-Verlauf (Claude)

`actual(t) = percentUsed − k × Kosten(t, now]` für `t ∈ [start, now]`,
unten bei 0 geklemmt — an den gemessenen Endwert angeheftet, damit die Kurve
dort endet, wo die API steht. Abgetastet stündlich (Woche) bzw. alle 5 min
(Sitzung), höchstens 170 Punkte. Gemessene Snapshots liegen als eigene Punkte
daneben (`measured`).

### Prognose bis zum Reset

Vorwochen = die bis zu 4 vorangegangenen Fenster gleicher Länge, deren Daten
vorliegen. Für jede Vorwoche `w`: Zuwachs `Z_w(τ) = k × Kosten` im
**gleichen relativen Abschnitt** `(start_w + (now−start), start_w + τ]`.
Je Zeitpunkt `τ ∈ (now, end]`: `median/low/high = Median/Min/Max` über
`percentUsed + Z_w(τ)`.

- `atReset = { median, low, high }` (darf über 100 liegen).
- `exhaustsAt.median/early/late` = erster Zeitpunkt, an dem Median / High /
  Low 100 erreicht (`null`, wenn nicht vor `end`).
- Codex: dieselbe Rechnung, nur dass `Z_w` direkt aus dem Prozentverlauf des
  Vorfensters kommt (Prozentzuwachs im gleichen Abschnitt), ohne `k`.
- **Linearer Rückfall** (keine Vorwoche, oder Sitzungsfenster):
  Rate = `percentUsed / (now − start)`, `median = percentUsed + Rate × Rest`,
  `low = median × 0,6`, `high = median × 1,4` (Zuwachs-Anteil), Basis `linear`.
  Voraussetzung `now − start ≥ 10 % der Fensterlänge`, sonst keine Prognose
  (`basis: 'none'`, Hinweis `too_early`).

### Status

| Status | Regel |
|---|---|
| `exhausts` | `exhaustsAt.median` liegt vor `end` |
| `ahead` | sonst `deltaPoints > +5` |
| `reserve` | sonst |
| `idle` | `percentUsed = 0` und kein Zuwachs erkennbar |
| `unknown` | keine Prognose möglich (Reset vorbei, Antigravity, Fehler) |

## API-Vertrag (additiv)

Jedes Limit in `/api/usage-limits` bekommt ein optionales Feld `forecast`.
Fehlt es, zeigt die Oberfläche das Limit wie bisher. **Dieser Vertrag wird von
Inspector Rust konsumiert** (`token_usage.rs`-Muster: HTTP auf
`127.0.0.1:5010`) — Änderungen nur additiv, Feld `version` hochzählen bei
Bruch.

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

Zwischenspeicher 60 s je Nutzer/Gerät-Schlüssel. Eine Ausnahme beim Rechnen
lässt nur `forecast` dieses Limits weg (try je Limit).

## Speicher

Neue Tabelle `usage_snapshots(user_id, provider, limit_id, at, percent,
resets_at, PRIMARY KEY (user_id, provider, limit_id, at))`, Index auf
`(user_id, provider, limit_id, at)`.

- Geschrieben, wenn sich `percent` oder `resets_at` gegenüber der letzten Zeile
  dieses Limits ändert, sonst höchstens alle 30 min (Lebenszeichen).
- Aufbewahrung 60 Tage, Aufräumen beim Einfügen.
- Quellen: lokaler Claude-Abruf (Ergebnis-Hook des Pollers) und gehostet
  der Sync-Handler (Claude und Codex). Lokal braucht Codex keine Snapshots —
  sein Verlauf kommt direkt aus den Logs (s. u.).
  Nur Zahlen und Zeiten — kein Token, kein Rohtext (Pin).
- **Codex rückwirkend:** `createCodexUsage` behält je `limitId` die Folge
  `(at, used_percent, window_minutes, resets_at)` der letzten 8 Tage
  (nur Wertänderungen) und gibt sie über `series()` heraus.

## Oberfläche

**Ebene 1 — Balken (jede Zeile, Sitzung und Woche):**
- gefüllt = Ist; feiner Strich = `planPercent`; schraffiert = Prognose bis
  `atReset.median`; > 100 → Schraffur endet in roter Kappe.
- Zeile darunter: „7 Punkte Reserve · voraussichtlich 78 % · Reset Sa 01:00"
  bzw. „8 Punkte voraus · …" bzw. „leer Do ~14:20 (Mi 22 – Fr 9 Uhr)";
  Sitzung: „leer in ~1:40 h". `rough` → „grobe Schätzung".
- Statusfarbe: `reserve` grün, `ahead` bernstein, `exhausts` rot,
  `idle`/`unknown` neutral. Die Kopfzeilen-Chips übernehmen sie als Rand.

**Ebene 2 — Fenster-Grafik (Wochenlimits, Klick auf die Zeile):**
- Chart.js über `renderChart` (In-Place-Update, kein Flackern beim 60-s-Takt).
- X: Fensterbeginn → Reset; Y: 0–100, bei Überschreitung bis 120 mit roter
  Zone über 100.
- Plan-Linie gestrichelt diagonal; Ist als Linie (rekonstruiert dünner),
  gemessene Snapshots als Punkte; ab „jetzt" Median gestrichelt + Band
  transparent; Marker am 100-%-Schnitt mit Uhrzeit; „jetzt" als senkrechte
  Linie; Vorwochen blass als Geister; Nachtstunden (22–7 Uhr Europe/Berlin)
  dezent schattiert; Tooltip: Ist / Plan / Prognose.
- Aufgeklappte Grafiken: `localStorage['usageForecastOpen']` (Liste von
  Limit-IDs), übersteht Reload/Abmelden (wie `usageLimitsCollapsed`).
- Mobil: volle Breite, ~180 px hoch.
- `prefers-reduced-motion`: keine Chart-Animation.

Antigravity: „keine Prozentwerte, keine Hochrechnung".

## Fehlerfälle

| Fall | Verhalten |
|---|---|
| 0 % verbraucht, `k` unbekannt | Plan-Strich + „noch nichts verbraucht", Status `idle` |
| < 10 % des Fensters vergangen | keine Prognose, `too_early` |
| keine Vorwoche | linearer Rückfall, `rough`, breites Band |
| Reset vorbei / Codex `reset` | `forecast` mit `status: 'unknown'`, ohne Serien |
| Scope ohne passendes Modell | alle Claude-Kosten, Hinweis `scope_unmapped` |
| Rechenfehler | Limit ohne `forecast`, Rest unberührt |
| Chat-Nutzung auf claude.ai | Hinweis `chat_invisible` in der Grafik-Legende: „Chat-Nutzung fließt nur über den Kalibrierfaktor ein" |

## Tests

- `test/usage-forecast.test.js`: Tempo-Grenzen; Kalibrierung mit
  Ganzzahl-Treppe (Paare < 3 Punkte ignoriert), Rückfall, `null`;
  Rekonstruktion endet am Messwert; Prognose mit 0/1/4 Vorwochen
  (gleichmäßig, nur werktags, Ausreißerwoche → Band); `exhaustsAt` innerhalb
  / außerhalb des Fensters; Scope-Filter; linearer Rückfall; `too_early`;
  Status-Tabelle.
- `test/usage-snapshots.test.js` (db): nur Änderungen + 30-min-Lebenszeichen,
  60-Tage-Aufräumen, keine Fremdfelder.
- Codex-Serie: nur Wertänderungen, 8-Tage-Horizont, Chunk-Grenzen.
- API: `forecast` mit konkreten Zahlen gegen die Test-Historie; Ausnahme in
  einem Limit lässt die anderen stehen.
- UI: reine Helfer (Statustext, Balkenteile, Farbe), Markup-Pins, Pin dass die
  Grafik über `renderChart` läuft.
- Jeder neue Pin einmal mutiert; Grafik im Browser nachgemessen (Plan-Linie,
  Schnittmarker, In-Place-Update ohne neues Canvas).

## Nicht im Umfang

Antigravity-Prognose · Benachrichtigungen bei drohendem Leerlaufen ·
Trennung Chat/Claude Code über die Wochen-Aufteilung hinaus · Prognose im
HTML-Export.
