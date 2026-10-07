# Codex-Prompt: Achievements, Runde 2 — mehr Achievements und Neues sichtbar machen

> Zum Einfügen in Codex, gestartet im Repo `/Users/martin/claude/token-tracker`.
> Alles unterhalb der Linie ist der Prompt.
> Baut auf Runde 1 auf (`docs/prompts/codex-achievements-audit-und-erweiterung.md`,
> Commit `b9ebf5b`).

---

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
- `CLAUDE.md` (Abschnitt `lib/achievements.js`);
- `CONTRIBUTING.md`;
- `docs/achievements-wave3-2026-10.md`;
- `docs/achievements-audit-after-2026-10.md`;
- den Prompt der Runde 1 (`docs/prompts/codex-achievements-audit-und-erweiterung.md`).

**Alle Qualitätsregeln aus Runde 1 gelten weiter**, insbesondere:
- kein Anbieter-Kopieren;
- echte Arbeitszeit nur über `activeMin`;
- Schwellen aus der echten Historie abgeleitet;
- Stichproben-Tore für Verhältnisse;
- eindeutige Namen in DE und EN;
- Keys nie ändern oder löschen;
- semantische Duplikatprüfung gegen den **gesamten aktiven Bestand**.

## Warum es eine Runde 2 gibt

Runde 1 hat sauber bereinigt (50 Duplikate stillgelegt, 94 Stufen korrigiert), aber nur
**74** neue Achievements angelegt. Davon sind am Auslieferungstag **0** freigeschaltet,
alle liegen auf Gold, Platin oder Diamant mit Zielen in 1 bis 20 Monaten. Mein Eindruck
als Nutzer: **„Ich sehe nicht viel Neues.“** Im Raster stehen die 74 als gesperrte Karten
zwischen 1224 anderen, ohne Kennzeichnung, ohne Fortschritt, ohne erste erreichbare Stufe.

Ziel dieser Runde: **mehr** und **spürbar**, ohne die Qualität der Runde 1 aufzugeben.

## Teil A: Rund 800 weitere Achievements

### Menge

- **Ziel 800 neue aktive Achievements, mindestens 700.** Die Menge ist diesmal
  vorgegeben, die Qualitätsregeln aus Runde 1 sind der Rahmen, in dem du sie erreichst.
- Wenn du nach ehrlicher Prüfung unter 700 bleibst, stopp vor der Umsetzung und begründe
  das je Dimensionsfamilie mit Zahlen. Nicht still weniger liefern.

### Wie 800 sinnvoll werden statt aufgebläht

- **Breite vor Länge.** Mindestens **40 Dimensionsfamilien**, davon mindestens 25, die
  der Bestand noch gar nicht misst.
  - Höchstens **8 Sprossen** je Leiter.
  - Höchstens **40 Achievements** je Familie, Leitern, Kombinationen und Landmarken
    zusammengezählt.
- **Mischung der Formen:** etwa 60 % Leitern, 25 % Kombinationen aus zwei unabhängigen
  Bedingungen, 15 % Landmarken.
- **Abstand zum Bestand:** Keine neue Schwelle darf auf derselben Kennzahl näher als
  **20 %** an einer bestehenden aktiven Schwelle liegen.
  - Hintergrund: Runde 1 hat 45 solche Nahpaare als Prüfkandidaten hinterlassen. Lege
    keine neuen dazu.
  - Halte die Regel als Test fest.
- **Ideenfelder** (Anregung, keine Pflichtliste). Prüfe jedes gegen die echten Daten,
  bevor du es nimmst:
  - **Tageszeit- und Wochenmuster:** früher Start, später Feierabend, freie Wochenenden,
    konstante Wochentage.
  - **Rückkehr und Pausen:** Comeback nach ≥ 7 bzw. ≥ 30 Tagen, Wiederaufnahme ruhender
    Projekte.
  - **Fokus:** Tage mit nur einem Projekt, Wochen mit wenigen, aber tiefen Projekten.
  - **Werkzeugbreite:** viele verschiedene Tools an einem Tag, neue Tools ausprobiert,
    MCP-Server-Breite über Zeit.
  - **Sub-Agenten als Arbeitsweise:** Tage mit hohem Anteil, Projekte mit Sub-Agenten.
  - **Effizienz über Zeiträume:** Cache-Ersparnis je Woche, Kosten je geschriebener Zeile
    im Monat (mit Stichproben-Tor).
  - **Code-Bewegung:** Netto-Wachstum gegenüber Aufräumen, Tage mit mehr Löschungen als
    Zuwachs, große Refactor-Tage.
  - **Modellgenerationen:** neue Modelle früh genutzt, Wechsel innerhalb einer Woche.
  - **Rate-Limits:** souverän bleiben, also wenige Treffer trotz hoher Last.
  - **Projektlebenszyklus:** neue Projekte, Projekte, die Meilensteine an Sitzungen oder
    Kosten erreichen.
  - **Anbieter-Beziehung (Codex/Antigravity):** nur als Verhältnis, nie als Kopie. Runde 1
    hat sie mangels Historie zurückgestellt. Miss die Codex-Historie heute neu. Reicht sie
    für kurze erste Sprossen (Tage bis Wochen), lege die Familie an und schreib die Grenze
    der Hochrechnung in den Bericht.

### Stufen und Erreichbarkeit: diesmal spürbar

- **Zielverteilung der Stufen:** Bronze 15 %, Silber 20 %, Gold 25 %, Platin 20 %,
  Diamant 20 % (± 5 Punkte je Stufe).
- **Zeit bis zur Freischaltung**, gemessen an der echten Historie und als Test am
  Schnappschuss festgehalten:
  - **sofort erfüllt: höchstens 5 %**. Diese Grenze bleibt, sonst wäre es Geschenk statt
    Leistung;
  - **innerhalb von 4 Wochen erreichbar: 15–25 %**. Damit kommt in den nächsten Wochen
    regelmäßig etwas Neues;
  - **1–6 Monate: 35–45 %**;
  - **6–20 Monate: der Rest**.
- Die erste Sprosse jeder neuen Leiter liegt im 4-Wochen-Fenster, sofern die Kennzahl
  das hergibt. Wenn nicht, sag es im Bericht.
- Neue Keys tragen das Präfix **`w4_`**, damit die Welle erkennbar bleibt. Prüfe die
  Kollisionsfreiheit.

### Bericht

`docs/achievements-wave4-2026-10.md` mit:
- je Familie einer Zeile: Kennzahl, Ausgangswert, Ziele, erwartete Zeit bis zur ersten
  und letzten Sprosse;
- der gemessenen Verteilung von Stufen und Erreichbarkeit;
- den Nahpaar- und Duplikatprüfungen;
- der Audit-Wiederholung über den gesamten aktiven Bestand mit dem Werkzeug aus Runde 1
  (`tools/audit-achievements.mjs`): 0 Duplikate, 0 Stufen-Umkehrungen, 0 doppelte Namen.

## Teil B: bereits erledigt — nur einhängen

Die Sichtbarkeit ist seit Version 0.10.0 gebaut (Fortschrittsbalken, Filter
Alle/Neu/Fast geschafft/Freigeschaltet/Gesperrt, Sortierung „Nächste zuerst“,
Neu-Pille). **Baue daran nichts neu.** Damit die neuen Einträge dort erscheinen:

- Jeder neue Eintrag trägt **`wave: 4`** und deklariert sein Ziel wie Welle 3:
  - `metric` + `threshold` bei einer Schwelle;
  - `requirements: [[metric, thr], …]` bei Kombinationen.
  Dann braucht `lib/achievement-progress.js` die Prüffunktion nicht zu analysieren.
- Trage das Auslieferungsdatum in **`WAVE_ADDED_AT`** in `lib/achievements.js` ein
  (`4: 'JJJJ-MM-TT'`). Ohne Eintrag wird der Test „dates every wave after the first“ rot.
- Neue Kennzahlen bekommen bei Bedarf:
  - eine Einheit in `UNIT_OF` (`lib/achievement-progress.js`: usd/pct/share/min/h/dec,
    sonst Zähler);
  - ein Etikett in `_ACH_METRIC_LABEL` (`public/js/app.js`, DE + EN).
- Der Wächter `agrees with the real check for every achievement that gets a target`
  (`test/achievement-progress.test.js`) muss grün bleiben: kein Balken darf „100 %“
  zeigen, solange die echte Prüfung nein sagt.
- Die Zähltests in `test/achievement-progress.test.js` (Welle 3 = 74, Welle 2 = 500)
  bleiben unverändert; ergänze einen für Welle 4.

## Prüfen

- **Unit-Tests:**
  - der bestehende Wächter `check(s) === value >= target` deckt die neuen Einträge
    automatisch ab, sobald sie `metric`/`requirements` deklarieren;
  - die Erreichbarkeits- und Stufenverteilung am Schnappschuss;
  - die 20-%-Abstandsregel;
  - Mindestmenge (≥ 700 neue aktive).
- **Gegenprobe jedes neuen Tests:**
  - Fehler absichtlich einbauen und den Test **rot** sehen.
  - Vorher per Prüfsumme belegen, dass die Mutation die Datei verändert hat.
  - Ein Test, den man nie scheitern gesehen hat, beweist nichts.
- **Im Browser prüfen** (Playwright gegen `http://localhost:5010` nach Neustart des lokalen
  LaunchAgents `io.celox.token-tracker`; der Aggregator braucht nach dem Start bis zu 30 s):
  - der Filter „Neu“ zeigt die Welle 4 mit Neu-Pille;
  - Balken und Klartext der neuen Einträge stimmen mit `progress` aus der API;
  - keine Konsolenfehler.
- `npm test` und `npm run lint` grün. Danach `git add`, **dann** `npm run badges`.
  CHANGELOG-Eintrag und Minor-Version in `package.json`. `test/docs.test.js` prüft die
  Achievement-Zahlen in der Doku gegen die Wirklichkeit, also alle Zahlen nachziehen.

## Vorab zu klären (Fragen an mich)

1. Ist die Zielverteilung der Stufen und der Erreichbarkeit so recht, oder willst du mehr
   in den nahen Fenstern?
2. Sollen bereits erfüllte neue Achievements (höchstens 5 %) beim Backfill ein Popup
   auslösen oder still mit historischem Datum erscheinen? Bisher: still.
3. Alles, was dir an den Ideenfeldern oder an den Daten fragwürdig vorkommt.

## Was ich am Ende sehen will

- Anzahl neuer aktiver Achievements, Verteilung nach Familie, Form, Stufe und
  Erreichbarkeit.
- Die Audit-Wiederholung über den Gesamtbestand mit 0 Duplikaten und 0
  Stufen-Umkehrungen.
- Ein Screenshot des Filters „Neu“ mit der Welle 4.
- Testanzahl und Gegenproben (rot gesehen: ja/nein).

## Grenzen

- Keine neuen npm-Abhängigkeiten.
- Keine Keys löschen oder umbenennen, keine Freischaltungen löschen.
- `data/tracker.db` nur lesen; Tests gegen Wegwerf-DBs.
- Commit-Messages englisch; nicht pushen, nicht deployen.
