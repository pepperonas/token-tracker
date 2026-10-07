# Achievement-Bereinigung und Welle 3 — Oktober 2026

Der freigegebene Umfang setzt die Empfehlung um, den Katalog gezielt um 74 Leistungen zu erweitern, statt 800 weitere Zahlensprossen zu erzeugen. Aus 1200 bisherigen Definitionen wurden 50 semantische Doppelungen stillgelegt; 74 neue ergeben 1274 historische Definitionen und **1224 aktive Achievements**. Die 50 alten Keys bleiben gespeichert. Der ältere Key ist jeweils der sichtbare Nachfolger; ein ausschließlich alter Unlock überträgt sein Datum, ohne einen zweiten Punktwert oder ein neues Popup auszulösen. Die vollständige Zuordnung steht in `RETIRED_BY` in `lib/achievements.js` und die historischen Funde im [Vorher-Audit](achievements-audit-2026-10.md).

94 aktive alte Stufen wurden nach einem minimalen, auf bereits vergebene Stufen Rücksicht nehmenden Abgleich angepasst (93 Anhebungen, eine Senkung eines noch nicht erreichten Ziels). Acht veraltete Beschreibungen und doppelte Namen wurden in Deutsch und Englisch korrigiert. Bestehende Freischaltungen erhalten beim einmaligen Backfill v4 ihre historischen Daten; ein leerer Verlauf löst keinen Tabellenersatz aus.

## Neue Leistungen und geschätzte Horizonte

Die echte, nur lesend ausgewertete Historie am 7. Oktober enthielt 246 aktive Tage. Die folgenden Bereiche zeigen den damaligen Wert und die Ziele der neuen Leitern. Horizonte sind grobe Fortschreibungen der beobachteten Aktivität, keine Prognose für einen einzelnen Nutzer. Besonders bei Serien, Anteilen und Projektalter ist lineare Hochrechnung unzuverlässig.

| Dimension | Ausgangswert → Ziele | Plausibler Horizont |
|---|---|---|
| Wochen mit ≥4 bzw. ≥5 aktiven Tagen | 37 → 42–120; 35 → 40–95 | erste Stufe etwa 1–2, letzte etwa 16–20 Monate |
| Monate mit ≥15 bzw. ≥20 aktiven Tagen | 8 → 9–24 | erste Stufe etwa 1, letzte etwa 16–20 Monate |
| Längste Folge von Vier-Tage-Wochen | 37 → 42–120 | ab etwa 1 Monat, nur falls die Serie hält |
| Tage mit ≥100 Codezeilen und ≥5 protokollierten Tool-Aufrufen | 223 → 250–800 | erste Stufe etwa 1–2, letzte etwa 18–20 Monate |
| Wochen mit ≥2 solchen Tagen | 39 → 45–115 | erste Stufe etwa 1–2, letzte etwa 16–20 Monate |
| Längste Projektlebensdauer | 253 → 300–750 Tage | etwa 2–17 Monate bei weiterer Arbeit am Projekt |
| Projekte mit ≥90, ≥180 bzw. ≥365 Tagen Lebensdauer | 30 → 35–100; 7 → 10–40; 0 → 1–6 | ab etwa 1–4 Monaten; spätere Ziele hängen vom Reifen bestehender Projekte ab |
| Sitzungen mit ≥60 aktiven Minuten und ≥2 Modellen | 233 → 260–750 | erste Stufe etwa 1–2, letzte etwa 18–20 Monate |
| Anteil der Code-und-Tool-Tage | 90,65 % → 92–95 % | mehrere Monate konsequenter Arbeit; ohne bessere Quote bleibt das Ziel offen |

Zehn Kombinationen verbinden zwei unabhängige Bedingungen, etwa „Wurzeln und Rhythmus“ (45 Vier-Tage-Wochen **und** 35 mindestens 90 Tage alte Projekte). Drei Landmarken markieren 100 Vier-Tage-Wochen, den 365. Tag eines Projekts und 500 Code-und-Tool-Tage. Die neue Stufenverteilung ist 18 Gold, 27 Platin und 29 Diamant. Anbieterfilter kommen in keiner neuen Bedingung vor: Codex- und Antigravity-Daten zählen in den globalen Statistiken bereits mit. Die kurze Codex-Historie trägt noch keine belastbare anbieterübergreifende Leiter.

## Verifikation

Am gemessenen Schnappschuss waren **0 von 74** neuen Leistungen sofort erfüllt; die Grenze lag bei höchstens 5 %. Der [Audit des aktiven Endbestands](achievements-audit-after-2026-10.md) findet 0 bestätigte semantische Duplikate, 0 zusätzliche Fingerabdruck-Kandidaten, 0 Stufen-Umkehrungen und 0 fehlende oder doppelte Namen. Seine 45 Paare mit nahen, aber verschiedenen Schwellen bleiben als redaktionelle Prüfkandidaten erhalten. Es bleiben alte, äußerst ferne Schwellen sowie `durationMin`-basierte Welle-1-Leistungen, wie vorab entschieden.

Auf demselben nur lesend geladenen Aggregator und mit einem Wegwerf-Adapter für Schreibzugriffe dauerte `checkAchievements` vor der Änderung 235,2 ms und beim letzten Nachher-Lauf 88,7 ms, der volle Backfill 10 215,9 ms bzw. 6 760,1 ms. Das sind Einzelmessungen mit JIT-/Cache-Effekten, also kein belastbarer Beschleunigungsnachweis; beide liegen nach der Erweiterung unter der Zweifach-Grenze. Die Testsuite umfasst 783 grüne Tests; für sieben neue Katalogprüfungen und vier Migrationsprüfungen wurde jeweils eine absichtliche Quellmutation mit geänderter Prüfsumme und rotem Test beobachtet und anschließend rückgängig gemacht.
