# Achievement-Audit — aktiver Endbestand, Oktober 2026

Erzeugt am 2026-10-07T16:37:30.590Z durch `node tools/audit-achievements.mjs`. Die produktive DB wurde **nur lesend** geöffnet. Der Bericht prüft nur aktive Definitionen nach der Bereinigung.

**Basis:** 1.224 Definitionen, 359.359 Nachrichten, 619 gespeicherte Freischaltungen bei 1 Nutzer(n), 4.505 Stat-Vektoren (138 variierte Felder). Ein gleicher Fingerabdruck ist nur ein Kandidat. Ausdrucksgleichheit nach dokumentierter Normalisierung belegt die unten als sicher markierten Paare; andere Kandidaten brauchen Quellcodeprüfung.

## 1. Semantische Duplikate

**Sichere Untergrenze:** 0 Gruppen, 0 Einträge; bei Beibehaltung des ältesten Keys würden 0 Keys stillgelegt. 0 Gruppen haben widersprüchliche Stufen. Die Normalisierung vereinheitlicht Klammer-/Punktzugriff, optionale Null-Fallbacks, Tausendertrenner und Leerraum. Stichprobengleichheit fand zusätzlich 0 nicht textgleiche Kandidatengruppen, die **nicht automatisch** als Duplikate gelten.

| Keys (Stufe) | gleiche Bedingung | Betroffene | Vorschlag |
|---|---|---|---|

### Weitere Stichproben-Kandidaten

Die folgenden Gruppen liefern auf allen Testvektoren dasselbe Ergebnis, haben aber verschiedene Ausdrücke. Sie sind bewusst **nicht** zur Stilllegung freigegeben:
Keine weiteren Kandidaten nach Grenzfall-Stichproben.

## 2. Fast-Duplikate

Heuristik: benachbarte Schwellen derselben einfachen Kennzahl mit höchstens 12 % Abstand. 45 Paare; Tage zwischen vorhandenen Freischaltungen stehen in der Tabelle. Ein negatives Vorzeichen deutet auf historisch unterschiedlich datierte Checks hin.

| Keys / Stufen | Kennzahl und Schwellen | Betroffene | Abstand | Vorschlag |
|---|---|---|---|---|
| `tok2_90b` (diamond) / `lm_tokens_100b` (diamond) | totalTokens: 90.000.000.000 → 100.000.000.000 | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | 12 Tage | Leiter prüfen, ggf. eine Schwelle stilllegen |
| `msg2_450k` (diamond) / `messages_500k` (diamond) | totalMessages: 450.000 → 500.000 | 0 Nutzer / 0 Freischaltungen; 0 Nutzer / 0 Freischaltungen | nicht beide freigeschaltet | Leiter prüfen, ggf. eine Schwelle stilllegen |
| `cost2_90k` (diamond) / `cost_100k` (diamond) | totalCost: 90.000 → 100.000 | 0 Nutzer / 0 Freischaltungen; 0 Nutzer / 0 Freischaltungen | nicht beide freigeschaltet | Leiter prüfen, ggf. eine Schwelle stilllegen |
| `lw2_4p5m` (diamond) / `lines_written_5m` (diamond) | totalLinesWritten: 4.500.000 → 5.000.000 | 0 Nutzer / 0 Freischaltungen; 0 Nutzer / 0 Freischaltungen | nicht beide freigeschaltet | Leiter prüfen, ggf. eine Schwelle stilllegen |
| `ld2_450k` (diamond) / `lines_deleted_500k` (diamond) | totalLinesRemoved: 450.000 → 500.000 | 0 Nutzer / 0 Freischaltungen; 0 Nutzer / 0 Freischaltungen | nicht beide freigeschaltet | Leiter prüfen, ggf. eine Schwelle stilllegen |
| `ld2_900k` (diamond) / `lines_deleted_1m` (diamond) | totalLinesRemoved: 900.000 → 1.000.000 | 0 Nutzer / 0 Freischaltungen; 0 Nutzer / 0 Freischaltungen | nicht beide freigeschaltet | Leiter prüfen, ggf. eine Schwelle stilllegen |
| `tc2_450k` (diamond) / `tool_500k_calls` (diamond) | totalToolCalls: 450.000 → 500.000 | 0 Nutzer / 0 Freischaltungen; 0 Nutzer / 0 Freischaltungen | nicht beide freigeschaltet | Leiter prüfen, ggf. eine Schwelle stilllegen |
| `prj2_450` (diamond) / `project_500` (diamond) | projectCount: 450 → 500 | 0 Nutzer / 0 Freischaltungen; 0 Nutzer / 0 Freischaltungen | nicht beide freigeschaltet | Leiter prüfen, ggf. eine Schwelle stilllegen |
| `streak_90` (diamond) / `strk2_100` (diamond) | longestStreak: 90 → 100 | 0 Nutzer / 0 Freischaltungen; 0 Nutzer / 0 Freischaltungen | nicht beide freigeschaltet | Leiter prüfen, ggf. eine Schwelle stilllegen |
| `strk2_175` (diamond) / `streak_180` (diamond) | longestStreak: 175 → 180 | 0 Nutzer / 0 Freischaltungen; 0 Nutzer / 0 Freischaltungen | nicht beide freigeschaltet | Leiter prüfen, ggf. eine Schwelle stilllegen |
| `streak_365` (diamond) / `streak_1500` (diamond) | longestStreak: 365 → 400 | 0 Nutzer / 0 Freischaltungen; 0 Nutzer / 0 Freischaltungen | nicht beide freigeschaltet | Leiter prüfen, ggf. eine Schwelle stilllegen |
| `adays2_350` (platinum) / `active_days_365` (diamond) | activeDays: 350 → 365 | 0 Nutzer / 0 Freischaltungen; 0 Nutzer / 0 Freischaltungen | nicht beide freigeschaltet | Leiter prüfen, ggf. eine Schwelle stilllegen |
| `active_days_365` (diamond) / `adays2_400` (diamond) | activeDays: 365 → 400 | 0 Nutzer / 0 Freischaltungen; 0 Nutzer / 0 Freischaltungen | nicht beide freigeschaltet | Leiter prüfen, ggf. eine Schwelle stilllegen |
| `adays2_450` (diamond) / `active_days_500` (diamond) | activeDays: 450 → 500 | 0 Nutzer / 0 Freischaltungen; 0 Nutzer / 0 Freischaltungen | nicht beide freigeschaltet | Leiter prüfen, ggf. eine Schwelle stilllegen |
| `adays2_700` (diamond) / `active_days_730` (diamond) | activeDays: 700 → 730 | 0 Nutzer / 0 Freischaltungen; 0 Nutzer / 0 Freischaltungen | nicht beide freigeschaltet | Leiter prüfen, ggf. eine Schwelle stilllegen |
| `cache_rate_70` (gold) / `cache_rate_75` (gold) | avgCacheRate: 70 → 75 | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | 0 Tage | Leiter prüfen, ggf. eine Schwelle stilllegen |
| `cache_rate_75` (gold) / `cache_rate_80` (platinum) | avgCacheRate: 75 → 80 | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | 11 Tage | Leiter prüfen, ggf. eine Schwelle stilllegen |
| `cache_rate_80` (platinum) / `cache_rate_85` (platinum) | avgCacheRate: 80 → 85 | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | 0 Tage | Leiter prüfen, ggf. eine Schwelle stilllegen |
| `cache_rate_85` (platinum) / `cache_rate_90` (diamond) | avgCacheRate: 85 → 90 | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | 19 Tage | Leiter prüfen, ggf. eine Schwelle stilllegen |
| `cache_rate_90` (diamond) / `cache_rate_95` (diamond) | avgCacheRate: 90 → 95 | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | 0 Tage | Leiter prüfen, ggf. eine Schwelle stilllegen |
| `cache_rate_95` (diamond) / `cache_rate_99` (diamond) | avgCacheRate: 95 → 99 | 1 Nutzer / 1 Freischaltung; 0 Nutzer / 0 Freischaltungen | nicht beide freigeschaltet | Leiter prüfen, ggf. eine Schwelle stilllegen |
| `inp2_9m` (gold) / `input_10m` (gold) | totalInputTokens: 9.000.000 → 10.000.000 | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | 0 Tage | Leiter prüfen, ggf. eine Schwelle stilllegen |
| `ld_day2_45k` (diamond) / `lines_day_50k` (diamond) | maxDayLines: 45.000 → 50.000 | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | 0 Tage | Leiter prüfen, ggf. eine Schwelle stilllegen |
| `ld_day2_90k` (diamond) / `lines_day_100k` (diamond) | maxDayLines: 90.000 → 100.000 | 0 Nutzer / 0 Freischaltungen; 0 Nutzer / 0 Freischaltungen | nicht beide freigeschaltet | Leiter prüfen, ggf. eine Schwelle stilllegen |
| `tl_read_90k` (diamond) / `tool_read_100k` (diamond) | toolCallsByName.Read: 90.000 → 100.000 | 0 Nutzer / 0 Freischaltungen; 0 Nutzer / 0 Freischaltungen | nicht beide freigeschaltet | Leiter prüfen, ggf. eine Schwelle stilllegen |
| `fweek2_90` (diamond) / `full_weekend_100` (diamond) | fullWeekendCount: 90 → 100 | 0 Nutzer / 0 Freischaltungen; 0 Nutzer / 0 Freischaltungen | nicht beide freigeschaltet | Leiter prüfen, ggf. eine Schwelle stilllegen |
| `output_ratio_60` (gold) / `output_ratio_70` (platinum) | outputRatio: 0,004 → 0,008 | 0 Nutzer / 0 Freischaltungen; 0 Nutzer / 0 Freischaltungen | nicht beide freigeschaltet | Leiter prüfen, ggf. eine Schwelle stilllegen |
| `output_ratio_70` (platinum) / `output_ratio_80` (diamond) | outputRatio: 0,008 → 0,015 | 0 Nutzer / 0 Freischaltungen; 0 Nutzer / 0 Freischaltungen | nicht beide freigeschaltet | Leiter prüfen, ggf. eine Schwelle stilllegen |
| `ses_100m_450` (diamond) / `ses_100m_500` (diamond) | sessionsAbove100Msgs: 450 → 500 | 0 Nutzer / 0 Freischaltungen; 0 Nutzer / 0 Freischaltungen | nicht beide freigeschaltet | Leiter prüfen, ggf. eine Schwelle stilllegen |
| `prj_sess2_900` (diamond) / `proj_sessions_1k` (diamond) | maxProjectSessions: 900 → 1.000 | 0 Nutzer / 0 Freischaltungen; 0 Nutzer / 0 Freischaltungen | nicht beide freigeschaltet | Leiter prüfen, ggf. eine Schwelle stilllegen |
| `prj_msg2_45k` (diamond) / `proj_msgs_50k` (diamond) | maxProjectMessages: 45.000 → 50.000 | 0 Nutzer / 0 Freischaltungen; 0 Nutzer / 0 Freischaltungen | nicht beide freigeschaltet | Leiter prüfen, ggf. eine Schwelle stilllegen |
| `weeks2_45` (gold) / `weeks_active_50` (gold) | uniqueWeeksActive: 45 → 50 | 0 Nutzer / 0 Freischaltungen; 0 Nutzer / 0 Freischaltungen | nicht beide freigeschaltet | Leiter prüfen, ggf. eine Schwelle stilllegen |
| `avg_cost_msg_01` (silver) / `avg_cost_msg_05` (gold) | avgCostPerMessage: 0,01 → 0,05 | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | 20 Tage | Leiter prüfen, ggf. eine Schwelle stilllegen |
| `avg_cost_msg_05` (gold) / `avg_cost_msg_10` (platinum) | avgCostPerMessage: 0,05 → 0,1 | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | 54 Tage | Leiter prüfen, ggf. eine Schwelle stilllegen |
| `avg_cost_msg_10` (platinum) / `avg_cost_msg_25` (diamond) | avgCostPerMessage: 0,1 → 0,25 | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | 163 Tage | Leiter prüfen, ggf. eine Schwelle stilllegen |
| `deletion_ratio_20` (silver) / `deletion_ratio_40` (gold) | deletionRatio: 0,2 → 0,4 | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | 3 Tage | Leiter prüfen, ggf. eine Schwelle stilllegen |
| `deletion_ratio_40` (gold) / `deletion_ratio_60` (platinum) | deletionRatio: 0,4 → 0,6 | 1 Nutzer / 1 Freischaltung; 0 Nutzer / 0 Freischaltungen | nicht beide freigeschaltet | Leiter prüfen, ggf. eine Schwelle stilllegen |
| `deletion_ratio_60` (platinum) / `deletion_ratio_80` (diamond) | deletionRatio: 0,6 → 0,8 | 0 Nutzer / 0 Freischaltungen; 0 Nutzer / 0 Freischaltungen | nicht beide freigeschaltet | Leiter prüfen, ggf. eine Schwelle stilllegen |
| `deep_hours_4p5k` (diamond) / `deep_hours_5k` (diamond) | totalActiveHours: 4.500 → 5.000 | 0 Nutzer / 0 Freischaltungen; 0 Nutzer / 0 Freischaltungen | nicht beide freigeschaltet | Leiter prüfen, ggf. eine Schwelle stilllegen |
| `cache_save_900k` (diamond) / `cache_save_1m` (diamond) | cacheSavingsUsd: 900.000 → 1.000.000 | 0 Nutzer / 0 Freischaltungen; 0 Nutzer / 0 Freischaltungen | nicht beide freigeschaltet | Leiter prüfen, ggf. eine Schwelle stilllegen |
| `mdl_multi_450` (gold) / `mdl_multi_500` (platinum) | multiModelSessions: 450 → 500 | 1 Nutzer / 1 Freischaltung; 0 Nutzer / 0 Freischaltungen | nicht beide freigeschaltet | Leiter prüfen, ggf. eine Schwelle stilllegen |
| `lm_day_hours_22` (diamond) / `lm_day_hours_24` (diamond) | maxHoursInDay: 22 → 24 | 0 Nutzer / 0 Freischaltungen; 0 Nutzer / 0 Freischaltungen | nicht beide freigeschaltet | Leiter prüfen, ggf. eine Schwelle stilllegen |
| `w3_ratio_code_1` (gold) / `w3_ratio_code_2` (platinum) | codeToolDayShare: 0,92 → 0,93 | 0 Nutzer / 0 Freischaltungen; 0 Nutzer / 0 Freischaltungen | nicht beide freigeschaltet | Leiter prüfen, ggf. eine Schwelle stilllegen |
| `w3_ratio_code_2` (platinum) / `w3_ratio_code_3` (platinum) | codeToolDayShare: 0,93 → 0,94 | 0 Nutzer / 0 Freischaltungen; 0 Nutzer / 0 Freischaltungen | nicht beide freigeschaltet | Leiter prüfen, ggf. eine Schwelle stilllegen |
| `w3_ratio_code_3` (platinum) / `w3_ratio_code_4` (diamond) | codeToolDayShare: 0,94 → 0,95 | 0 Nutzer / 0 Freischaltungen; 0 Nutzer / 0 Freischaltungen | nicht beide freigeschaltet | Leiter prüfen, ggf. eine Schwelle stilllegen |

## 3. Implikation ohne erkennbaren Mehrwert

185 Kombination→Einzelbedingung-Kandidaten wurden durch Klauselvergleich gefunden. Eine Implikation allein ist kein Fehler: Die Kombination muss zusätzlich auf ihren eigenen Aussagewert geprüft werden.

| Kombination | impliziert | Betroffene | Vorschlag |
|---|---|---|---|
| `millennium` (diamond), `s.totalSessions>=1000&&s.totalMessages>=100000&&s.totalCost>=1000` | `sessions_1k` (diamond) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `millennium` (diamond), `s.totalSessions>=1000&&s.totalMessages>=100000&&s.totalCost>=1000` | `messages_100k` (diamond) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `millennium` (diamond), `s.totalSessions>=1000&&s.totalMessages>=100000&&s.totalCost>=1000` | `cost_1000` (diamond) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `cache_and_tokens_100m` (platinum), `s.avgCacheRate>=70&&s.totalTokens>=100000000` | `tokens_100m` (diamond) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `cache_and_tokens_100m` (platinum), `s.avgCacheRate>=70&&s.totalTokens>=100000000` | `cache_rate_70` (gold) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `cache_and_tokens_500m` (diamond), `s.avgCacheRate>=80&&s.totalTokens>=500000000` | `tokens_500m` (diamond) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `cache_and_tokens_500m` (diamond), `s.avgCacheRate>=80&&s.totalTokens>=500000000` | `cache_rate_80` (platinum) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `cache_and_tokens_1b` (diamond), `s.avgCacheRate>=90&&s.totalTokens>=1000000000` | `cache_rate_90` (diamond) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `cache_and_tokens_1b` (diamond), `s.avgCacheRate>=90&&s.totalTokens>=1000000000` | `tokens_1b` (diamond) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `cache_and_sessions_1k` (diamond), `s.avgCacheRate>=70&&s.totalSessions>=1000` | `cache_rate_70` (gold) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `cache_and_sessions_1k` (diamond), `s.avgCacheRate>=70&&s.totalSessions>=1000` | `sessions_1k` (diamond) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `cache_and_cost_1k` (diamond), `s.avgCacheRate>=90&&s.totalCost>=1000` | `cache_rate_90` (diamond) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `cache_and_cost_1k` (diamond), `s.avgCacheRate>=90&&s.totalCost>=1000` | `cost_1000` (diamond) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `cache_master_90_100d` (diamond), `s.avgCacheRate>=90&&s.activeDays>=100` | `active_days_100` (gold) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `cache_master_90_100d` (diamond), `s.avgCacheRate>=90&&s.activeDays>=100` | `cache_rate_90` (diamond) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `cache_king_95_365d` (diamond), `s.avgCacheRate>=95&&s.activeDays>=365` | `active_days_365` (diamond) | 0 Nutzer / 0 Freischaltungen; 0 Nutzer / 0 Freischaltungen | Bedeutung prüfen, ggf. belassen |
| `cache_king_95_365d` (diamond), `s.avgCacheRate>=95&&s.activeDays>=365` | `cache_rate_95` (diamond) | 0 Nutzer / 0 Freischaltungen; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `cache_and_msgs_100k` (diamond), `s.avgCacheRate>=80&&s.totalMessages>=100000` | `cache_rate_80` (platinum) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `cache_and_msgs_100k` (diamond), `s.avgCacheRate>=80&&s.totalMessages>=100000` | `messages_100k` (diamond) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `cache_and_msgs_500k` (diamond), `s.avgCacheRate>=85&&s.totalMessages>=500000` | `messages_500k` (diamond) | 0 Nutzer / 0 Freischaltungen; 0 Nutzer / 0 Freischaltungen | Bedeutung prüfen, ggf. belassen |
| `cache_and_msgs_500k` (diamond), `s.avgCacheRate>=85&&s.totalMessages>=500000` | `cache_rate_85` (platinum) | 0 Nutzer / 0 Freischaltungen; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `cache_and_projects_50` (diamond), `s.avgCacheRate>=80&&s.projectCount>=50` | `cache_rate_80` (platinum) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `cache_and_projects_50` (diamond), `s.avgCacheRate>=80&&s.projectCount>=50` | `project_50` (diamond) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `cache_emperor` (diamond), `s.avgCacheRate>=95&&s.totalTokens>=1000000000&&s.activeDays>=365` | `tokens_1b` (diamond) | 0 Nutzer / 0 Freischaltungen; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `cache_emperor` (diamond), `s.avgCacheRate>=95&&s.totalTokens>=1000000000&&s.activeDays>=365` | `active_days_365` (diamond) | 0 Nutzer / 0 Freischaltungen; 0 Nutzer / 0 Freischaltungen | Bedeutung prüfen, ggf. belassen |
| `cache_emperor` (diamond), `s.avgCacheRate>=95&&s.totalTokens>=1000000000&&s.activeDays>=365` | `cache_rate_95` (diamond) | 0 Nutzer / 0 Freischaltungen; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `veteran_1y` (diamond), `s.activeDays>=365&&s.totalCost>=500` | `cost_500` (diamond) | 0 Nutzer / 0 Freischaltungen; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `veteran_1y` (diamond), `s.activeDays>=365&&s.totalCost>=500` | `active_days_365` (diamond) | 0 Nutzer / 0 Freischaltungen; 0 Nutzer / 0 Freischaltungen | Bedeutung prüfen, ggf. belassen |
| `veteran_2y` (diamond), `s.activeDays>=730&&s.totalCost>=1000` | `cost_1000` (diamond) | 0 Nutzer / 0 Freischaltungen; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `veteran_2y` (diamond), `s.activeDays>=730&&s.totalCost>=1000` | `active_days_730` (diamond) | 0 Nutzer / 0 Freischaltungen; 0 Nutzer / 0 Freischaltungen | Bedeutung prüfen, ggf. belassen |
| `grandmaster` (diamond), `s.totalSessions>=500&&s.totalMessages>=50000&&s.totalCost>=500` | `sessions_500` (diamond) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `grandmaster` (diamond), `s.totalSessions>=500&&s.totalMessages>=50000&&s.totalCost>=500` | `messages_50k` (diamond) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `grandmaster` (diamond), `s.totalSessions>=500&&s.totalMessages>=50000&&s.totalCost>=500` | `cost_500` (diamond) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `unstoppable` (diamond), `s.longestStreak>=100&&s.totalMessages>=10000` | `messages_10k` (platinum) | 0 Nutzer / 0 Freischaltungen; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `unstoppable` (diamond), `s.longestStreak>=100&&s.totalMessages>=10000` | `strk2_100` (diamond) | 0 Nutzer / 0 Freischaltungen; 0 Nutzer / 0 Freischaltungen | Bedeutung prüfen, ggf. belassen |
| `diverse_master` (diamond), `s.toolCount>=20&&s.modelCount>=5&&s.projectCount>=50` | `model_diversity_5` (diamond) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `diverse_master` (diamond), `s.toolCount>=20&&s.modelCount>=5&&s.projectCount>=50` | `tool_diversity_20` (diamond) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `diverse_master` (diamond), `s.toolCount>=20&&s.modelCount>=5&&s.projectCount>=50` | `project_50` (diamond) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `code_factory` (diamond), `s.netLines>=100000&&s.totalSessions>=500` | `sessions_500` (diamond) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `code_factory` (diamond), `s.netLines>=100000&&s.totalSessions>=500` | `lines_net_100k` (diamond) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `token_billionaire` (diamond), `s.totalTokens>=1000000000&&s.totalCost>=1000` | `tokens_1b` (diamond) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `token_billionaire` (diamond), `s.totalTokens>=1000000000&&s.totalCost>=1000` | `cost_1000` (diamond) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `marathon_lord` (diamond), `s.marathonSessions>=100&&s.totalMessages>=10000` | `messages_10k` (platinum) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `marathon_lord` (diamond), `s.marathonSessions>=100&&s.totalMessages>=10000` | `marathon_100` (diamond) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `night_lord` (diamond), `s.nightOwlSessions>=500&&s.marathonSessions>=100` | `night_owl_500` (diamond) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `night_lord` (diamond), `s.nightOwlSessions>=500&&s.marathonSessions>=100` | `marathon_100` (diamond) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `early_riser_elite` (diamond), `s.earlyBirdSessions>=500&&s.totalMessages>=50000` | `messages_50k` (diamond) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `early_riser_elite` (diamond), `s.earlyBirdSessions>=500&&s.totalMessages>=50000` | `early_bird_500` (diamond) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `project_empire` (diamond), `s.projectCount>=100&&s.totalSessions>=10000` | `sessions_10k` (diamond) | 0 Nutzer / 0 Freischaltungen; 0 Nutzer / 0 Freischaltungen | Bedeutung prüfen, ggf. belassen |
| `project_empire` (diamond), `s.projectCount>=100&&s.totalSessions>=10000` | `project_100` (diamond) | 0 Nutzer / 0 Freischaltungen; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `infinity_coder` (diamond), `s.totalTokens>=500000000&&s.totalMessages>=100000&&s.totalCost>=5000` | `tokens_500m` (diamond) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `infinity_coder` (diamond), `s.totalTokens>=500000000&&s.totalMessages>=100000&&s.totalCost>=5000` | `messages_100k` (diamond) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `infinity_coder` (diamond), `s.totalTokens>=500000000&&s.totalMessages>=100000&&s.totalCost>=5000` | `cost_5000` (diamond) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `the_machine` (diamond), `s.totalTokens>=10000000000&&s.totalCost>=10000` | `cost_10000` (diamond) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `the_machine` (diamond), `s.totalTokens>=10000000000&&s.totalCost>=10000` | `tokens_10b` (diamond) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `all_rounder` (diamond), `s.allHoursCovered&&s.allWeekdaysCovered&&s.modelCount>=5&&s.toolCount>=20` | `all_hours` (platinum) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `all_rounder` (diamond), `s.allHoursCovered&&s.allWeekdaysCovered&&s.modelCount>=5&&s.toolCount>=20` | `model_diversity_5` (diamond) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `all_rounder` (diamond), `s.allHoursCovered&&s.allWeekdaysCovered&&s.modelCount>=5&&s.toolCount>=20` | `tool_diversity_20` (diamond) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `all_rounder` (diamond), `s.allHoursCovered&&s.allWeekdaysCovered&&s.modelCount>=5&&s.toolCount>=20` | `all_weekdays` (gold) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `opus_elite` (diamond), `s.modelMessages.opus>=50000&&s.totalCost>=1000` | `cost_1000` (diamond) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `opus_elite` (diamond), `s.modelMessages.opus>=50000&&s.totalCost>=1000` | `model_opus_50k` (diamond) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `model_master` (diamond), `s.modelMessages.sonnet>=10000&&s.modelMessages.opus>=10000&&s.modelMessages.haiku>=10000` | `model_sonnet_10k` (platinum) | 0 Nutzer / 0 Freischaltungen; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `model_master` (diamond), `s.modelMessages.sonnet>=10000&&s.modelMessages.opus>=10000&&s.modelMessages.haiku>=10000` | `model_opus_10k` (diamond) | 0 Nutzer / 0 Freischaltungen; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `model_master` (diamond), `s.modelMessages.sonnet>=10000&&s.modelMessages.opus>=10000&&s.modelMessages.haiku>=10000` | `model_haiku_10k` (platinum) | 0 Nutzer / 0 Freischaltungen; 0 Nutzer / 0 Freischaltungen | Bedeutung prüfen, ggf. belassen |
| `cache_and_lines_100k` (platinum), `s.avgCacheRate>=80&&s.totalLinesWritten>=100000` | `cache_rate_80` (platinum) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `cache_and_lines_100k` (platinum), `s.avgCacheRate>=80&&s.totalLinesWritten>=100000` | `lines_written_100k` (platinum) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `cache_and_lines_500k` (diamond), `s.avgCacheRate>=85&&s.totalLinesWritten>=500000` | `lines_written_500k` (diamond) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `cache_and_lines_500k` (diamond), `s.avgCacheRate>=85&&s.totalLinesWritten>=500000` | `cache_rate_85` (platinum) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `cache_and_streak_30` (platinum), `s.avgCacheRate>=80&&s.longestStreak>=30` | `streak_30` (platinum) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `cache_and_streak_30` (platinum), `s.avgCacheRate>=80&&s.longestStreak>=30` | `cache_rate_80` (platinum) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `cache_and_tools_50k` (platinum), `s.avgCacheRate>=80&&s.totalToolCalls>=50000` | `tool_50k_calls` (platinum) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `cache_and_tools_50k` (platinum), `s.avgCacheRate>=80&&s.totalToolCalls>=50000` | `cache_rate_80` (platinum) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `cache_and_tools_250k` (diamond), `s.avgCacheRate>=85&&s.totalToolCalls>=250000` | `tool_250k_calls` (diamond) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `cache_and_tools_250k` (diamond), `s.avgCacheRate>=85&&s.totalToolCalls>=250000` | `cache_rate_85` (platinum) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `cache_and_marathon_50` (diamond), `s.avgCacheRate>=80&&s.marathonSessions>=50` | `cache_rate_80` (platinum) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `cache_and_marathon_50` (diamond), `s.avgCacheRate>=80&&s.marathonSessions>=50` | `marathon_50` (diamond) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `cache_and_models_5` (platinum), `s.avgCacheRate>=80&&s.modelCount>=5` | `cache_rate_80` (platinum) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `cache_and_models_5` (platinum), `s.avgCacheRate>=80&&s.modelCount>=5` | `model_diversity_5` (diamond) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `polyglot_tools` (diamond), `s.toolCount>=15&&s.modelCount>=4&&s.projectCount>=20` | `model_diversity_4` (platinum) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `polyglot_tools` (diamond), `s.toolCount>=15&&s.modelCount>=4&&s.projectCount>=20` | `tool_diversity_15` (platinum) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `polyglot_tools` (diamond), `s.toolCount>=15&&s.modelCount>=4&&s.projectCount>=20` | `project_20` (diamond) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `big_spender_fast` (diamond), `s.totalCost>=1000&&s.activeDays<=30` | `cost_1000` (diamond) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `productive_weekend` (gold), `s.weekendSessionCount>=10&&s.totalLinesWritten>=10000` | `lines_written_10k` (gold) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `token_marathon` (diamond), `s.maxDayTokens>=50000000&&s.marathonSessions>=10` | `marathon_10` (platinum) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `token_marathon` (diamond), `s.maxDayTokens>=50000000&&s.marathonSessions>=10` | `peak_tokens_50m` (diamond) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `silent_grinder` (platinum), `s.totalMessages>=10000&&s.activeDays>=30&&s.longestStreak>=14` | `messages_10k` (platinum) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `silent_grinder` (platinum), `s.totalMessages>=10000&&s.activeDays>=30&&s.longestStreak>=14` | `streak_14` (gold) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `silent_grinder` (platinum), `s.totalMessages>=10000&&s.activeDays>=30&&s.longestStreak>=14` | `active_days_30` (silver) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `opus_whale` (diamond), `s.modelMessages.opus>=10000&&s.totalCost>=2000` | `model_opus_10k` (diamond) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `opus_whale` (diamond), `s.modelMessages.opus>=10000&&s.totalCost>=2000` | `cost_2000` (diamond) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `speed_demon` (platinum), `s.avgMessagesPerDay>=500&&s.shortSessions>=50` | `short_sessions_50` (silver) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `the_architect` (diamond), `s.totalLinesWritten>=100000&&s.projectCount>=25&&s.totalSessions>=100` | `sessions_100` (gold) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `the_architect` (diamond), `s.totalLinesWritten>=100000&&s.projectCount>=25&&s.totalSessions>=100` | `lines_written_100k` (platinum) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `the_architect` (diamond), `s.totalLinesWritten>=100000&&s.projectCount>=25&&s.totalSessions>=100` | `project_25` (diamond) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `cost_efficient` (platinum), `s.totalLinesWritten>=50000&&s.totalCost>0&&s.totalLinesWritten/s.totalCost>=500` | `lines_written_50k` (platinum) | 0 Nutzer / 0 Freischaltungen; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `efficient_combo` (platinum), `s.avgCacheRate>=80&&s.tokensPerDollar>=2000000&&s.linesPerDollar>=100` | `cache_rate_80` (platinum) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `efficient_combo` (platinum), `s.avgCacheRate>=80&&s.tokensPerDollar>=2000000&&s.linesPerDollar>=100` | `tokens_per_dollar_2m` (silver) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `efficient_combo` (platinum), `s.avgCacheRate>=80&&s.tokensPerDollar>=2000000&&s.linesPerDollar>=100` | `lines_per_dollar_100` (silver) | 1 Nutzer / 1 Freischaltung; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `hyper_efficient` (diamond), `s.avgCacheRate>=90&&s.tokensPerDollar>=5000000&&s.linesPerDollar>=250` | `cache_rate_90` (diamond) | 0 Nutzer / 0 Freischaltungen; 1 Nutzer / 1 Freischaltung | Bedeutung prüfen, ggf. belassen |
| `hyper_efficient` (diamond), `s.avgCacheRate>=90&&s.tokensPerDollar>=5000000&&s.linesPerDollar>=250` | `tokens_per_dollar_5m` (gold) | 0 Nutzer / 0 Freischaltungen; 0 Nutzer / 0 Freischaltungen | Bedeutung prüfen, ggf. belassen |
Weitere 85 Kandidaten nicht in der Übersicht.

## 4. Stufen-Monotonie

0 benachbarte Umkehrungen bei direkt vergleichbaren einfachen Schwellen. Kombinationsbedingungen sind getrennt zu prüfen. Würde man jede spätere Stufe mechanisch auf die höchste vorherige anheben, änderten sich 0 Einträge; viele würden Diamant. Daher Stufen je Leiter redaktionell festlegen und nicht pauschal hochsetzen.

| Kennzahl | niedrigere Schwelle | höhere Schwelle | Betroffene | Vorschlag |
|---|---|---|---|---|

## 5. Text gegen Bedingung

0 fehlende Name-/Beschreibungseinträge; 0 mehrfach verwendete Namen (je Sprache). Zahl-/Einheitsabgleich ist bei freien Kombinationstexten nicht beweisbar und wird als manuelle Prüfliste geführt.

### Fehlende Übersetzungen

### Doppelte Namen

### Korrigierte Textfehler

Die acht bestätigten Abweichungen des Vorher-Berichts wurden in beiden Sprachen korrigiert; `streak_2000` ist stillgelegt.

| Key / Stufe | tatsächlicher Check | EN / DE Beschreibung | Betroffene | Vorschlag |
|---|---|---|---|---|
| `output_ratio_60` (gold) | `s.outputRatio>=0.004` | Output tokens are at least 0.4% of all tokens / Output-Tokens machen mindestens 0,4 % aller Tokens aus | 0 Nutzer / 0 Freischaltungen | Korrigiert |
| `output_ratio_70` (platinum) | `s.outputRatio>=0.008` | Output tokens are at least 0.8% of all tokens / Output-Tokens machen mindestens 0,8 % aller Tokens aus | 0 Nutzer / 0 Freischaltungen | Korrigiert |
| `output_ratio_80` (diamond) | `s.outputRatio>=0.015` | Output tokens are at least 1.5% of all tokens / Output-Tokens machen mindestens 1,5 % aller Tokens aus | 0 Nutzer / 0 Freischaltungen | Korrigiert |
| `model_haiku_majority` (platinum) | `s.totalMessages>0&&s.modelMessages.haiku>s.totalMessages*0.08` | More than 8% of all messages use Haiku / Mehr als 8 % aller Nachrichten nutzen Haiku | 1 Nutzer / 1 Freischaltung | Korrigiert |
| `streak_1500` (diamond) | `s.longestStreak>=400` | Code 400 days in a row / An 400 Tagen in Folge coden | 0 Nutzer / 0 Freischaltungen | Korrigiert |
| `active_days_3650` (diamond) | `s.activeDays>=1200` | Be active on 1,200 days / An 1.200 Tagen aktiv sein | 0 Nutzer / 0 Freischaltungen | Korrigiert |
| `months_active_60` (diamond) | `s.monthsActive>=42` | Be active in 42 distinct months / In 42 verschiedenen Monaten aktiv | 0 Nutzer / 0 Freischaltungen | Korrigiert |

### Zahl-/Einheit-Kandidaten

98 Texte mit Zahl, aber ohne direkt erkennbare Schwelle (K/Mio./Billionen-Schreibweisen erzeugen mögliche Fehlalarme). Einheit und Aussage werden vor Korrektur von Hand geprüft.
- en `session_longest_4h` (gold; 240 auf longestSessionMin; 1 Nutzer / 1 Freischaltung): „Have a session lasting 4+ hours“ — Text prüfen.
- de `session_longest_4h` (gold; 240 auf longestSessionMin; 1 Nutzer / 1 Freischaltung): „Sitzung von 4+ Stunden“ — Text prüfen.
- en `session_longest_8h` (platinum; 480 auf longestSessionMin; 1 Nutzer / 1 Freischaltung): „Have a session lasting 8+ hours“ — Text prüfen.
- de `session_longest_8h` (platinum; 480 auf longestSessionMin; 1 Nutzer / 1 Freischaltung): „Sitzung von 8+ Stunden“ — Text prüfen.
- en `session_longest_12h` (diamond; 720 auf longestSessionMin; 1 Nutzer / 1 Freischaltung): „Have a session lasting 12+ hours“ — Text prüfen.
- de `session_longest_12h` (diamond; 720 auf longestSessionMin; 1 Nutzer / 1 Freischaltung): „Sitzung von 12+ Stunden“ — Text prüfen.
- en `session_longest_16h` (diamond; 960 auf longestSessionMin; 1 Nutzer / 1 Freischaltung): „Session lasting 16+ hours“ — Text prüfen.
- de `session_longest_16h` (diamond; 960 auf longestSessionMin; 1 Nutzer / 1 Freischaltung): „Sitzung von 16+ Stunden“ — Text prüfen.
- en `session_longest_24h` (diamond; 1440 auf longestSessionMin; 1 Nutzer / 1 Freischaltung): „Session lasting 24+ hours“ — Text prüfen.
- de `session_longest_24h` (diamond; 1440 auf longestSessionMin; 1 Nutzer / 1 Freischaltung): „Sitzung von 24+ Stunden“ — Text prüfen.
- en `avg_session_dur_60` (gold; 60 auf avgSessionDurationMin; 1 Nutzer / 1 Freischaltung): „Average session duration 1+ hour“ — Text prüfen.
- de `avg_session_dur_60` (gold; 60 auf avgSessionDurationMin; 1 Nutzer / 1 Freischaltung): „Durchschnittliche Sitzungsdauer 1+ Stunde“ — Text prüfen.
- en `avg_session_dur_120` (platinum; 120 auf avgSessionDurationMin; 1 Nutzer / 1 Freischaltung): „Average session duration 2+ hours“ — Text prüfen.
- de `avg_session_dur_120` (platinum; 120 auf avgSessionDurationMin; 1 Nutzer / 1 Freischaltung): „Durchschnittliche Sitzungsdauer 2+ Stunden“ — Text prüfen.
- en `avg_session_dur_240` (diamond; 240 auf avgSessionDurationMin; 1 Nutzer / 1 Freischaltung): „Average session duration 4+ hours“ — Text prüfen.
- de `avg_session_dur_240` (diamond; 240 auf avgSessionDurationMin; 1 Nutzer / 1 Freischaltung): „Durchschnittliche Sitzungsdauer 4+ Stunden“ — Text prüfen.
- en `deep_session_7k` (gold; 7000 auf maxSessionActiveMin; 0 Nutzer / 0 Freischaltungen): „A single session with 116.7 hours of real work“ — Text prüfen.
- de `deep_session_7k` (gold; 7000 auf maxSessionActiveMin; 0 Nutzer / 0 Freischaltungen): „Eine Sitzung mit 116,7 Stunden echter Arbeit“ — Text prüfen.
- en `deep_session_9k` (platinum; 9000 auf maxSessionActiveMin; 0 Nutzer / 0 Freischaltungen): „A single session with 150.0 hours of real work“ — Text prüfen.
- de `deep_session_9k` (platinum; 9000 auf maxSessionActiveMin; 0 Nutzer / 0 Freischaltungen): „Eine Sitzung mit 150,0 Stunden echter Arbeit“ — Text prüfen.
- en `deep_session_12k` (diamond; 12000 auf maxSessionActiveMin; 0 Nutzer / 0 Freischaltungen): „A single session with 200.0 hours of real work“ — Text prüfen.
- de `deep_session_12k` (diamond; 12000 auf maxSessionActiveMin; 0 Nutzer / 0 Freischaltungen): „Eine Sitzung mit 200,0 Stunden echter Arbeit“ — Text prüfen.
- en `deep_session_15k` (diamond; 15000 auf maxSessionActiveMin; 0 Nutzer / 0 Freischaltungen): „A single session with 250.0 hours of real work“ — Text prüfen.
- de `deep_session_15k` (diamond; 15000 auf maxSessionActiveMin; 0 Nutzer / 0 Freischaltungen): „Eine Sitzung mit 250,0 Stunden echter Arbeit“ — Text prüfen.
- en `deep_session_17p5k` (diamond; 17500 auf maxSessionActiveMin; 0 Nutzer / 0 Freischaltungen): „A single session with 291.7 hours of real work“ — Text prüfen.
- de `deep_session_17p5k` (diamond; 17500 auf maxSessionActiveMin; 0 Nutzer / 0 Freischaltungen): „Eine Sitzung mit 291,7 Stunden echter Arbeit“ — Text prüfen.
- en `deep_session_25k` (diamond; 25000 auf maxSessionActiveMin; 0 Nutzer / 0 Freischaltungen): „A single session with 416.7 hours of real work“ — Text prüfen.
- de `deep_session_25k` (diamond; 25000 auf maxSessionActiveMin; 0 Nutzer / 0 Freischaltungen): „Eine Sitzung mit 416,7 Stunden echter Arbeit“ — Text prüfen.
- en `deep_day_peak_8k` (gold; 8000 auf maxDayActiveMin; 0 Nutzer / 0 Freischaltungen): „133.3 hours of real work in a single day“ — Text prüfen.
- de `deep_day_peak_8k` (gold; 8000 auf maxDayActiveMin; 0 Nutzer / 0 Freischaltungen): „133,3 Stunden echte Arbeit an einem einzigen Tag“ — Text prüfen.
- en `deep_day_peak_10k` (platinum; 10000 auf maxDayActiveMin; 0 Nutzer / 0 Freischaltungen): „166.7 hours of real work in a single day“ — Text prüfen.
- de `deep_day_peak_10k` (platinum; 10000 auf maxDayActiveMin; 0 Nutzer / 0 Freischaltungen): „166,7 Stunden echte Arbeit an einem einzigen Tag“ — Text prüfen.
- en `deep_day_peak_15k` (diamond; 15000 auf maxDayActiveMin; 0 Nutzer / 0 Freischaltungen): „250.0 hours of real work in a single day“ — Text prüfen.
- de `deep_day_peak_15k` (diamond; 15000 auf maxDayActiveMin; 0 Nutzer / 0 Freischaltungen): „250,0 Stunden echte Arbeit an einem einzigen Tag“ — Text prüfen.
- en `deep_day_peak_17p5k` (diamond; 17500 auf maxDayActiveMin; 0 Nutzer / 0 Freischaltungen): „291.7 hours of real work in a single day“ — Text prüfen.
- de `deep_day_peak_17p5k` (diamond; 17500 auf maxDayActiveMin; 0 Nutzer / 0 Freischaltungen): „291,7 Stunden echte Arbeit an einem einzigen Tag“ — Text prüfen.
- en `deep_day_peak_25k` (diamond; 25000 auf maxDayActiveMin; 0 Nutzer / 0 Freischaltungen): „416.7 hours of real work in a single day“ — Text prüfen.
- de `deep_day_peak_25k` (diamond; 25000 auf maxDayActiveMin; 0 Nutzer / 0 Freischaltungen): „416,7 Stunden echte Arbeit an einem einzigen Tag“ — Text prüfen.
- en `tok2_90b` (diamond; 90000000000 auf totalTokens; 1 Nutzer / 1 Freischaltung): „90.0B tokens in total“ — Text prüfen.
- de `tok2_90b` (diamond; 90000000000 auf totalTokens; 1 Nutzer / 1 Freischaltung): „90,0 Mrd. Tokens insgesamt“ — Text prüfen.
- en `tok2_120b` (diamond; 120000000000 auf totalTokens; 1 Nutzer / 1 Freischaltung): „120.0B tokens in total“ — Text prüfen.
- de `tok2_120b` (diamond; 120000000000 auf totalTokens; 1 Nutzer / 1 Freischaltung): „120,0 Mrd. Tokens insgesamt“ — Text prüfen.
- en `tok2_150b` (diamond; 150000000000 auf totalTokens; 0 Nutzer / 0 Freischaltungen): „150.0B tokens in total“ — Text prüfen.
- de `tok2_150b` (diamond; 150000000000 auf totalTokens; 0 Nutzer / 0 Freischaltungen): „150,0 Mrd. Tokens insgesamt“ — Text prüfen.
- en `tok2_175b` (diamond; 175000000000 auf totalTokens; 0 Nutzer / 0 Freischaltungen): „175.0B tokens in total“ — Text prüfen.
- de `tok2_175b` (diamond; 175000000000 auf totalTokens; 0 Nutzer / 0 Freischaltungen): „175,0 Mrd. Tokens insgesamt“ — Text prüfen.
- en `tok2_200b` (diamond; 200000000000 auf totalTokens; 0 Nutzer / 0 Freischaltungen): „200.0B tokens in total“ — Text prüfen.
- de `tok2_200b` (diamond; 200000000000 auf totalTokens; 0 Nutzer / 0 Freischaltungen): „200,0 Mrd. Tokens insgesamt“ — Text prüfen.
- en `tok2_250b` (diamond; 250000000000 auf totalTokens; 0 Nutzer / 0 Freischaltungen): „250.0B tokens in total“ — Text prüfen.
- de `tok2_250b` (diamond; 250000000000 auf totalTokens; 0 Nutzer / 0 Freischaltungen): „250,0 Mrd. Tokens insgesamt“ — Text prüfen.
- en `tok2_300b` (diamond; 300000000000 auf totalTokens; 0 Nutzer / 0 Freischaltungen): „300.0B tokens in total“ — Text prüfen.
- de `tok2_300b` (diamond; 300000000000 auf totalTokens; 0 Nutzer / 0 Freischaltungen): „300,0 Mrd. Tokens insgesamt“ — Text prüfen.
- en `out2_200m` (diamond; 200000000 auf totalOutputTokens; 1 Nutzer / 1 Freischaltung): „200.0M tokens generated as output“ — Text prüfen.
- de `out2_200m` (diamond; 200000000 auf totalOutputTokens; 1 Nutzer / 1 Freischaltung): „200,0 Mio. selbst erzeugte Tokens (Ausgabe)“ — Text prüfen.
- en `out2_300m` (diamond; 300000000 auf totalOutputTokens; 0 Nutzer / 0 Freischaltungen): „300.0M tokens generated as output“ — Text prüfen.
- de `out2_300m` (diamond; 300000000 auf totalOutputTokens; 0 Nutzer / 0 Freischaltungen): „300,0 Mio. selbst erzeugte Tokens (Ausgabe)“ — Text prüfen.
- en `out2_350m` (diamond; 350000000 auf totalOutputTokens; 0 Nutzer / 0 Freischaltungen): „350.0M tokens generated as output“ — Text prüfen.
- de `out2_350m` (diamond; 350000000 auf totalOutputTokens; 0 Nutzer / 0 Freischaltungen): „350,0 Mio. selbst erzeugte Tokens (Ausgabe)“ — Text prüfen.
- en `out2_400m` (diamond; 400000000 auf totalOutputTokens; 0 Nutzer / 0 Freischaltungen): „400.0M tokens generated as output“ — Text prüfen.
- de `out2_400m` (diamond; 400000000 auf totalOutputTokens; 0 Nutzer / 0 Freischaltungen): „400,0 Mio. selbst erzeugte Tokens (Ausgabe)“ — Text prüfen.
- en `out2_600m` (diamond; 600000000 auf totalOutputTokens; 0 Nutzer / 0 Freischaltungen): „600.0M tokens generated as output“ — Text prüfen.
- de `out2_600m` (diamond; 600000000 auf totalOutputTokens; 0 Nutzer / 0 Freischaltungen): „600,0 Mio. selbst erzeugte Tokens (Ausgabe)“ — Text prüfen.
- en `inp2_9m` (gold; 9000000 auf totalInputTokens; 1 Nutzer / 1 Freischaltung): „9.0M fresh input tokens (cache excluded)“ — Text prüfen.
- de `inp2_9m` (gold; 9000000 auf totalInputTokens; 1 Nutzer / 1 Freischaltung): „9,0 Mio. frische Eingabe-Tokens (ohne Cache)“ — Text prüfen.
- en `inp2_12m` (platinum; 12000000 auf totalInputTokens; 1 Nutzer / 1 Freischaltung): „12.0M fresh input tokens (cache excluded)“ — Text prüfen.
- de `inp2_12m` (platinum; 12000000 auf totalInputTokens; 1 Nutzer / 1 Freischaltung): „12,0 Mio. frische Eingabe-Tokens (ohne Cache)“ — Text prüfen.
- en `inp2_15m` (diamond; 15000000 auf totalInputTokens; 1 Nutzer / 1 Freischaltung): „15.0M fresh input tokens (cache excluded)“ — Text prüfen.
- de `inp2_15m` (diamond; 15000000 auf totalInputTokens; 1 Nutzer / 1 Freischaltung): „15,0 Mio. frische Eingabe-Tokens (ohne Cache)“ — Text prüfen.
- en `inp2_17p5m` (diamond; 17500000 auf totalInputTokens; 1 Nutzer / 1 Freischaltung): „17.5M fresh input tokens (cache excluded)“ — Text prüfen.
- de `inp2_17p5m` (diamond; 17500000 auf totalInputTokens; 1 Nutzer / 1 Freischaltung): „17,5 Mio. frische Eingabe-Tokens (ohne Cache)“ — Text prüfen.
- en `inp2_25m` (diamond; 25000000 auf totalInputTokens; 1 Nutzer / 1 Freischaltung): „25.0M fresh input tokens (cache excluded)“ — Text prüfen.
- de `inp2_25m` (diamond; 25000000 auf totalInputTokens; 1 Nutzer / 1 Freischaltung): „25,0 Mio. frische Eingabe-Tokens (ohne Cache)“ — Text prüfen.
- en `ccw2_1p75b` (diamond; 1750000000 auf totalCacheCreateTokens; 1 Nutzer / 1 Freischaltung): „1.8B tokens written to cache“ — Text prüfen.
- de `ccw2_1p75b` (diamond; 1750000000 auf totalCacheCreateTokens; 1 Nutzer / 1 Freischaltung): „1,8 Mrd. in den Cache geschriebene Tokens“ — Text prüfen.
- en `ccw2_2b` (diamond; 2000000000 auf totalCacheCreateTokens; 1 Nutzer / 1 Freischaltung): „2.0B tokens written to cache“ — Text prüfen.
- de `ccw2_2b` (diamond; 2000000000 auf totalCacheCreateTokens; 1 Nutzer / 1 Freischaltung): „2,0 Mrd. in den Cache geschriebene Tokens“ — Text prüfen.
- en `ccw2_2p5b` (diamond; 2500000000 auf totalCacheCreateTokens; 0 Nutzer / 0 Freischaltungen): „2.5B tokens written to cache“ — Text prüfen.
- de `ccw2_2p5b` (diamond; 2500000000 auf totalCacheCreateTokens; 0 Nutzer / 0 Freischaltungen): „2,5 Mrd. in den Cache geschriebene Tokens“ — Text prüfen.
- en `ccw2_3b` (diamond; 3000000000 auf totalCacheCreateTokens; 0 Nutzer / 0 Freischaltungen): „3.0B tokens written to cache“ — Text prüfen.
- de `ccw2_3b` (diamond; 3000000000 auf totalCacheCreateTokens; 0 Nutzer / 0 Freischaltungen): „3,0 Mrd. in den Cache geschriebene Tokens“ — Text prüfen.
- en `ccw2_3p5b` (diamond; 3500000000 auf totalCacheCreateTokens; 0 Nutzer / 0 Freischaltungen): „3.5B tokens written to cache“ — Text prüfen.
- de `ccw2_3p5b` (diamond; 3500000000 auf totalCacheCreateTokens; 0 Nutzer / 0 Freischaltungen): „3,5 Mrd. in den Cache geschriebene Tokens“ — Text prüfen.
- en `ccw2_4b` (diamond; 4000000000 auf totalCacheCreateTokens; 0 Nutzer / 0 Freischaltungen): „4.0B tokens written to cache“ — Text prüfen.
- de `ccw2_4b` (diamond; 4000000000 auf totalCacheCreateTokens; 0 Nutzer / 0 Freischaltungen): „4,0 Mrd. in den Cache geschriebene Tokens“ — Text prüfen.
- en `ccw2_5b` (diamond; 5000000000 auf totalCacheCreateTokens; 0 Nutzer / 0 Freischaltungen): „5.0B tokens written to cache“ — Text prüfen.
- de `ccw2_5b` (diamond; 5000000000 auf totalCacheCreateTokens; 0 Nutzer / 0 Freischaltungen): „5,0 Mrd. in den Cache geschriebene Tokens“ — Text prüfen.
- en `cache_read2_90b` (diamond; 90000000000 auf totalCacheReadTokens; 1 Nutzer / 1 Freischaltung): „90.0B tokens read from cache“ — Text prüfen.
- de `cache_read2_90b` (diamond; 90000000000 auf totalCacheReadTokens; 1 Nutzer / 1 Freischaltung): „90,0 Mrd. aus dem Cache gelesene Tokens“ — Text prüfen.
- en `cache_read2_120b` (diamond; 120000000000 auf totalCacheReadTokens; 1 Nutzer / 1 Freischaltung): „120.0B tokens read from cache“ — Text prüfen.
- de `cache_read2_120b` (diamond; 120000000000 auf totalCacheReadTokens; 1 Nutzer / 1 Freischaltung): „120,0 Mrd. aus dem Cache gelesene Tokens“ — Text prüfen.
- en `cache_read2_150b` (diamond; 150000000000 auf totalCacheReadTokens; 0 Nutzer / 0 Freischaltungen): „150.0B tokens read from cache“ — Text prüfen.
- de `cache_read2_150b` (diamond; 150000000000 auf totalCacheReadTokens; 0 Nutzer / 0 Freischaltungen): „150,0 Mrd. aus dem Cache gelesene Tokens“ — Text prüfen.
- en `cache_read2_200b` (diamond; 200000000000 auf totalCacheReadTokens; 0 Nutzer / 0 Freischaltungen): „200.0B tokens read from cache“ — Text prüfen.
- de `cache_read2_200b` (diamond; 200000000000 auf totalCacheReadTokens; 0 Nutzer / 0 Freischaltungen): „200,0 Mrd. aus dem Cache gelesene Tokens“ — Text prüfen.
- en `cache_read2_250b` (diamond; 250000000000 auf totalCacheReadTokens; 0 Nutzer / 0 Freischaltungen): „250.0B tokens read from cache“ — Text prüfen.
- de `cache_read2_250b` (diamond; 250000000000 auf totalCacheReadTokens; 0 Nutzer / 0 Freischaltungen): „250,0 Mrd. aus dem Cache gelesene Tokens“ — Text prüfen.
- en `cache_read2_300b` (diamond; 300000000000 auf totalCacheReadTokens; 0 Nutzer / 0 Freischaltungen): „300.0B tokens read from cache“ — Text prüfen.
- de `cache_read2_300b` (diamond; 300000000000 auf totalCacheReadTokens; 0 Nutzer / 0 Freischaltungen): „300,0 Mrd. aus dem Cache gelesene Tokens“ — Text prüfen.

## 6. Unerreichbar oder trivial

Erster gespeicherter Freischalttag: 2025-05-05, 50 Freischaltungen. 28 kumulative Schwellen liegen bei linearer Fortschreibung über fünf **aktiven** Jahren entfernt. Das ist ein Warnsignal; Verhältnisse, Durchschnitte, Spitzen und Streaks werden nicht linear hochgerechnet. Aus einer einzelnen Nutzerhistorie lässt sich „unerreichbar durch Konstruktion“ nur bei einem logischen Widerspruch beweisen; dafür fand die statische Prüfung keinen zusätzlichen gesicherten Fall.

### Am ersten gespeicherten Tag freigeschaltet

`tokens_1k` (bronze, 1 Nutzer / 1 Freischaltung), `tokens_10k` (bronze, 1 Nutzer / 1 Freischaltung), `tokens_100k` (silver, 1 Nutzer / 1 Freischaltung), `tokens_500k` (silver, 1 Nutzer / 1 Freischaltung), `tokens_1m` (gold, 1 Nutzer / 1 Freischaltung), `tokens_5m` (gold, 1 Nutzer / 1 Freischaltung), `tokens_10m` (platinum, 1 Nutzer / 1 Freischaltung), `sessions_1` (bronze, 1 Nutzer / 1 Freischaltung), `messages_10` (bronze, 1 Nutzer / 1 Freischaltung), `messages_50` (bronze, 1 Nutzer / 1 Freischaltung), `messages_100` (silver, 1 Nutzer / 1 Freischaltung), `cost_1` (bronze, 1 Nutzer / 1 Freischaltung), `cost_5` (bronze, 1 Nutzer / 1 Freischaltung), `cost_10` (silver, 1 Nutzer / 1 Freischaltung), `lines_edited_100` (bronze, 1 Nutzer / 1 Freischaltung), `lines_edited_1k` (silver, 1 Nutzer / 1 Freischaltung), `lines_deleted_100` (bronze, 1 Nutzer / 1 Freischaltung), `lines_deleted_1k` (silver, 1 Nutzer / 1 Freischaltung), `model_sonnet` (bronze, 1 Nutzer / 1 Freischaltung), `tool_read` (bronze, 1 Nutzer / 1 Freischaltung), `tool_edit` (bronze, 1 Nutzer / 1 Freischaltung), `tool_bash` (bronze, 1 Nutzer / 1 Freischaltung), `tool_grep` (bronze, 1 Nutzer / 1 Freischaltung), `tool_diversity_5` (silver, 1 Nutzer / 1 Freischaltung), `marathon_1` (silver, 1 Nutzer / 1 Freischaltung), `peak_50_msgs` (silver, 1 Nutzer / 1 Freischaltung), `peak_100_msgs` (gold, 1 Nutzer / 1 Freischaltung), `peak_200_msgs` (platinum, 1 Nutzer / 1 Freischaltung), `project_1` (bronze, 1 Nutzer / 1 Freischaltung), `cache_tokens_10m` (gold, 1 Nutzer / 1 Freischaltung), `session_longest_4h` (gold, 1 Nutzer / 1 Freischaltung), `session_longest_8h` (platinum, 1 Nutzer / 1 Freischaltung), `session_max_200_msgs` (platinum, 1 Nutzer / 1 Freischaltung), `cost_day_10` (gold, 1 Nutzer / 1 Freischaltung), `cost_session_10` (gold, 1 Nutzer / 1 Freischaltung), `lines_day_1k` (gold, 1 Nutzer / 1 Freischaltung), `marathon_4h` (gold, 1 Nutzer / 1 Freischaltung), `marathon_8h` (diamond, 1 Nutzer / 1 Freischaltung), `peak_tokens_1m` (platinum, 1 Nutzer / 1 Freischaltung), `peak_tokens_5m` (diamond, 1 Nutzer / 1 Freischaltung), `tokens_session_1m` (platinum, 1 Nutzer / 1 Freischaltung), `tokens_session_5m` (diamond, 1 Nutzer / 1 Freischaltung), `tokens_session_10m` (diamond, 1 Nutzer / 1 Freischaltung), `century_session` (gold, 1 Nutzer / 1 Freischaltung), `lines_session_1k` (gold, 1 Nutzer / 1 Freischaltung), `session_tokens_10m` (undefined, 1 Nutzer / 1 Freischaltung), `peak_tokens_10m` (diamond, 1 Nutzer / 1 Freischaltung), `proj_tokens_10m` (platinum, 1 Nutzer / 1 Freischaltung), `session_tokens_25m` (diamond, 1 Nutzer / 1 Freischaltung), `cache_create_1m` (gold, 1 Nutzer / 1 Freischaltung)

### Entfernte Schwellen (Auszug)

| Key / Stufe | Kennzahl: heute → Schwelle | aktive Tage bis Ziel | Betroffene | Vorschlag |
|---|---|---:|---|---|
| `input_10b` (diamond) | totalInputTokens: 55.698.534 → 10.000.000.000 | 43.921 | 0 Nutzer / 0 Freischaltungen | Schwelle/Rate prüfen; ggf. stilllegen |
| `input_5b` (diamond) | totalInputTokens: 55.698.534 → 5.000.000.000 | 21.838 | 0 Nutzer / 0 Freischaltungen | Schwelle/Rate prüfen; ggf. stilllegen |
| `tool_task_50k` (diamond) | toolCallsByName.Task: 558 → 50.000 | 21.798 | 0 Nutzer / 0 Freischaltungen | Schwelle/Rate prüfen; ggf. stilllegen |
| `tool_glob_100k` (diamond) | toolCallsByName.Glob: 1.721 → 100.000 | 14.049 | 0 Nutzer / 0 Freischaltungen | Schwelle/Rate prüfen; ggf. stilllegen |
| `tool_task_25k` (diamond) | toolCallsByName.Task: 558 → 25.000 | 10.776 | 0 Nutzer / 0 Freischaltungen | Schwelle/Rate prüfen; ggf. stilllegen |
| `input_2b` (diamond) | totalInputTokens: 55.698.534 → 2.000.000.000 | 8.588 | 0 Nutzer / 0 Freischaltungen | Schwelle/Rate prüfen; ggf. stilllegen |
| `tool_10m_calls` (diamond) | totalToolCalls: 328.260 → 10.000.000 | 7.249 | 0 Nutzer / 0 Freischaltungen | Schwelle/Rate prüfen; ggf. stilllegen |
| `tool_glob_50k` (diamond) | toolCallsByName.Glob: 1.721 → 50.000 | 6.902 | 0 Nutzer / 0 Freischaltungen | Schwelle/Rate prüfen; ggf. stilllegen |
| `messages_10m` (diamond) | totalMessages: 359.359 → 10.000.000 | 6.600 | 0 Nutzer / 0 Freischaltungen | Schwelle/Rate prüfen; ggf. stilllegen |
| `tool_grep_250k` (diamond) | toolCallsByName.Grep: 10.489 → 250.000 | 5.618 | 0 Nutzer / 0 Freischaltungen | Schwelle/Rate prüfen; ggf. stilllegen |
| `model_sonnet_500k` (diamond) | modelMessages.sonnet: 23.048 → 500.000 | 5.091 | 0 Nutzer / 0 Freischaltungen | Schwelle/Rate prüfen; ggf. stilllegen |
| `tool_write_250k` (diamond) | toolCallsByName.Write: 12.023 → 250.000 | 4.870 | 0 Nutzer / 0 Freischaltungen | Schwelle/Rate prüfen; ggf. stilllegen |
| `output_5b` (diamond) | totalOutputTokens: 260.983.004 → 5.000.000.000 | 4.467 | 0 Nutzer / 0 Freischaltungen | Schwelle/Rate prüfen; ggf. stilllegen |
| `input_1b` (diamond) | totalInputTokens: 55.698.534 → 1.000.000.000 | 4.171 | 0 Nutzer / 0 Freischaltungen | Schwelle/Rate prüfen; ggf. stilllegen |
| `tool_task_10k` (diamond) | toolCallsByName.Task: 558 → 10.000 | 4.163 | 0 Nutzer / 0 Freischaltungen | Schwelle/Rate prüfen; ggf. stilllegen |
| `sessions_100k` (diamond) | totalSessions: 5.836 → 100.000 | 3.970 | 0 Nutzer / 0 Freischaltungen | Schwelle/Rate prüfen; ggf. stilllegen |
| `tool_5m_calls` (diamond) | totalToolCalls: 328.260 → 5.000.000 | 3.502 | 0 Nutzer / 0 Freischaltungen | Schwelle/Rate prüfen; ggf. stilllegen |
| `messages_5m` (diamond) | totalMessages: 359.359 → 5.000.000 | 3.177 | 0 Nutzer / 0 Freischaltungen | Schwelle/Rate prüfen; ggf. stilllegen |
| `model_haiku_100k` (diamond) | modelMessages.haiku: 7.677 → 100.000 | 2.959 | 0 Nutzer / 0 Freischaltungen | Schwelle/Rate prüfen; ggf. stilllegen |
| `rate_limit_500` (diamond) | totalRateLimitHits: 40 → 500 | 2.829 | 0 Nutzer / 0 Freischaltungen | Schwelle/Rate prüfen; ggf. stilllegen |
| `tool_edit_500k` (diamond) | toolCallsByName.Edit: 46.337 → 500.000 | 2.409 | 0 Nutzer / 0 Freischaltungen | Schwelle/Rate prüfen; ggf. stilllegen |
| `active_days_2500` (diamond) | activeDays: 246 → 2.500 | 2.254 | 0 Nutzer / 0 Freischaltungen | Schwelle/Rate prüfen; ggf. stilllegen |
| `tool_read_500k` (diamond) | toolCallsByName.Read: 50.058 → 500.000 | 2.212 | 0 Nutzer / 0 Freischaltungen | Schwelle/Rate prüfen; ggf. stilllegen |
| `tool_grep_100k` (diamond) | toolCallsByName.Grep: 10.489 → 100.000 | 2.100 | 0 Nutzer / 0 Freischaltungen | Schwelle/Rate prüfen; ggf. stilllegen |
| `input_500m` (diamond) | totalInputTokens: 55.698.534 → 500.000.000 | 1.963 | 0 Nutzer / 0 Freischaltungen | Schwelle/Rate prüfen; ggf. stilllegen |
| `tool_task_5k` (platinum) | toolCallsByName.Task: 558 → 5.000 | 1.959 | 0 Nutzer / 0 Freischaltungen | Schwelle/Rate prüfen; ggf. stilllegen |
| `model_sonnet_200k` (diamond) | modelMessages.sonnet: 23.048 → 200.000 | 1.889 | 0 Nutzer / 0 Freischaltungen | Schwelle/Rate prüfen; ggf. stilllegen |
| `sessions_50k` (diamond) | totalSessions: 5.836 → 50.000 | 1.862 | 0 Nutzer / 0 Freischaltungen | Schwelle/Rate prüfen; ggf. stilllegen |

## 7. Falsche Zeit-Kennzahl

In dieser DB: Session-Spannen 78.076 h, gekappte aktive Zeit 2.496 h, Faktor 31.3. Die folgenden 42 Checks hängen an `durationMin`-basierten Feldern. **Entscheidung:** Welle 1 vorerst belassen, neue Zeit-Achievements nur mit `activeMin`.

| Key / Stufe | Bedingung | Betroffene | Vorschlag |
|---|---|---|---|
| `marathon_1` (silver) | mindestens 1 marathonSessions (`s.marathonSessions>=1`) | 1 Nutzer / 1 Freischaltung | Bestehenden Key belassen, im Text Session-Spanne kenntlich machen |
| `marathon_5` (gold) | mindestens 5 marathonSessions (`s.marathonSessions>=5`) | 1 Nutzer / 1 Freischaltung | Bestehenden Key belassen, im Text Session-Spanne kenntlich machen |
| `marathon_10` (platinum) | mindestens 10 marathonSessions (`s.marathonSessions>=10`) | 1 Nutzer / 1 Freischaltung | Bestehenden Key belassen, im Text Session-Spanne kenntlich machen |
| `session_longest_4h` (gold) | mindestens 240 longestSessionMin (`s.longestSessionMin>=240`) | 1 Nutzer / 1 Freischaltung | Bestehenden Key belassen, im Text Session-Spanne kenntlich machen |
| `session_longest_8h` (platinum) | mindestens 480 longestSessionMin (`s.longestSessionMin>=480`) | 1 Nutzer / 1 Freischaltung | Bestehenden Key belassen, im Text Session-Spanne kenntlich machen |
| `session_longest_12h` (diamond) | mindestens 720 longestSessionMin (`s.longestSessionMin>=720`) | 1 Nutzer / 1 Freischaltung | Bestehenden Key belassen, im Text Session-Spanne kenntlich machen |
| `marathon_25` (platinum) | mindestens 25 marathonSessions (`s.marathonSessions>=25`) | 1 Nutzer / 1 Freischaltung | Bestehenden Key belassen, im Text Session-Spanne kenntlich machen |
| `marathon_50` (diamond) | mindestens 50 marathonSessions (`s.marathonSessions>=50`) | 1 Nutzer / 1 Freischaltung | Bestehenden Key belassen, im Text Session-Spanne kenntlich machen |
| `marathon_100` (diamond) | mindestens 100 marathonSessions (`s.marathonSessions>=100`) | 1 Nutzer / 1 Freischaltung | Bestehenden Key belassen, im Text Session-Spanne kenntlich machen |
| `marathon_4h` (gold) | mindestens 1 marathonSessions_4h (`s.marathonSessions_4h>=1`) | 1 Nutzer / 1 Freischaltung | Bestehenden Key belassen, im Text Session-Spanne kenntlich machen |
| `marathon_4h_10` (platinum) | mindestens 10 marathonSessions_4h (`s.marathonSessions_4h>=10`) | 1 Nutzer / 1 Freischaltung | Bestehenden Key belassen, im Text Session-Spanne kenntlich machen |
| `marathon_8h` (diamond) | mindestens 1 marathonSessions_8h (`s.marathonSessions_8h>=1`) | 1 Nutzer / 1 Freischaltung | Bestehenden Key belassen, im Text Session-Spanne kenntlich machen |
| `session_longest_16h` (diamond) | mindestens 960 longestSessionMin (`s.longestSessionMin>=960`) | 1 Nutzer / 1 Freischaltung | Bestehenden Key belassen, im Text Session-Spanne kenntlich machen |
| `session_longest_24h` (diamond) | mindestens 1.440 longestSessionMin (`s.longestSessionMin>=1440`) | 1 Nutzer / 1 Freischaltung | Bestehenden Key belassen, im Text Session-Spanne kenntlich machen |
| `total_hours_500` (platinum) | mindestens 500 totalSessionHours (`s.totalSessionHours>=500`) | 1 Nutzer / 1 Freischaltung | Bestehenden Key belassen, im Text Session-Spanne kenntlich machen |
| `total_hours_2k` (diamond) | mindestens 2.000 totalSessionHours (`s.totalSessionHours>=2000`) | 1 Nutzer / 1 Freischaltung | Bestehenden Key belassen, im Text Session-Spanne kenntlich machen |
| `total_hours_10k` (diamond) | mindestens 10.000 totalSessionHours (`s.totalSessionHours>=10000`) | 1 Nutzer / 1 Freischaltung | Bestehenden Key belassen, im Text Session-Spanne kenntlich machen |
| `marathon_200` (diamond) | mindestens 200 marathonSessions (`s.marathonSessions>=200`) | 1 Nutzer / 1 Freischaltung | Bestehenden Key belassen, im Text Session-Spanne kenntlich machen |
| `marathon_500` (diamond) | mindestens 500 marathonSessions (`s.marathonSessions>=500`) | 0 Nutzer / 0 Freischaltungen | Bestehenden Key belassen, im Text Session-Spanne kenntlich machen |
| `marathon_8h_10` (diamond) | mindestens 10 marathonSessions_8h (`s.marathonSessions_8h>=10`) | 1 Nutzer / 1 Freischaltung | Bestehenden Key belassen, im Text Session-Spanne kenntlich machen |
| `marathon_8h_25` (diamond) | mindestens 25 marathonSessions_8h (`s.marathonSessions_8h>=25`) | 1 Nutzer / 1 Freischaltung | Bestehenden Key belassen, im Text Session-Spanne kenntlich machen |
| `marathon_8h_50` (diamond) | mindestens 50 marathonSessions_8h (`s.marathonSessions_8h>=50`) | 1 Nutzer / 1 Freischaltung | Bestehenden Key belassen, im Text Session-Spanne kenntlich machen |
| `marathon_12h_5` (diamond) | mindestens 5 marathonSessions_12h (`s.marathonSessions_12h>=5`) | 1 Nutzer / 1 Freischaltung | Bestehenden Key belassen, im Text Session-Spanne kenntlich machen |
| `marathon_12h_10` (diamond) | mindestens 10 marathonSessions_12h (`s.marathonSessions_12h>=10`) | 1 Nutzer / 1 Freischaltung | Bestehenden Key belassen, im Text Session-Spanne kenntlich machen |
| `marathon_12h_25` (diamond) | mindestens 25 marathonSessions_12h (`s.marathonSessions_12h>=25`) | 1 Nutzer / 1 Freischaltung | Bestehenden Key belassen, im Text Session-Spanne kenntlich machen |
| `marathon_16h_1` (diamond) | mindestens 1 marathonSessions_16h (`s.marathonSessions_16h>=1`) | 1 Nutzer / 1 Freischaltung | Bestehenden Key belassen, im Text Session-Spanne kenntlich machen |
| `marathon_16h_5` (diamond) | mindestens 5 marathonSessions_16h (`s.marathonSessions_16h>=5`) | 1 Nutzer / 1 Freischaltung | Bestehenden Key belassen, im Text Session-Spanne kenntlich machen |
| `marathon_lord` (diamond) | s.marathonSessions>=100&&s.totalMessages>=10000 (`s.marathonSessions>=100&&s.totalMessages>=10000`) | 1 Nutzer / 1 Freischaltung | Bestehenden Key belassen, im Text Session-Spanne kenntlich machen |
| `night_lord` (diamond) | s.nightOwlSessions>=500&&s.marathonSessions>=100 (`s.nightOwlSessions>=500&&s.marathonSessions>=100`) | 1 Nutzer / 1 Freischaltung | Bestehenden Key belassen, im Text Session-Spanne kenntlich machen |
| `avg_session_dur_30` (silver) | mindestens 30 avgSessionDurationMin (`s.avgSessionDurationMin>=30`) | 1 Nutzer / 1 Freischaltung | Bestehenden Key belassen, im Text Session-Spanne kenntlich machen |
| `avg_session_dur_60` (gold) | mindestens 60 avgSessionDurationMin (`s.avgSessionDurationMin>=60`) | 1 Nutzer / 1 Freischaltung | Bestehenden Key belassen, im Text Session-Spanne kenntlich machen |
| `avg_session_dur_120` (platinum) | mindestens 120 avgSessionDurationMin (`s.avgSessionDurationMin>=120`) | 1 Nutzer / 1 Freischaltung | Bestehenden Key belassen, im Text Session-Spanne kenntlich machen |
| `avg_session_dur_240` (diamond) | mindestens 240 avgSessionDurationMin (`s.avgSessionDurationMin>=240`) | 1 Nutzer / 1 Freischaltung | Bestehenden Key belassen, im Text Session-Spanne kenntlich machen |
| `short_sessions_10` (bronze) | mindestens 10 shortSessions (`s.shortSessions>=10`) | 1 Nutzer / 1 Freischaltung | Bestehenden Key belassen, im Text Session-Spanne kenntlich machen |
| `short_sessions_50` (silver) | mindestens 50 shortSessions (`s.shortSessions>=50`) | 1 Nutzer / 1 Freischaltung | Bestehenden Key belassen, im Text Session-Spanne kenntlich machen |
| `short_sessions_100` (gold) | mindestens 100 shortSessions (`s.shortSessions>=100`) | 1 Nutzer / 1 Freischaltung | Bestehenden Key belassen, im Text Session-Spanne kenntlich machen |
| `short_sessions_500` (platinum) | mindestens 500 shortSessions (`s.shortSessions>=500`) | 1 Nutzer / 1 Freischaltung | Bestehenden Key belassen, im Text Session-Spanne kenntlich machen |
| `total_hours_1k` (diamond) | mindestens 1.000 totalSessionHours (`s.totalSessionHours>=1000`) | 1 Nutzer / 1 Freischaltung | Bestehenden Key belassen, im Text Session-Spanne kenntlich machen |
| `total_hours_5k` (diamond) | mindestens 5.000 totalSessionHours (`s.totalSessionHours>=5000`) | 1 Nutzer / 1 Freischaltung | Bestehenden Key belassen, im Text Session-Spanne kenntlich machen |
| `cache_and_marathon_50` (diamond) | s.avgCacheRate>=80&&s.marathonSessions>=50 (`s.avgCacheRate>=80&&s.marathonSessions>=50`) | 1 Nutzer / 1 Freischaltung | Bestehenden Key belassen, im Text Session-Spanne kenntlich machen |
| `token_marathon` (diamond) | s.maxDayTokens>=50000000&&s.marathonSessions>=10 (`s.maxDayTokens>=50000000&&s.marathonSessions>=10`) | 1 Nutzer / 1 Freischaltung | Bestehenden Key belassen, im Text Session-Spanne kenntlich machen |
| `speed_demon` (platinum) | s.avgMessagesPerDay>=500&&s.shortSessions>=50 (`s.avgMessagesPerDay>=500&&s.shortSessions>=50`) | 1 Nutzer / 1 Freischaltung | Bestehenden Key belassen, im Text Session-Spanne kenntlich machen |

## 8. Kategorie und Emoji

45 Einträge weichen von der Mehrheitskategorie derselben einfachen Kennzahl ab; 146 Kennzahl/Emoji-Gruppen verwenden dasselbe Emoji auf mehreren Schwellen. Beides sind Prüfkandidaten, keine automatischen Fehler.

### Kategorie-Ausreißer

| Key / Stufe | Kennzahl / Kategorie | Betroffene | Vorschlag |
|---|---|---|---|
| `msg_day2_6k` (diamond) | peakDayMessages: messages statt Mehrheit time | 1 Nutzer / 1 Freischaltung | Kategorie semantisch prüfen |
| `msg_day2_8k` (diamond) | peakDayMessages: messages statt Mehrheit time | 1 Nutzer / 1 Freischaltung | Kategorie semantisch prüfen |
| `msg_day2_9k` (diamond) | peakDayMessages: messages statt Mehrheit time | 1 Nutzer / 1 Freischaltung | Kategorie semantisch prüfen |
| `msg_day2_12k` (diamond) | peakDayMessages: messages statt Mehrheit time | 0 Nutzer / 0 Freischaltungen | Kategorie semantisch prüfen |
| `msg_day2_15k` (diamond) | peakDayMessages: messages statt Mehrheit time | 0 Nutzer / 0 Freischaltungen | Kategorie semantisch prüfen |
| `msg_day2_17p5k` (diamond) | peakDayMessages: messages statt Mehrheit time | 0 Nutzer / 0 Freischaltungen | Kategorie semantisch prüfen |
| `cache_tokens_10m` (gold) | totalCacheReadTokens: tokens statt Mehrheit cache | 1 Nutzer / 1 Freischaltung | Kategorie semantisch prüfen |
| `cache_tokens_100m` (diamond) | totalCacheReadTokens: tokens statt Mehrheit cache | 1 Nutzer / 1 Freischaltung | Kategorie semantisch prüfen |
| `cache_read_1b` (diamond) | totalCacheReadTokens: tokens statt Mehrheit cache | 1 Nutzer / 1 Freischaltung | Kategorie semantisch prüfen |
| `cache_read_2b` (diamond) | totalCacheReadTokens: tokens statt Mehrheit cache | 1 Nutzer / 1 Freischaltung | Kategorie semantisch prüfen |
| `cache_read_5b` (diamond) | totalCacheReadTokens: tokens statt Mehrheit cache | 1 Nutzer / 1 Freischaltung | Kategorie semantisch prüfen |
| `century_session` (gold) | maxMessagesInSession: special statt Mehrheit messages | 1 Nutzer / 1 Freischaltung | Kategorie semantisch prüfen |
| `session_max_200_msgs` (platinum) | maxMessagesInSession: sessions statt Mehrheit messages | 1 Nutzer / 1 Freischaltung | Kategorie semantisch prüfen |
| `session_max_500_msgs` (diamond) | maxMessagesInSession: sessions statt Mehrheit messages | 1 Nutzer / 1 Freischaltung | Kategorie semantisch prüfen |
| `session_max_1k_msgs` (diamond) | maxMessagesInSession: sessions statt Mehrheit messages | 1 Nutzer / 1 Freischaltung | Kategorie semantisch prüfen |
| `session_max_2k_msgs` (diamond) | maxMessagesInSession: sessions statt Mehrheit messages | 1 Nutzer / 1 Freischaltung | Kategorie semantisch prüfen |
| `big_session_cost_25` (platinum) | maxCostInSession: special statt Mehrheit cost | 1 Nutzer / 1 Freischaltung | Kategorie semantisch prüfen |
| `session_cost_100` (diamond) | maxCostInSession: sessions statt Mehrheit cost | 1 Nutzer / 1 Freischaltung | Kategorie semantisch prüfen |
| `session_cost_250` (diamond) | maxCostInSession: sessions statt Mehrheit cost | 1 Nutzer / 1 Freischaltung | Kategorie semantisch prüfen |
| `session_cost_500` (diamond) | maxCostInSession: sessions statt Mehrheit cost | 1 Nutzer / 1 Freischaltung | Kategorie semantisch prüfen |
| `fweek2_30` (diamond) | fullWeekendCount: streaks statt Mehrheit special | 1 Nutzer / 1 Freischaltung | Kategorie semantisch prüfen |
| `fweek2_40` (diamond) | fullWeekendCount: streaks statt Mehrheit special | 0 Nutzer / 0 Freischaltungen | Kategorie semantisch prüfen |
| `fweek2_45` (diamond) | fullWeekendCount: streaks statt Mehrheit special | 0 Nutzer / 0 Freischaltungen | Kategorie semantisch prüfen |
| `fweek2_60` (diamond) | fullWeekendCount: streaks statt Mehrheit special | 0 Nutzer / 0 Freischaltungen | Kategorie semantisch prüfen |
| `fweek2_70` (diamond) | fullWeekendCount: streaks statt Mehrheit special | 0 Nutzer / 0 Freischaltungen | Kategorie semantisch prüfen |
| `fweek2_90` (diamond) | fullWeekendCount: streaks statt Mehrheit special | 0 Nutzer / 0 Freischaltungen | Kategorie semantisch prüfen |
| `session_tokens_25m` (diamond) | maxTokensInSession: sessions statt Mehrheit special | 1 Nutzer / 1 Freischaltung | Kategorie semantisch prüfen |
| `session_tokens_50m` (diamond) | maxTokensInSession: sessions statt Mehrheit special | 1 Nutzer / 1 Freischaltung | Kategorie semantisch prüfen |
| `multi_proj_day_3` (gold) | maxProjectsInDay: special statt Mehrheit projects | 1 Nutzer / 1 Freischaltung | Kategorie semantisch prüfen |
| `multi_proj_day_5` (platinum) | maxProjectsInDay: special statt Mehrheit projects | 1 Nutzer / 1 Freischaltung | Kategorie semantisch prüfen |
| `multi_proj_day_10` (diamond) | maxProjectsInDay: special statt Mehrheit projects | 1 Nutzer / 1 Freischaltung | Kategorie semantisch prüfen |
| `multi_proj_day_20` (diamond) | maxProjectsInDay: special statt Mehrheit projects | 1 Nutzer / 1 Freischaltung | Kategorie semantisch prüfen |
| `output_ratio_60` (gold) | outputRatio: special statt Mehrheit tokens | 0 Nutzer / 0 Freischaltungen | Kategorie semantisch prüfen |
| `lines_session_1k` (gold) | maxLinesInSession: special statt Mehrheit lines | 1 Nutzer / 1 Freischaltung | Kategorie semantisch prüfen |
| `lines_session_5k` (platinum) | maxLinesInSession: special statt Mehrheit lines | 1 Nutzer / 1 Freischaltung | Kategorie semantisch prüfen |
| `total_hours_1k` (diamond) | totalSessionHours: time statt Mehrheit sessions | 1 Nutzer / 1 Freischaltung | Kategorie semantisch prüfen |
| `total_hours_5k` (diamond) | totalSessionHours: time statt Mehrheit sessions | 1 Nutzer / 1 Freischaltung | Kategorie semantisch prüfen |
| `max_sessions_day_10` (gold) | maxSessionsInDay: time statt Mehrheit sessions | 1 Nutzer / 1 Freischaltung | Kategorie semantisch prüfen |
| `max_sessions_day_25` (platinum) | maxSessionsInDay: time statt Mehrheit sessions | 1 Nutzer / 1 Freischaltung | Kategorie semantisch prüfen |
| `max_sessions_day_50` (diamond) | maxSessionsInDay: time statt Mehrheit sessions | 1 Nutzer / 1 Freischaltung | Kategorie semantisch prüfen |
| `consec_months_active_36` (diamond) | consecutiveMonthsActive: streaks statt Mehrheit time | 0 Nutzer / 0 Freischaltungen | Kategorie semantisch prüfen |
| `consec_months_active_48` (diamond) | consecutiveMonthsActive: streaks statt Mehrheit time | 0 Nutzer / 0 Freischaltungen | Kategorie semantisch prüfen |
| `sessions_500_msgs_5` (diamond) | sessionsAbove500Msgs: special statt Mehrheit sessions | 1 Nutzer / 1 Freischaltung | Kategorie semantisch prüfen |
| `cache_create_1b` (diamond) | totalCacheCreateTokens: cache statt Mehrheit tokens | 1 Nutzer / 1 Freischaltung | Kategorie semantisch prüfen |
| `weekend_streak_5` (gold) | weekendStreakMax: time statt Mehrheit streaks | 1 Nutzer / 1 Freischaltung | Kategorie semantisch prüfen |

### Gleiche Emoji innerhalb einer Leiter

| Kennzahl | Emoji / Keys | Betroffene | Vorschlag |
|---|---|---|---|
| totalTokens | 🌋 `tokens_50m` (platinum), `tok2_175b` (diamond) | tokens_50m: 1 Nutzer / 1 Freischaltung; tok2_175b: 0 Nutzer / 0 Freischaltungen | Motivfolge prüfen |
| totalTokens | 🌌 `tokens_1b` (diamond), `tokens_2b` (diamond), `lm_tokens_100b` (diamond) | tokens_1b: 1 Nutzer / 1 Freischaltung; tokens_2b: 1 Nutzer / 1 Freischaltung; lm_tokens_100b: 1 Nutzer / 1 Freischaltung | Motivfolge prüfen |
| totalTokens | 🪐 `tokens_25b` (diamond), `tok2_250b` (diamond) | tokens_25b: 1 Nutzer / 1 Freischaltung; tok2_250b: 0 Nutzer / 0 Freischaltungen | Motivfolge prüfen |
| totalTokens | 🌠 `tok2_300b` (diamond), `lm_tokens_1t` (diamond) | tok2_300b: 0 Nutzer / 0 Freischaltungen; lm_tokens_1t: 0 Nutzer / 0 Freischaltungen | Motivfolge prüfen |
| totalSessions | 🏅 `sessions_500` (diamond), `sessions_750` (diamond), `sessions_15k` (diamond) | sessions_500: 1 Nutzer / 1 Freischaltung; sessions_750: 1 Nutzer / 1 Freischaltung; sessions_15k: 0 Nutzer / 0 Freischaltungen | Motivfolge prüfen |
| totalSessions | 👑 `sessions_1k` (diamond), `sessions_20k` (diamond) | sessions_1k: 1 Nutzer / 1 Freischaltung; sessions_20k: 0 Nutzer / 0 Freischaltungen | Motivfolge prüfen |
| totalSessions | 🔱 `sessions_2k` (diamond), `sessions_50k` (diamond) | sessions_2k: 1 Nutzer / 1 Freischaltung; sessions_50k: 0 Nutzer / 0 Freischaltungen | Motivfolge prüfen |
| totalSessions | 🌠 `sessions_5k` (diamond), `sessions_100k` (diamond) | sessions_5k: 1 Nutzer / 1 Freischaltung; sessions_100k: 0 Nutzer / 0 Freischaltungen | Motivfolge prüfen |
| totalMessages | 💬 `messages_10` (bronze), `messages_2m` (diamond) | messages_10: 1 Nutzer / 1 Freischaltung; messages_2m: 0 Nutzer / 0 Freischaltungen | Motivfolge prüfen |
| totalMessages | 🗨️ `messages_50` (bronze), `messages_5m` (diamond) | messages_50: 1 Nutzer / 1 Freischaltung; messages_5m: 0 Nutzer / 0 Freischaltungen | Motivfolge prüfen |
| totalMessages | 📨 `messages_100` (silver), `messages_20k` (platinum), `messages_10m` (diamond) | messages_100: 1 Nutzer / 1 Freischaltung; messages_20k: 1 Nutzer / 1 Freischaltung; messages_10m: 0 Nutzer / 0 Freischaltungen | Motivfolge prüfen |
| totalMessages | 📫 `messages_500` (silver), `messages_30k` (platinum) | messages_500: 1 Nutzer / 1 Freischaltung; messages_30k: 1 Nutzer / 1 Freischaltung | Motivfolge prüfen |
| totalMessages | 📬 `messages_1k` (gold), `messages_100k` (diamond) | messages_1k: 1 Nutzer / 1 Freischaltung; messages_100k: 1 Nutzer / 1 Freischaltung | Motivfolge prüfen |
| totalMessages | 📮 `messages_5k` (gold), `messages_250k` (diamond) | messages_5k: 1 Nutzer / 1 Freischaltung; messages_250k: 1 Nutzer / 1 Freischaltung | Motivfolge prüfen |
| totalCost | 💵 `cost_1` (bronze), `cost_1500` (diamond), `cost_15k` (diamond), `cost2_80k` (diamond) | cost_1: 1 Nutzer / 1 Freischaltung; cost_1500: 1 Nutzer / 1 Freischaltung; cost_15k: 1 Nutzer / 1 Freischaltung; cost2_80k: 1 Nutzer / 1 Freischaltung | Motivfolge prüfen |
| totalCost | 💶 `cost_5` (bronze), `cost_2000` (diamond), `cost_25k` (diamond) | cost_5: 1 Nutzer / 1 Freischaltung; cost_2000: 1 Nutzer / 1 Freischaltung; cost_25k: 1 Nutzer / 1 Freischaltung | Motivfolge prüfen |
| totalCost | 💷 `cost_10` (silver), `cost_3000` (diamond), `cost_50k` (diamond) | cost_10: 1 Nutzer / 1 Freischaltung; cost_3000: 1 Nutzer / 1 Freischaltung; cost_50k: 1 Nutzer / 1 Freischaltung | Motivfolge prüfen |
| totalCost | 💴 `cost_25` (silver), `cost_7500` (diamond), `cost_100k` (diamond) | cost_25: 1 Nutzer / 1 Freischaltung; cost_7500: 1 Nutzer / 1 Freischaltung; cost_100k: 0 Nutzer / 0 Freischaltungen | Motivfolge prüfen |
| totalCost | 💰 `cost_50` (gold), `cost_750` (diamond), `cost2_90k` (diamond) | cost_50: 1 Nutzer / 1 Freischaltung; cost_750: 1 Nutzer / 1 Freischaltung; cost2_90k: 0 Nutzer / 0 Freischaltungen | Motivfolge prüfen |
| totalCost | 🤑 `cost_100` (gold), `cost_2500` (diamond) | cost_100: 1 Nutzer / 1 Freischaltung; cost_2500: 1 Nutzer / 1 Freischaltung | Motivfolge prüfen |
| totalCost | 💎 `cost_250` (platinum), `cost2_150k` (diamond), `lm_cost_250k` (diamond) | cost_250: 1 Nutzer / 1 Freischaltung; cost2_150k: 0 Nutzer / 0 Freischaltungen; lm_cost_250k: 0 Nutzer / 0 Freischaltungen | Motivfolge prüfen |
| totalCost | 🏦 `cost_500` (diamond), `cost_5000` (diamond), `cost2_120k` (diamond) | cost_500: 1 Nutzer / 1 Freischaltung; cost_5000: 1 Nutzer / 1 Freischaltung; cost2_120k: 0 Nutzer / 0 Freischaltungen | Motivfolge prüfen |
| totalCost | 🏛️ `cost_10000` (diamond), `cost2_200k` (diamond) | cost_10000: 1 Nutzer / 1 Freischaltung; cost2_200k: 0 Nutzer / 0 Freischaltungen | Motivfolge prüfen |
| totalCost | 👑 `cost2_175k` (diamond), `lm_cost_500k` (diamond) | cost2_175k: 0 Nutzer / 0 Freischaltungen; lm_cost_500k: 0 Nutzer / 0 Freischaltungen | Motivfolge prüfen |
| totalLinesWritten | 📚 `lines_written_50k` (platinum), `lines_written_1m` (diamond) | lines_written_50k: 1 Nutzer / 1 Freischaltung; lines_written_1m: 1 Nutzer / 1 Freischaltung | Motivfolge prüfen |
| totalLinesWritten | 📜 `lines_written_100k` (platinum), `lines_written_2m` (diamond) | lines_written_100k: 1 Nutzer / 1 Freischaltung; lines_written_2m: 0 Nutzer / 0 Freischaltungen | Motivfolge prüfen |
| totalLinesWritten | 📋 `lines_written_250k` (diamond), `lines_written_750k` (diamond), `lines_written_5m` (diamond) | lines_written_250k: 1 Nutzer / 1 Freischaltung; lines_written_750k: 1 Nutzer / 1 Freischaltung; lines_written_5m: 0 Nutzer / 0 Freischaltungen | Motivfolge prüfen |
| totalLinesWritten | 🗞️ `lines_written_500k` (diamond), `lines_written_10m` (diamond) | lines_written_500k: 1 Nutzer / 1 Freischaltung; lines_written_10m: 0 Nutzer / 0 Freischaltungen | Motivfolge prüfen |
| totalLinesAdded | 🔧 `lines_edited_1k` (silver), `lines_edited_200k` (diamond), `lines_edited_1m` (diamond) | lines_edited_1k: 1 Nutzer / 1 Freischaltung; lines_edited_200k: 1 Nutzer / 1 Freischaltung; lines_edited_1m: 0 Nutzer / 0 Freischaltungen | Motivfolge prüfen |
| totalLinesAdded | ⚙️ `lines_edited_10k` (gold), `la2_1p5m` (diamond) | lines_edited_10k: 1 Nutzer / 1 Freischaltung; la2_1p5m: 0 Nutzer / 0 Freischaltungen | Motivfolge prüfen |
| totalLinesAdded | ✏️ `lines_edited_50k` (platinum), `lines_edited_250k` (diamond) | lines_edited_50k: 1 Nutzer / 1 Freischaltung; lines_edited_250k: 1 Nutzer / 1 Freischaltung | Motivfolge prüfen |
| totalLinesAdded | 🖊️ `lines_edited_100k` (diamond), `lines_edited_500k` (diamond) | lines_edited_100k: 1 Nutzer / 1 Freischaltung; lines_edited_500k: 1 Nutzer / 1 Freischaltung | Motivfolge prüfen |
| totalLinesRemoved | 🗑️ `lines_deleted_100` (bronze), `lines_deleted_50k` (platinum), `lines_deleted_250k` (diamond) | lines_deleted_100: 1 Nutzer / 1 Freischaltung; lines_deleted_50k: 1 Nutzer / 1 Freischaltung; lines_deleted_250k: 1 Nutzer / 1 Freischaltung | Motivfolge prüfen |
| totalLinesRemoved | 💥 `lines_deleted_1k` (silver), `lines_deleted_500k` (diamond) | lines_deleted_1k: 1 Nutzer / 1 Freischaltung; lines_deleted_500k: 0 Nutzer / 0 Freischaltungen | Motivfolge prüfen |
| totalLinesRemoved | 🧹 `lines_deleted_10k` (gold), `ld2_450k` (diamond), `lines_deleted_1m` (diamond) | lines_deleted_10k: 1 Nutzer / 1 Freischaltung; ld2_450k: 0 Nutzer / 0 Freischaltungen; lines_deleted_1m: 0 Nutzer / 0 Freischaltungen | Motivfolge prüfen |
| netLines | 📈 `lines_net_1k` (silver), `lines_net_50k` (platinum), `lines_net_500k` (diamond) | lines_net_1k: 1 Nutzer / 1 Freischaltung; lines_net_50k: 1 Nutzer / 1 Freischaltung; lines_net_500k: 1 Nutzer / 1 Freischaltung | Motivfolge prüfen |
| netLines | 🚀 `lines_net_10k` (gold), `lines_net_1m` (diamond) | lines_net_10k: 1 Nutzer / 1 Freischaltung; lines_net_1m: 1 Nutzer / 1 Freischaltung | Motivfolge prüfen |
| netLines | 🌆 `lines_net_250k` (diamond), `lines_net_5m` (diamond) | lines_net_250k: 1 Nutzer / 1 Freischaltung; lines_net_5m: 0 Nutzer / 0 Freischaltungen | Motivfolge prüfen |
| modelCount | 🎨 `model_diversity_2` (silver), `model_diversity_5` (diamond), `model_diversity_6` (diamond), `model_diversity_7` (diamond) | model_diversity_2: 1 Nutzer / 1 Freischaltung; model_diversity_5: 1 Nutzer / 1 Freischaltung; model_diversity_6: 1 Nutzer / 1 Freischaltung; model_diversity_7: 1 Nutzer / 1 Freischaltung | Motivfolge prüfen |
| modelCount | 🌈 `model_diversity_3` (gold), `model_diversity_8` (diamond) | model_diversity_3: 1 Nutzer / 1 Freischaltung; model_diversity_8: 1 Nutzer / 1 Freischaltung | Motivfolge prüfen |
| modelCount | 🪄 `model_diversity_4` (platinum), `model_diversity_10` (diamond) | model_diversity_4: 1 Nutzer / 1 Freischaltung; model_diversity_10: 1 Nutzer / 1 Freischaltung | Motivfolge prüfen |
| modelMessages.sonnet | 🎶 `model_sonnet_1k` (silver), `model_sonnet_10k` (platinum), `model_sonnet_50k` (diamond) | model_sonnet_1k: 1 Nutzer / 1 Freischaltung; model_sonnet_10k: 1 Nutzer / 1 Freischaltung; model_sonnet_50k: 0 Nutzer / 0 Freischaltungen | Motivfolge prüfen |
| modelMessages.sonnet | 🎵 `model_sonnet_5k` (gold), `model_sonnet_25k` (diamond), `model_sonnet_200k` (diamond) | model_sonnet_5k: 1 Nutzer / 1 Freischaltung; model_sonnet_25k: 0 Nutzer / 0 Freischaltungen; model_sonnet_200k: 0 Nutzer / 0 Freischaltungen | Motivfolge prüfen |
| modelMessages.sonnet | 🎼 `model_sonnet_100k` (diamond), `model_sonnet_500k` (diamond) | model_sonnet_100k: 0 Nutzer / 0 Freischaltungen; model_sonnet_500k: 0 Nutzer / 0 Freischaltungen | Motivfolge prüfen |
| modelMessages.opus | 🎻 `model_opus_100` (silver), `model_opus_10k` (diamond), `model_opus_50k` (diamond) | model_opus_100: 1 Nutzer / 1 Freischaltung; model_opus_10k: 1 Nutzer / 1 Freischaltung; model_opus_50k: 1 Nutzer / 1 Freischaltung | Motivfolge prüfen |
| modelMessages.opus | 🎭 `model_opus_5k` (platinum), `model_opus_25k` (diamond), `model_opus_200k` (diamond) | model_opus_5k: 1 Nutzer / 1 Freischaltung; model_opus_25k: 1 Nutzer / 1 Freischaltung; model_opus_200k: 1 Nutzer / 1 Freischaltung | Motivfolge prüfen |
| modelMessages.opus | 🎺 `model_opus_100k` (diamond), `model_opus_500k` (diamond) | model_opus_100k: 1 Nutzer / 1 Freischaltung; model_opus_500k: 0 Nutzer / 0 Freischaltungen | Motivfolge prüfen |
| modelMessages.haiku | 🍃 `model_haiku_100` (silver), `model_haiku_50k` (diamond) | model_haiku_100: 1 Nutzer / 1 Freischaltung; model_haiku_50k: 0 Nutzer / 0 Freischaltungen | Motivfolge prüfen |
| modelMessages.haiku | 🌸 `model_haiku_1k` (gold), `model_haiku_10k` (platinum), `model_haiku_100k` (diamond) | model_haiku_1k: 1 Nutzer / 1 Freischaltung; model_haiku_10k: 0 Nutzer / 0 Freischaltungen; model_haiku_100k: 0 Nutzer / 0 Freischaltungen | Motivfolge prüfen |
| modelMessages.haiku | 🌺 `model_haiku_5k` (platinum), `model_haiku_25k` (diamond) | model_haiku_5k: 1 Nutzer / 1 Freischaltung; model_haiku_25k: 0 Nutzer / 0 Freischaltungen | Motivfolge prüfen |
| toolCount | 🧰 `tool_diversity_10` (gold), `tool_diversity_20` (diamond), `tool_diversity_25` (diamond), `tool_diversity_35` (diamond) | tool_diversity_10: 1 Nutzer / 1 Freischaltung; tool_diversity_20: 1 Nutzer / 1 Freischaltung; tool_diversity_25: 1 Nutzer / 1 Freischaltung; tool_diversity_35: 1 Nutzer / 1 Freischaltung | Motivfolge prüfen |
| toolCount | 🛠️ `tool_diversity_15` (platinum), `tool_diversity_30` (diamond), `tool_diversity_40` (diamond) | tool_diversity_15: 1 Nutzer / 1 Freischaltung; tool_diversity_30: 1 Nutzer / 1 Freischaltung; tool_diversity_40: 1 Nutzer / 1 Freischaltung | Motivfolge prüfen |
| totalToolCalls | ⚡ `tool_1k_calls` (silver), `tool_1m_calls` (diamond), `tool_10m_calls` (diamond) | tool_1k_calls: 1 Nutzer / 1 Freischaltung; tool_1m_calls: 0 Nutzer / 0 Freischaltungen; tool_10m_calls: 0 Nutzer / 0 Freischaltungen | Motivfolge prüfen |
| totalToolCalls | 🔌 `tool_10k_calls` (gold), `tool_2m_calls` (diamond) | tool_10k_calls: 1 Nutzer / 1 Freischaltung; tool_2m_calls: 0 Nutzer / 0 Freischaltungen | Motivfolge prüfen |
| totalToolCalls | ⚙️ `tool_50k_calls` (platinum), `tool_100k_calls` (diamond), `tool_5m_calls` (diamond) | tool_50k_calls: 1 Nutzer / 1 Freischaltung; tool_100k_calls: 1 Nutzer / 1 Freischaltung; tool_5m_calls: 0 Nutzer / 0 Freischaltungen | Motivfolge prüfen |
| earlyBirdSessions | 🌅 `early_bird_10` (silver), `early_bird_50` (gold), `early_bird_1000` (diamond) | early_bird_10: 1 Nutzer / 1 Freischaltung; early_bird_50: 1 Nutzer / 1 Freischaltung; early_bird_1000: 1 Nutzer / 1 Freischaltung | Motivfolge prüfen |
| nightOwlSessions | 🌙 `night_owl_10` (silver), `night_owl_50` (gold), `night_owl_1000` (diamond) | night_owl_10: 1 Nutzer / 1 Freischaltung; night_owl_50: 1 Nutzer / 1 Freischaltung; night_owl_1000: 1 Nutzer / 1 Freischaltung | Motivfolge prüfen |
| marathonSessions | 🏃 `marathon_1` (silver), `marathon_25` (platinum), `marathon_200` (diamond) | marathon_1: 1 Nutzer / 1 Freischaltung; marathon_25: 1 Nutzer / 1 Freischaltung; marathon_200: 1 Nutzer / 1 Freischaltung | Motivfolge prüfen |
| marathonSessions | 🏋️ `marathon_50` (diamond), `marathon_500` (diamond) | marathon_50: 1 Nutzer / 1 Freischaltung; marathon_500: 0 Nutzer / 0 Freischaltungen | Motivfolge prüfen |
| peakDayMessages | 📊 `peak_50_msgs` (silver), `peak_300_msgs` (platinum), `peak_2000_msgs` (diamond), `msg_day2_8k` (diamond) | peak_50_msgs: 1 Nutzer / 1 Freischaltung; peak_300_msgs: 1 Nutzer / 1 Freischaltung; peak_2000_msgs: 1 Nutzer / 1 Freischaltung; msg_day2_8k: 1 Nutzer / 1 Freischaltung | Motivfolge prüfen |
| peakDayMessages | 🌡️ `peak_200_msgs` (platinum), `msg_day2_15k` (diamond) | peak_200_msgs: 1 Nutzer / 1 Freischaltung; msg_day2_15k: 0 Nutzer / 0 Freischaltungen | Motivfolge prüfen |
| peakDayMessages | 💥 `peak_500_msgs` (diamond), `peak_5000_msgs` (diamond) | peak_500_msgs: 1 Nutzer / 1 Freischaltung; peak_5000_msgs: 1 Nutzer / 1 Freischaltung | Motivfolge prüfen |
| projectCount | 🏘️ `project_25` (diamond), `project_35` (diamond), `project_150` (diamond) | project_25: 1 Nutzer / 1 Freischaltung; project_35: 1 Nutzer / 1 Freischaltung; project_150: 1 Nutzer / 1 Freischaltung | Motivfolge prüfen |
| projectCount | 🌇 `project_50` (diamond), `project_200` (diamond) | project_50: 1 Nutzer / 1 Freischaltung; project_200: 1 Nutzer / 1 Freischaltung | Motivfolge prüfen |
| projectCount | 🌃 `project_75` (diamond), `project_300` (diamond) | project_75: 1 Nutzer / 1 Freischaltung; project_300: 0 Nutzer / 0 Freischaltungen | Motivfolge prüfen |
| projectCount | 🌍 `project_100` (diamond), `project_500` (diamond) | project_100: 1 Nutzer / 1 Freischaltung; project_500: 0 Nutzer / 0 Freischaltungen | Motivfolge prüfen |
| longestStreak | 🔥 `streak_3` (bronze), `streak_21` (gold), `streak_90` (diamond), `streak_500` (diamond) | streak_3: 1 Nutzer / 1 Freischaltung; streak_21: 1 Nutzer / 1 Freischaltung; streak_90: 0 Nutzer / 0 Freischaltungen; streak_500: 0 Nutzer / 0 Freischaltungen | Motivfolge prüfen |
| longestStreak | 🌟 `streak_45` (platinum), `streak_120` (diamond), `strk2_150` (diamond), `streak_730` (diamond) | streak_45: 1 Nutzer / 1 Freischaltung; streak_120: 0 Nutzer / 0 Freischaltungen; strk2_150: 0 Nutzer / 0 Freischaltungen; streak_730: 0 Nutzer / 0 Freischaltungen | Motivfolge prüfen |
| longestStreak | 💫 `streak_180` (diamond), `streak_250` (diamond), `streak_1000` (diamond) | streak_180: 0 Nutzer / 0 Freischaltungen; streak_250: 0 Nutzer / 0 Freischaltungen; streak_1000: 0 Nutzer / 0 Freischaltungen | Motivfolge prüfen |
| longestStreak | ⭐ `streak_365` (diamond), `streak_1500` (diamond) | streak_365: 0 Nutzer / 0 Freischaltungen; streak_1500: 0 Nutzer / 0 Freischaltungen | Motivfolge prüfen |
| activeDays | 📅 `active_days_7` (bronze), `active_days_50` (gold), `active_days_500` (diamond), `active_days_2000` (diamond) | active_days_7: 1 Nutzer / 1 Freischaltung; active_days_50: 1 Nutzer / 1 Freischaltung; active_days_500: 0 Nutzer / 0 Freischaltungen; active_days_2000: 0 Nutzer / 0 Freischaltungen | Motivfolge prüfen |
| activeDays | 🗓️ `active_days_30` (silver), `active_days_365` (diamond), `active_days_2500` (diamond) | active_days_30: 1 Nutzer / 1 Freischaltung; active_days_365: 0 Nutzer / 0 Freischaltungen; active_days_2500: 0 Nutzer / 0 Freischaltungen | Motivfolge prüfen |
| activeDays | 📆 `active_days_75` (gold), `active_days_200` (platinum), `active_days_1500` (diamond) | active_days_75: 1 Nutzer / 1 Freischaltung; active_days_200: 1 Nutzer / 1 Freischaltung; active_days_1500: 0 Nutzer / 0 Freischaltungen | Motivfolge prüfen |
| activeDays | 🎯 `active_days_100` (gold), `active_days_150` (platinum), `active_days_730` (diamond), `active_days_3650` (diamond) | active_days_100: 1 Nutzer / 1 Freischaltung; active_days_150: 1 Nutzer / 1 Freischaltung; active_days_730: 0 Nutzer / 0 Freischaltungen; active_days_3650: 0 Nutzer / 0 Freischaltungen | Motivfolge prüfen |
| activeDays | 🏆 `active_days_250` (platinum), `active_days_1000` (diamond) | active_days_250: 0 Nutzer / 0 Freischaltungen; active_days_1000: 0 Nutzer / 0 Freischaltungen | Motivfolge prüfen |
| avgCacheRate | 💾 `cache_rate_50` (silver), `cache_rate_60` (silver) | cache_rate_50: 1 Nutzer / 1 Freischaltung; cache_rate_60: 1 Nutzer / 1 Freischaltung | Motivfolge prüfen |
| avgCacheRate | 🗄️ `cache_rate_70` (gold), `cache_rate_75` (gold) | cache_rate_70: 1 Nutzer / 1 Freischaltung; cache_rate_75: 1 Nutzer / 1 Freischaltung | Motivfolge prüfen |
| avgCacheRate | 🏎️ `cache_rate_80` (platinum), `cache_rate_85` (platinum), `cache_rate_95` (diamond) | cache_rate_80: 1 Nutzer / 1 Freischaltung; cache_rate_85: 1 Nutzer / 1 Freischaltung; cache_rate_95: 1 Nutzer / 1 Freischaltung | Motivfolge prüfen |
| totalOutputTokens | 📤 `output_1m` (gold), `output_250m` (diamond) | output_1m: 1 Nutzer / 1 Freischaltung; output_250m: 1 Nutzer / 1 Freischaltung | Motivfolge prüfen |
| totalInputTokens | 📥 `input_10m` (gold), `input_1b` (diamond) | input_10m: 1 Nutzer / 1 Freischaltung; input_1b: 0 Nutzer / 0 Freischaltungen | Motivfolge prüfen |
| totalInputTokens | 📩 `input_100m` (diamond), `input_2b` (diamond) | input_100m: 0 Nutzer / 0 Freischaltungen; input_2b: 0 Nutzer / 0 Freischaltungen | Motivfolge prüfen |
| totalInputTokens | 🎯 `input_500m` (diamond), `input_5b` (diamond) | input_500m: 0 Nutzer / 0 Freischaltungen; input_5b: 0 Nutzer / 0 Freischaltungen | Motivfolge prüfen |
| totalCacheReadTokens | 💾 `cache_tokens_10m` (gold), `cache_read_1b` (diamond) | cache_tokens_10m: 1 Nutzer / 1 Freischaltung; cache_read_1b: 1 Nutzer / 1 Freischaltung | Motivfolge prüfen |
| totalCacheReadTokens | 💽 `cache_tokens_50m` (platinum), `cache_tokens_250m` (diamond), `cache_tokens_10b` (diamond) | cache_tokens_50m: 1 Nutzer / 1 Freischaltung; cache_tokens_250m: 1 Nutzer / 1 Freischaltung; cache_tokens_10b: 1 Nutzer / 1 Freischaltung | Motivfolge prüfen |
| totalCacheReadTokens | 🗄️ `cache_tokens_100m` (diamond), `cache_read_2b` (diamond) | cache_tokens_100m: 1 Nutzer / 1 Freischaltung; cache_read_2b: 1 Nutzer / 1 Freischaltung | Motivfolge prüfen |
| longestSessionMin | ⏰ `session_longest_4h` (gold), `session_longest_16h` (diamond) | session_longest_4h: 1 Nutzer / 1 Freischaltung; session_longest_16h: 1 Nutzer / 1 Freischaltung | Motivfolge prüfen |
| longestSessionMin | ⏱️ `session_longest_8h` (platinum), `session_longest_24h` (diamond) | session_longest_8h: 1 Nutzer / 1 Freischaltung; session_longest_24h: 1 Nutzer / 1 Freischaltung | Motivfolge prüfen |
| maxMessagesInSession | 🗣️ `session_max_200_msgs` (platinum), `session_max_1k_msgs` (diamond) | session_max_200_msgs: 1 Nutzer / 1 Freischaltung; session_max_1k_msgs: 1 Nutzer / 1 Freischaltung | Motivfolge prüfen |
| maxMessagesInSession | 📢 `session_max_500_msgs` (diamond), `session_max_2k_msgs` (diamond) | session_max_500_msgs: 1 Nutzer / 1 Freischaltung; session_max_2k_msgs: 1 Nutzer / 1 Freischaltung | Motivfolge prüfen |
| avgMessagesPerSession | 📊 `avg_msgs_session_20` (gold), `avg_msgs_session_150` (diamond) | avg_msgs_session_20: 1 Nutzer / 1 Freischaltung; avg_msgs_session_150: 1 Nutzer / 1 Freischaltung | Motivfolge prüfen |
| avgMessagesPerSession | 📈 `avg_msgs_session_50` (platinum), `avg_msgs_session_200` (diamond) | avg_msgs_session_50: 1 Nutzer / 1 Freischaltung; avg_msgs_session_200: 1 Nutzer / 1 Freischaltung | Motivfolge prüfen |
| maxDayCost | 📈 `cost_day_10` (gold), `cost_day_200` (diamond), `cost_day_250` (diamond) | cost_day_10: 1 Nutzer / 1 Freischaltung; cost_day_200: 1 Nutzer / 1 Freischaltung; cost_day_250: 1 Nutzer / 1 Freischaltung | Motivfolge prüfen |
| maxDayCost | 📊 `cost_day_25` (platinum), `cost_day_150` (diamond), `cost_day_500` (diamond) | cost_day_25: 1 Nutzer / 1 Freischaltung; cost_day_150: 1 Nutzer / 1 Freischaltung; cost_day_500: 1 Nutzer / 1 Freischaltung | Motivfolge prüfen |
| maxDayCost | 💹 `cost_day_50` (diamond), `cost_day_1k` (diamond) | cost_day_50: 1 Nutzer / 1 Freischaltung; cost_day_1k: 1 Nutzer / 1 Freischaltung | Motivfolge prüfen |
| maxCostInSession | 💰 `big_session_cost_25` (platinum), `session_cost_100` (diamond) | big_session_cost_25: 1 Nutzer / 1 Freischaltung; session_cost_100: 1 Nutzer / 1 Freischaltung | Motivfolge prüfen |
| maxDayLines | ⚡ `lines_day_1k` (gold), `ld_day2_45k` (diamond), `lines_day_50k` (diamond) | lines_day_1k: 1 Nutzer / 1 Freischaltung; ld_day2_45k: 1 Nutzer / 1 Freischaltung; lines_day_50k: 1 Nutzer / 1 Freischaltung | Motivfolge prüfen |
| maxDayLines | 🌩️ `lines_day_5k` (platinum), `ld_day2_60k` (diamond), `lines_day_100k` (diamond) | lines_day_5k: 1 Nutzer / 1 Freischaltung; ld_day2_60k: 0 Nutzer / 0 Freischaltungen; lines_day_100k: 0 Nutzer / 0 Freischaltungen | Motivfolge prüfen |
| maxDayLines | 🌋 `lines_day_10k` (diamond), `ld_day2_90k` (diamond) | lines_day_10k: 1 Nutzer / 1 Freischaltung; ld_day2_90k: 0 Nutzer / 0 Freischaltungen | Motivfolge prüfen |
| maxDayLines | 🔥 `lines_day_25k` (diamond), `ld_day2_70k` (diamond) | lines_day_25k: 1 Nutzer / 1 Freischaltung; ld_day2_70k: 0 Nutzer / 0 Freischaltungen | Motivfolge prüfen |
| toolCallsByName.Bash | 💻 `tool_bash_1k` (gold), `tool_bash_100k` (diamond), `tool_bash_1m` (diamond) | tool_bash_1k: 1 Nutzer / 1 Freischaltung; tool_bash_100k: 1 Nutzer / 1 Freischaltung; tool_bash_1m: 0 Nutzer / 0 Freischaltungen | Motivfolge prüfen |
46 weitere Gruppen.

## Anbieter-Daten für Welle 3

| Anbieter | Nachrichten | Tokens (alle Arten) | aktive UTC-Tage | Zeitraum | Nachrichten mit Cache / Zeilen |
|---|---:|---:|---:|---|---|
| antigravity | 11.226 | 185.664.401 | 10 | 2026-09-19T20:41:29.000Z – 2026-10-03T04:11:10.000Z | 11.187 / 0 |
| claude | 339.640 | 126.704.219.310 | 237 | 2025-05-05T13:12:44.000Z – 2026-10-07T16:37:05.782Z | 334.014 / 57.363 |
| codex | 8.493 | 1.002.209.635 | 18 | 2026-09-09T21:15:56.223Z – 2026-10-07T16:36:17.196Z | 8.487 / 0 |

`buildStats` arbeitet auf dem ungefilterten Aggregator; `totalTokens`, `totalMessages` und weitere globale Werte zählen daher Codex und Antigravity bereits mit. Anbieter-Kopien bestehender Leistungen sind ausgeschlossen. Codex hat erst 18 aktive Tage; Anbieter-Beziehungs-Achievements werden gemäß Vorabentscheidung auf eine spätere Welle verschoben.

## Laufzeitmessung nach Änderungen

Gleicher Aggregator, Wegwerf-DB-Adapter ohne Schreibzugriff: `checkAchievements` 88.7 ms, vollständiger `backfillAchievements` 6760.1 ms für 246 Tage und 603 errechnete Freischaltungen. Einzelmessungen enthalten JIT-/Cache-Effekte; der Nachher-Vergleich nutzt denselben Ablauf.

## Status

Dieser Bericht zeigt den aktiven Endbestand; stillgelegte Keys bleiben als historische Definitionen erhalten.
