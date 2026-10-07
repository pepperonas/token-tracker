# FIXME: Arbeitszeit wird wahrscheinlich zu hoch gezählt

> Gefunden am 2026-10-08 beim Bau der Achievement-Fortschrittsbalken (v0.10.0).
> Gedacht als Auftrag für Codex, gestartet im Repo `/Users/martin/claude/token-tracker`.

## Arbeitsweise

Bevor du mit der Umsetzung beginnst:

1. **Anforderung bestätigen:** Fasse in 2–3 Sätzen zusammen, was du als Aufgabe
   verstanden hast.
2. **Optimierungspotenzial prüfen:** Siehst du Schwächen, Lücken oder
   Verbesserungsmöglichkeiten? Falls ja, stelle gezielte Rückfragen, bevor du
   weitermachst.
3. **Plan erstellen:** Skizziere deinen Umsetzungsplan in klaren Schritten.
4. **Implementieren:** Setze den Plan um, erst nach meiner Antwort auf 2 und 3.

Lies zuerst:
- `CLAUDE.md`, besonders `lib/aggregator.js` (`computeActiveMinutes`, `getOverview`,
  `getProjectDetail`) und `lib/achievements.js`;
- `docs/METRICS.md` (Abschnitte zur aktiven Zeit und zu den Achievements);
- `docs/metrik-audit-2026-08-30.md`: dort wurde derselbe Fehler schon einmal behoben.

## Befund

Laut `buildStats` gibt es einen Tag mit **6714 Minuten aktiver Arbeitszeit**
(`maxDayActiveMin`). Ein Tag hat 1440 Minuten.

Die Ursache ist im Code sichtbar, `lib/achievements.js` ab etwa Zeile 1886
(`activeMinByDate`). Die Tageszeit wird als **Summe der aktiven Minuten aller
Sitzungen** des Tages gebildet. Daraus folgen zwei Fehler:

1. **Parallele Sitzungen zählen doppelt.** Drei gleichzeitig offene Sitzungen
   ergeben die dreifache Zeit.
2. **Eine mehrtägige Sitzung landet ganz auf ihrem Starttag** (`firstTs`).

Das ist genau der Fehler, den `getOverview()` am 2026-08-30 abgelegt hat. Dort
werden alle Zeitstempel des Zeitraums auf **eine** Zeitachse gelegt und dann mit
`computeActiveMinutes` gezählt. Die Achievement-Stats haben diese Korrektur nie
bekommen.

## Betroffen

**Sicher:**
- `maxDayActiveMin`;
- `deepDays_2h/4h/6h/8h/10h` und alle Achievements, die darauf aufbauen.

**Wahrscheinlich:**
- `totalActiveHours`, `avgActiveMinPerSession`, `maxSessionActiveMin`, die
  `deepSessions_*`-Zähler: ebenfalls je Sitzung summiert.
- Die angezeigten **2499 Stunden** Arbeitszeit (Achievement „Schmiede“) wirken zu hoch.
- Zu prüfen: `hoursByDate`/`maxHoursInDay`/`daysWith8Hours` (zählen nur belegte
  Stunden, sollten deshalb unkritisch sein).

**Verdacht des Nutzers:** Auch die **Übersicht** zählt möglicherweise zu viel.
Nimm den Fix vom 30.08. **nicht** als gegeben an:
- Rechne `totalActiveMin` aus `/api/overview` (Zeitraum „Gesamt“) unabhängig nach,
  mit einer eigenen einheitlichen Zeitachse über alle Nachrichten.
- Prüfe, ob **parallel laufende Provider** (Claude, Codex und Antigravity gleichzeitig)
  oder **Sub-Agent-Nachrichten** die Zeit aufblähen. Sub-Agenten laufen parallel zur
  Hauptsitzung; ihre Zeitstempel dürfen keine zusätzliche Zeit erzeugen.
- Prüfe dasselbe für `getProjectDetail` (Projekt-Dialog und Projektbericht) und für
  die Trend-Karten (`activeMin` in `getTrends`).

## Gewünschte Korrektur

- Arbeitszeit ist überall **Wanduhrzeit**: eine Minute zählt höchstens einmal, egal
  wie viele Sitzungen, Provider oder Sub-Agenten gleichzeitig laufen.
- Die Tageszeit entsteht aus der einheitlichen Zeitachse **des Tages**. Lücken über
  Mitternacht werden am Tageswechsel geteilt.
- Danach gilt: kein Tag über 1440 Minuten, und die Summe der Tageszeiten ist gleich
  der Gesamt-Arbeitszeit.
- Eine Sitzung für sich behält ihre eigene aktive Zeit (das ist eine Eigenschaft der
  Sitzung, keine Doppelzählung). Nur Summen über Sitzungen hinweg müssen über die
  Zeitachse laufen.

## Vorab zu klären (Fragen an mich)

**Achievements:** Die Schwellen der Zeit-Achievements (Welle 2 und 3) wurden aus den
zu hohen Zahlen abgeleitet. Nach der Korrektur fallen die Werte, also:
- sinkt angezeigter Fortschritt;
- würden bereits freigeschaltete Achievements nach heutigem Stand nicht mehr erreicht.

Schlage vor, wie wir damit umgehen. Optionen:
- Freischaltungen behalten und nur künftige Prüfungen korrigieren;
- Backfill neu laufen lassen (Flag `ach_backfill_v4_` → `v5`) und damit Freischaltungen
  entziehen;
- betroffene Schwellen neu ableiten.

Nichts davon ohne meine Zustimmung.

## Prüfen

- **Tests gegen eine Wegwerf-DB** mit gezielt überlappenden Sitzungen:
  - zwei parallele Sitzungen;
  - eine Sitzung über Mitternacht;
  - parallele Provider;
  - Sub-Agent-Nachrichten.
  Erwartet: Wanduhrzeit, kein Tag über 1440, Tagessumme = Gesamt.
- **Gegenprobe jedes neuen Tests:**
  - Den alten Fehler wieder einbauen und den Test **rot** sehen.
  - Vorher per Prüfsumme belegen, dass die Mutation die Datei verändert hat.
- **An der echten DB, nur lesend** (`data/tracker.db` als Kopie in ein Wegwerf-
  Verzeichnis; vorher den freien Plattenplatz prüfen, die DB ist ~220 MB):
  - Arbeitszeit und Tagesmaximum vorher und nachher;
  - wie viele freigeschaltete Achievements nach neuem Stand nicht mehr erfüllt wären.
- `npm test` und `npm run lint` grün; `docs/METRICS.md` nachziehen. Der Warnhinweis
  dort verweist auf diese Datei und muss nach dem Fix entfernt werden.
- CHANGELOG-Eintrag und Patch- bzw. Minor-Version. Danach `git add`, **dann**
  `npm run badges`.

## Grenzen

- `data/tracker.db` nur lesen; keine Freischaltungen löschen ohne meine Zustimmung.
- Keine neuen npm-Abhängigkeiten.
- Commit-Messages englisch; nicht pushen, nicht deployen.
- Diese Datei nach erledigtem Fix löschen.
