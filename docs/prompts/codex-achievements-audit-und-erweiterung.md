# Codex-Prompt: Achievements prüfen, bereinigen und um 800 erweitern

> Zum Einfügen in Codex, gestartet im Repo `/Users/martin/claude/token-tracker`.
> Alles unterhalb der Linie ist der Prompt.
> Reihenfolge: **vor** dem Icon-Prompt (`codex-achievement-icons.md`) ausführen. Der
> braucht den bereinigten Endbestand.

---

## Arbeitsweise

Bevor du mit der Umsetzung beginnst:

1. **Anforderung bestätigen:** Fasse in 2–3 Sätzen zusammen, was du als Aufgabe
   verstanden hast.
2. **Optimierungspotenzial prüfen:** Siehst du Schwächen, Lücken oder
   Verbesserungsmöglichkeiten? Falls ja, stelle gezielte Rückfragen, bevor du
   weitermachst. Die Entscheidungen im Abschnitt „Vorab zu klären“ musst du in jedem Fall
   vorlegen.
3. **Plan erstellen:** Skizziere deinen Umsetzungsplan in klaren Schritten.
4. **Implementieren:** Setze den Plan um, aber erst nach meiner Antwort auf 2 und 3.

Lies vorher `CLAUDE.md` im Repo-Wurzelverzeichnis (Abschnitt `lib/achievements.js`) und
`CONTRIBUTING.md` („how to add an achievement without shipping an impossible one“). Beide
gelten.

## Teil A: Bestand prüfen

### Ausgangslage (gemessen am 2026-10-07, bitte selbst nachrechnen)

- `lib/achievements.js` exportiert `ACHIEVEMENTS` mit **1200** Einträgen
  (`key`, `category`, `tier`, `emoji`, `check`), 14 Kategorien, 5 Stufen, 145 verwendete
  Stat-Felder aus `buildStats(agg)`.
- Der Anlass: **`tool_read_50k`** (Platin, „Bookworm“) und **`tl_read_50k`** (Gold,
  „Blick“) prüfen beide „50.000 Read-Aufrufe“. Ein Nutzer bekam am selben Tag zwei
  Abzeichen für eine Leistung, und die beiden tragen auch noch verschiedene Stufen.
- Die Bedingungen sind unterschiedlich **geschrieben**
  (`(s.toolCallsByName.Read || 0) >= 50_000` gegenüber
  `(s.toolCallsByName['Read'] || 0) >= 50000`). Ein Textvergleich der `check`-Funktionen
  findet deshalb nur 32 Gruppen. Nach Normalisierung (Klammerzugriff → Punktzugriff,
  `|| 0` weg, Tausendertrenner weg) sind es **49 Gruppen mit zusammen 99 Achievements,
  davon 21 Gruppen mit widersprüchlicher Stufe**. Beispiele:
  - `streak_7`/silver = `seven_day_week`/gold
  - `input_10m`/gold = `inp2_10m`/platinum
  - `tool_500k_calls` = `tc2_500k` = `lm_tools_500k` (drei für eine Leistung)
- Auch die Normalisierung ist nur eine Untergrenze. Finde Gleichheit **semantisch**,
  nicht textuell (siehe unten).

### Was du prüfst

Schreib dafür ein Analyse-Skript `tools/audit-achievements.mjs`. Ändere während der
Analyse nichts am Bestand. Das Skript erzeugt den Bericht
`docs/achievements-audit-2026-10.md`. Prüfe:

1. **Duplikate, semantisch:** Zwei Achievements sind gleich, wenn ihre `check`-Funktionen
   auf allen Stat-Vektoren dasselbe liefern.
   - Werte die Checks gegen eine **Stichprobe von Stat-Vektoren** aus: die echten Stats
     (aus `data/tracker.db` über `Aggregator` + `buildStats`, nur lesen), dazu
     Variationen, die jede Schwelle knapp über- und unterschreiten, plus zufällige
     Vektoren.
   - Gleiches Ergebnis auf allen Vektoren heißt **Kandidat**, nicht Beweis. Bestätige
     jeden Kandidaten durch Lesen der beiden Funktionen.
2. **Fast-Duplikate:** gleiche Kennzahl, Schwellen so nah, dass sie fast immer am selben
   Tag fallen. Zum Beispiel 50.000 und 55.000 in zwei verschiedenen Leitern. Miss es an
   der echten Historie: wie viele Tage lagen zwischen den Freischaltungen?
3. **Implikation ohne Mehrwert:** A impliziert B, und B bringt nichts Eigenes. Zum
   Beispiel eine Kombination, deren zweite Bedingung von der ersten praktisch immer
   miterfüllt wird.
4. **Stufen-Monotonie:** Innerhalb einer Kennzahl darf eine höhere Schwelle nie eine
   niedrigere Stufe haben als eine kleinere Schwelle. Liste alle Verstöße.
5. **Text gegen Bedingung:** Name und Beschreibung in `public/js/i18n.js` (`ach_<key>`,
   `ach_<key>_desc`, deutsch **und** englisch) müssen sagen, was der Check prüft.
   - Zahl im Text gleich Schwelle im Code.
   - Einheit stimmt (Tokens gegenüber Nachrichten gegenüber Aufrufen).
   - Fehlende Übersetzungen fallen auf.
   - Doppelte **Namen** über verschiedene Keys hinweg fallen auf. Zwei Abzeichen namens
     „Bookworm“ wären auch bei verschiedenen Bedingungen verwirrend.
6. **Unerreichbar oder trivial:**
   - Unerreichbar durch Konstruktion: ein Verhältnis, das real bei 0,2 % liegt, aber
     60 % verlangt; Streaks über vier Jahre. In `CLAUDE.md` ist die Korrektur von acht
     solchen Fällen beschrieben. Finde weitere.
   - Trivial: fällt schon am ersten Tag.
   - Miss beides an den echten Stats und nenne Abstand bzw. erwartete Restdauer.
7. **Falsche Kennzahl:**
   - `durationMin` (letzte minus erste Nachricht, inklusive Leerlauf) liegt real **36×**
     über der echten Arbeitszeit `activeMin`.
   - Welle 1 nutzt es absichtlich, damit bestehende Freischaltungen nicht wegfallen.
   - Liste die betroffenen trotzdem auf, mit realem Ausmaß. Ob sie bleiben, entscheide
     ich (siehe „Vorab zu klären“).
8. **Kategorie und Emoji:** Kategorie passt nicht zur Kennzahl; zwei Stufen einer Leiter
   mit identischem Emoji.

Der Bericht gliedert sich nach diesen acht Punkten. Je Fund nennt er: Keys, Stufen, die
Bedingung im Klartext, die Zahl der Nutzer bzw. Freischaltungen, die betroffen wären (aus
der Tabelle `achievements`), und einen **Vorschlag** (zusammenlegen, Stufe korrigieren,
Text korrigieren, stilllegen, belassen). **Umsetzen erst nach meiner Freigabe des
Berichts.**

### Wie bereinigt wird

- **Keys werden nie gelöscht oder umbenannt.** In der Tabelle `achievements` stehen
  Freischaltungen mit Datum. Ein verschwundener Key ließe die Zeile verwaisen und die
  Punkte des Nutzers kommentarlos sinken.
- Ein Duplikat wird **stillgelegt**: Feld `retired: true` plus `supersededBy: '<key>'`
  am Eintrag.
  - Stillgelegte erscheinen nicht mehr im Raster, nicht im Freischalt-Popup und nicht in
    der Zahl „x von y“.
  - Ihre Punkte zählen nicht mehr doppelt, sobald der Nachfolger freigeschaltet ist.
  - Wer nur das stillgelegte hatte, bekommt den Nachfolger beim nächsten Durchlauf mit
    **dem alten Datum**.
  - Die Regel gehört in `getAchievementsResponse`, `checkAchievements` und
    `backfillAchievements`, mit Tests.
- Stufen-Korrekturen und Text-Korrekturen dürfen den Eintrag direkt ändern.
- Steht im Repo eine Gesamtzahl der Achievements (READMEs, Badges, `docs/`, Demo-Daten,
  `test/achievements.test.js`), zieht sie mit. `test/docs.test.js` prüft genannte Zahlen
  gegen die Wirklichkeit.

## Teil B: 800 neue Achievements

### Neu im Datenbestand: Codex (und Antigravity)

Der Tracker erfasst inzwischen nicht nur Claude Code. Nachrichten tragen das Feld
`provider` (`claude` als Standard, `codex`, …), siehe `lib/aggregator.js` und
`lib/db.js`. Untersuche zuerst:

- Wie viel Codex-Historie es gibt: Nachrichten, Tokens, Zeitraum, aktive Tage.
- Welche Felder Codex-Nachrichten tatsächlich tragen (Tokens, Cache, Modelle, Tools?).
- Ob die heutigen 145 Stats Codex bereits **mitzählen**, zum Beispiel in
  `totalTokens`. Dann haben Codex-Nutzer manche Abzeichen schon über die Summe
  bekommen. Das gehört in den Bericht.

### Der wichtigste Grundsatz: kein Anbieter-Kopieren

Verboten ist jedes neue Achievement, das sich von einem bestehenden **nur durch einen
Anbieterfilter** unterscheidet. Also kein „1 Mio. Tokens in Codex“ neben „1 Mio.
Tokens“, kein „7-Tage-Streak in Codex“, kein „schreibe 5 Prompts in Claude Code“ neben
„schreibe 5 Prompts in Codex“. Das ist profan und bläht nur die Zahl auf.

Anbieter dürfen nur auf zwei Arten vorkommen:

1. **Das Verhältnis zwischen Anbietern ist die Leistung.** Beispiele:
   - an einem Tag mit beiden gearbeitet haben;
   - ein Projekt, das in beiden Werkzeugen gewachsen ist;
   - die längste Serie von Tagen mit beiden;
   - ein ausgewogener Mix über einen Monat;
   - der Wechsel mitten in einer Arbeitsphase;
   - das erste Projekt, das in Codex begann und in Claude Code weiterging.
2. **Die Kennzahl gibt es nur bei einem Anbieter.** Beispiel: etwas, das nur Codex
   protokolliert. Prüfe am echten Datenbestand, ob es so etwas gibt, statt es
   anzunehmen.

Lege diese Regel als **Test** fest: Kein neues Achievement darf eine Bedingung haben, die
nach Entfernen eines Anbieterfilters semantisch einem bestehenden Achievement gleicht.
Prüf das mit derselben Stichprobenmethode wie in Teil A.

### Was „sinnvoll“ heißt

- **Neue Dimensionen statt längerer Leitern.** Der Bestand hat schon lange Zahlenleitern
  für Tokens, Nachrichten und Kosten. 800 weitere Sprossen auf denselben Leitern sind
  wertlos. Suche Verhalten, das der Bestand nicht misst, zum Beispiel:
  - Rhythmus: Wochenmuster, Rückkehr nach Pausen, Konstanz über Monate;
  - Arbeitsweise: Sub-Agenten-Anteil, MCP-Breite, Verhältnis Lesen zu Schreiben, Zeilen
    je Nachricht;
  - Effizienz: Cache-Ersparnis, Kosten je geschriebener Zeile über einen Monat;
  - Projektpflege: lange Lebensdauer eines Projekts, Wiederaufnahme nach Monaten;
  - Modellwechsel: neue Modellgenerationen früh genutzt;
  - Rate-Limits: souveräner Umgang statt Häufigkeit;
  - die Anbieter-Beziehungen aus dem Abschnitt oben.
  Jede neue Dimension braucht ein Stat-Feld in `buildStats`. Nutze vorhandene, wo sie
  passen, und lege neue mit Test an.
- **Echte Arbeitszeit nur über `activeMin`**, nie `durationMin` (36× zu hoch, siehe oben).
- **Schwellen werden abgeleitet, nicht geraten**, wie bei Welle 2 (siehe `CLAUDE.md`):
  - `heute + gemessene Rate × Horizont`, gegen einen Schnappschuss der echten Historie;
  - Horizonte von etwa einem bis zwanzig Monaten weiterer Arbeit;
  - Kennzahlen mit wenig Historie (Codex) bekommen Horizonte, die zur kurzen Basis
    passen, und die Grenze der Hochrechnung steht im Bericht.
- **Erreichbar, aber nicht geschenkt:**
  - Am Auslieferungstag sind höchstens **5 %** der neuen sofort freigeschaltet. Wenn
    mehr, waren die Schwellen zu niedrig.
  - Kein neues ist unerreichbar durch Konstruktion; jedes hat eine plausible Zeit bis zur
    Freischaltung, die der Bericht nennt.
  - Ein Test legt die Freischaltquote am echten Schnappschuss fest, nach dem Muster des
    Welle-2-Tests („≥ 400 of 500 stay locked“).
- **Verhältnis-Achievements** (Anteile, Durchschnitte) gehen durch die vorhandenen
  Stichproben-Tore (`RATIO_KEY_RE`, Mindest-Aktivtage je Stufe). Ein Verhältnis über einen
  Tag ist Zufall, keine Leistung. Neue Key-Präfixe müssen dort erfasst sein, mit Test.
- **Stufenverteilung** grob wie Welle 2. Innerhalb einer Leiter gilt strikte Monotonie
  (Teil A, Punkt 4).
- **Drei Formen**, wie in Welle 2:
  - Leitern mit thematischer Namensfolge;
  - Kombinationen aus zwei Bedingungen, die zusammen eine Aussage tragen;
  - Landmarken, also einzelne merkbare Zahlen.
  Keine Leiter länger als nötig: lieber 6 sinnvolle Sprossen als 15 lineare.

### Texte

- Je Achievement Name und Beschreibung, **deutsch und englisch**, in `public/js/i18n.js`.
- Deutsche Texte mit echten Umlauten (ü, ö, ä, ß), nie ue/oe/ae/ss.
- Namen sind kurz und einprägsam, über **alle** 2000 hinweg eindeutig, ohne Wortwitze, die
  nur auf Englisch funktionieren.
- Die Beschreibung nennt Zahl und Einheit genau so, wie der Check prüft. Ein Test
  vergleicht die Zahl im Text mit der Schwelle im Code.
- Emoji: je Eintrag eines (Rückfall für die geplanten Icons). Innerhalb einer Leiter
  steigert es sich oder bleibt bewusst gleich, aber nicht zufällig.

### Technisches

- Neue Einträge als **Welle 3** in `lib/achievements.js`, klar abgegrenzt.
  - Key-Präfixe kollisionsfrei.
  - Generator-Code ist erlaubt (Leitern aus Tabellen erzeugen), wenn die Keys stabil
    bleiben: ein Key darf sich nie ändern, sobald er ausgeliefert ist.
- **Rückdatierung:** Neue Achievements, die schon erfüllt sind, sollen ihr historisches
  Datum bekommen, nicht „heute“. Erhöhe dafür die Migrationsversion `ACH_BACKFILL_FLAG`
  (heute `ach_backfill_v3_`). Der Backfill läuft dann einmal neu; das Schreiben ist
  bereits atomar (`replaceAchievementsForUser`).
  - Prüfe, dass ein leerer Aggregator nie Freischaltungen löscht.
  - Prüfe, dass stillgelegte Keys (Teil A) dabei richtig behandelt werden.
- Demo-Daten (`public/js/demo-data.js`): Gesamtzahl und ein paar Beispiele der neuen
  Welle nachziehen.
- Die Leistung bleibt im Rahmen. Miss die Laufzeit von `checkAchievements` und von einem
  vollen Backfill vor und nach der Erweiterung an der echten DB und nenne beide Zahlen.
  Mehr als doppelt so lang heißt optimieren.

## Prüfen

- Unit-Tests für:
  - jede neue Stat-Dimension;
  - die Stilllegungs-Regel (nicht im Raster, Punkte nicht doppelt, Nachfolger mit altem
    Datum);
  - das Anbieter-Kopier-Verbot;
  - Text-Zahl gleich Schwelle;
  - eindeutige Namen und Keys;
  - Stufen-Monotonie über den **gesamten** Bestand, damit die 21 Konflikte nicht
    wiederkommen;
  - die Freischaltquote am Schnappschuss.
- **Gegenprobe jedes neuen Tests:**
  - Den Fehler absichtlich einbauen (ein Duplikat, eine falsche Stufe, eine Textzahl
    daneben) und den Test **rot** sehen.
  - Vorher per Prüfsumme belegen, dass die Mutation die Datei wirklich verändert hat.
  - Ein Test, den man nie scheitern gesehen hat, beweist nichts.
- Der Audit-Bericht wird nach der Bereinigung **erneut** erzeugt und muss bei Duplikaten
  und Stufen-Konflikten 0 zeigen. Lass das Skript vorher einmal gegen den alten Stand
  laufen und sieh, dass es die 49 Gruppen findet. Ein Werkzeug, das 0 meldet, ist erst
  nach dieser Gegenprobe glaubwürdig.
- `npm test` und `npm run lint` grün. Danach `git add`, **dann** `npm run badges` (Zahlen
  und Zeilenzahl ändern sich). CHANGELOG-Eintrag und Minor-Version in `package.json`.

## Vorab zu klären (Fragen an mich, vor der Umsetzung)

1. **Stilllegen oder zusammenführen:** Ist das Modell `retired` + `supersededBy` recht?
   Oder sollen bei Duplikaten Freischaltungen auf den Nachfolger **umgeschrieben**
   werden?
2. **Welcher Key überlebt** bei Duplikaten: der ältere (Welle 1), der mit der passenderen
   Stufe oder der mit dem besseren Namen?
3. **`durationMin`-Achievements aus Welle 1:** belassen (Freischaltungen bleiben), auf
   `activeMin` umstellen (manche fallen weg) oder stilllegen?
4. **Gesamtzahl:** genau 800 neue, oder „bis zu 800, nur sinnvolle“? Ich bevorzuge
   Qualität. Nenne die Zahl, die nach den Regeln oben wirklich trägt.
5. **Codex-Historie:** Wenn sie für tragfähige Schwellen zu kurz ist, sollen
   Anbieter-Beziehungs-Achievements später kommen?
6. Alles, was dir beim Lesen des Bestands sonst als fragwürdig auffällt.

## Was ich am Ende sehen will

- Den Audit-Bericht (vorher und nachher, mit Zahlen).
- Die Liste der stillgelegten und korrigierten Achievements.
- Die neuen Dimensionen mit je einem Beispiel aus jeder Form (Leiter, Kombination,
  Landmarke).
- Die Freischaltquote am Auslieferungstag und die erwartete Zeit bis zur Freischaltung,
  verteilt über die neue Welle.
- Testanzahl, Liste der Gegenproben (rot gesehen: ja/nein), Laufzeiten vorher und
  nachher.

## Grenzen

- Keine neuen npm-Abhängigkeiten.
- Keine Keys löschen oder umbenennen, keine Freischaltungen löschen.
- Die echte DB `data/tracker.db` nur **lesen**. Tests laufen gegen Wegwerf-DBs (siehe
  `CLAUDE.md`, Abschnitt Tests).
- Commit-Messages englisch; nicht pushen, nicht deployen.
