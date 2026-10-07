# Codex-Prompt: Achievement-Icons im Material-3-Expressive-Stil

> Zum Einfügen in Codex, gestartet im Repo `/Users/martin/claude/token-tracker`.
> Alles unterhalb der Linie ist der Prompt.

---

## Aufgabe

Ersetze die Emoji der Achievements im Token Tracker durch ein **eigenes SVG-Icon-Set im
Stil von Material 3 Expressive**. Lies vorher `CLAUDE.md` im Repo-Wurzelverzeichnis. Es
beschreibt Architektur, Konventionen und Testregeln, und es gilt.

## Ausgangslage (bitte selbst nachprüfen, nicht glauben)

- `lib/achievements.js` exportiert `ACHIEVEMENTS`: **1200 Einträge** in 14 Kategorien
  (tokens, sessions, messages, cost, lines, models, tools, time, projects, streaks,
  cache, special, efficiency, ratelimits) und 5 Stufen (bronze, silver, gold, platinum,
  diamond). Jeder Eintrag hat `key`, `category`, `tier` und `emoji`.
- Es gibt **346 verschiedene Emoji**. Viele meinen dasselbe, zum Beispiel
  💵 💶 💷 💴 (Geldschein) oder 📅 🗓️ 📆 (Kalender).
- Gerendert werden die Emoji an mindestens drei Stellen in `public/js/app.js`:
  - im Tagesdialog der Zeitleiste (Suche nach `ach-day-icon`);
  - im Achievement-Raster (Suche nach `tierFallback`);
  - im Popup bei neuen Freischaltungen (Suche nach `achievement-notification`).
  Dazu kommt der HTML-Export (`lib/export-html.js`). Finde **alle** Stellen per Suche
  nach `emoji` in `public/` und `lib/`, verlass dich nicht auf diese Liste.
- Das Frontend hat keinen Build-Schritt und kein Framework. Es baut DOM per
  `createElement`/`textContent` statt `innerHTML`. Chart.js kommt vom CDN.
- Commit `29b2647` hat die übrigen UI-Emoji schon durch SVG-Icons ersetzt. Übernimm von
  dort Größen, Farbtokens und CSS-Muster (`.tab-item-icon`, `.m3-btn-icon`).

## Gestaltungskonzept: Motiv × Stufenform

Die Icons sind **zwei Ebenen**, kein Set von 1200 Einzelbildern:

1. **Motiv** (was geschafft wurde): ein flaches, gefülltes Glyph, zum Beispiel Flamme,
   Kalender, Rakete oder Geldschein. Mehrere Emoji mit derselben Bedeutung teilen sich
   ein Motiv.
2. **Stufenform** (wie schwer es war): der Container hinter dem Motiv stammt aus der
   **Shape-Bibliothek von Material 3 Expressive**. Je höher die Stufe, desto
   ausdrucksstärker die Form:

   | Stufe    | Form (M3E-Shape-Name, sinngemäß)          |
   |----------|--------------------------------------------|
   | bronze   | Kreis                                      |
   | silver   | weiches Quadrat („squircle“, große Rundung) |
   | gold     | Keks mit 9 Bögen („cookie 9“)              |
   | platinum | Blume mit 8 Blättern („flower“)            |
   | diamond  | Sonne bzw. Stern mit 12 Zacken („sunny“)   |

   Die Stufe muss **ohne Farbe** erkennbar sein, nur an der Silhouette. Farbe kommt
   zusätzlich hinzu, nicht stattdessen.

Kategorie, Stufe und Motiv ergeben zusammen das Abzeichen. Die Kategorie bekommt kein
eigenes Zeichen, das Motiv trägt sie bereits.

## Schritt 1: Bestandsaufnahme und Motiv-Zuordnung

1. Lies `ACHIEVEMENTS` per Node-Skript aus. Erzeuge eine Liste aller Emoji mit Anzahl je
   Kategorie und je Stufe sowie Beispiel-Keys.
2. Fasse Emoji gleicher Bedeutung zu **Motiven** zusammen. Ziel sind **etwa 100 bis 140
   Motive**. Zusammenfassen ist richtig, wo die Bedeutung gleich ist (Währungen,
   Kalender, Briefe). Falsch ist es, wo eine Leiter von Achievements gerade über
   verschiedene Bilder ihre Steigerung erzählt (etwa Berg → Vulkan → Galaxie).
   Steigerung innerhalb einer Leiter darf als eigenes Motiv bleiben.
3. Lege die Zuordnung als **eine** Datei ab: `lib/achievement-icon-map.js` mit
   `{ <emoji>: '<motif-key>' }` plus einer Liste der Motive mit einem Satz Begründung je
   Motiv. Motiv-Keys sind kurz, englisch, kebab-case (`banknote`, `calendar`, `rocket`).
4. **Ändere die 1200 Definitionen in `lib/achievements.js` nicht.** Das Motiv wird beim
   Laden über die Zuordnung ergänzt (`ach.icon`). `emoji` bleibt als Rückfall und für
   bestehende Daten erhalten.

Bevor du zeichnest: lege die Zuordnung als Tabelle (Emoji → Motiv → Anzahl
Achievements) in `docs/achievement-icons.md` ab. Halte dort auch fest, wo du bewusst
zusammengefasst oder bewusst getrennt hast.

## Schritt 2: Motive zeichnen

Regeln für jedes Motiv-Glyph:

- `viewBox="0 0 24 24"`, Inhalt im Rahmen 2–22 (2 px Schutzzone), optisch ausgeglichen:
  ein Kreis darf etwas größer sein als ein Quadrat.
- **Nur Flächen, keine Konturen.** Genau **ein** `<path>` je Motiv mit
  `fill="currentColor"` und `fill-rule="evenodd"`. Innenzeichnungen (Fenster der Rakete,
  Zeiger der Uhr) sind **echte Löcher** im selben Pfad, keine dunkle Auflage. Eine
  Auflage in `rgba(0,0,0,.35)` verschwindet auf hellem Grund, eine Auflage in
  `currentColor` ist auf dem eigenen Körper unsichtbar.
- **M3-Expressive-Charakter:** großzügig gerundete Ecken (Radius 1,5–3 auf 24), weiche,
  freundliche Silhouetten, kräftige Strichstärke von etwa 2–2,5 Einheiten bei
  Linienmotiven, keine Haarlinien unter 1,5. Lieber eine klare Form als viele Details.
- Lesbar bei **18 px** (Liste, Popup) **und** schön bei **48 px** (Raster). Wenn ein
  Detail bei 18 px zu Brei wird, fliegt es raus.
- Kein `id`, kein `transform`, kein `<style>`, keine Verläufe, keine externen Verweise.
  Ein Glyph erscheint mehrfach je Seite, `id`s würden kollidieren.
- **Geometrie wird gerechnet, nicht getippt.** Schreib einen Generator
  `tools/build-achievement-icons.mjs`. Er setzt Pfade aus Primitiven zusammen (Kreis,
  abgerundetes Rechteck, Kapsel, Polygon mit Eckrundung, Kreisbogen, Boolean über
  evenodd) und schreibt das Ergebnis. Handgetippte Pfaddaten sind eine Fehlerquelle.
- **Falle bei evenodd:** Wo sich zwei Aussparungen kreuzen, zählt evenodd drei Durchgänge.
  Das ist ungerade, die Stelle ist also wieder **gefüllt**. Aussparungen dürfen sich
  nicht überlappen; teile sie notfalls.
- Keine fremden Icon-Pfade wörtlich übernehmen. Material Symbols (Apache-2.0) darfst du
  als **Referenz** für Proportionen ansehen. Übernimmst du doch einen Pfad, vermerke
  Quelle und Lizenz in `THIRDPARTY` bzw. im README.

## Schritt 3: Stufenformen

- Ebenfalls im Generator gerechnet: Kreis, Squircle, Cookie-9, Flower-8, Sunny-12, je auf
  `viewBox="0 0 48 48"`, gleicher optischer Durchmesser, damit die Abzeichen in einer
  Reihe nicht unterschiedlich groß wirken.
- Das Motiv sitzt zentriert bei etwa 55 % der Containerbreite.
- Farben **nur über CSS-Tokens**: Container-Fläche je Stufe als Token
  (`--ach-bronze`, `--ach-silver`, `--ach-gold`, `--ach-platinum`, `--ach-diamond`),
  das Motiv in der passenden On-Farbe (`--on-ach-*`).
  - Kontrast Motiv gegen Container mindestens 3:1 (Grafik, WCAG 1.4.11).
  - Container gegen Kartenhintergrund ebenfalls mindestens 3:1.
  - Prüfe **dunkles und helles Theme**, falls das Repo beide hat; sonst das vorhandene.
- **Gesperrte** Achievements: dieselbe Form als Kontur (oder gedämpfte Fläche), Motiv
  gedämpft. Nicht per `opacity` auf Text dämpfen: Deckkraft multipliziert sich auf den
  Grund und drückt den Kontrast unter die Grenze. Gedämpft wird über Farbtokens.

## Schritt 4: Einbau

- Neue Datei `public/js/achievement-icons.js` (vor `app.js` in `index.html` laden) mit:
  - `ACH_MOTIFS = { key: 'd-attribut' }` und `ACH_SHAPES = { tier: 'd-attribut' }`,
    beide **generiert**, mit Kopfkommentar „Do not edit — generated by
    tools/build-achievement-icons.mjs“;
  - `achBadge(ach, { size, locked })`: baut das Abzeichen per `createElementNS` (kein
    `innerHTML`). Ohne passendes Motiv fällt es auf das Emoji zurück, ohne Emoji auf das
    vorhandene Pokal-SVG.
- Ersetze **alle** gefundenen Emoji-Renderstellen durch `achBadge`. Die API liefert dafür
  zusätzlich `icon` mit (`getAchievementsResponse`, `getAchievementsByKeys`, SSE-Event
  `achievement-unlocked`), additiv: `emoji` bleibt im Payload.
- HTML-Export (`lib/export-html.js`): Er ist eigenständig. Bette die Pfade dort inline als
  SVG ein, ohne Laufzeit-JS-Abhängigkeit vom Dashboard.
- Demo-Daten (`public/js/demo-data.js`) bekommen ebenfalls `icon`.
- Animation höchstens beim Freischalten (Popup): ein kurzer Feder-Pop der Stufenform mit
  den vorhandenen Tokens `--ease-spatial-expressive-fast`. `prefers-reduced-motion`
  schaltet das ab. Keine Dauerbewegung im Raster.

## Schritt 5: Prüfen, und zwar ehrlich

1. **Kontaktbogen:** `tools/achievement-icons-sheet.html` zeigt jedes Motiv in 18/24/48 px
   und jede Stufenform mit drei Beispielmotiven, auf dunklem und hellem Grund. Rendere
   ihn mit **Chrome headless** (Playwright) zu PNGs und sieh sie dir an. Nicht mit
   ImageMagick rendern: das fällt bei SVG auf einen internen Renderer zurück und liefert
   falsche Bilder. Lege die PNGs unter `docs/achievement-icons/` ab.
2. **Löcher wirklich leer:** Prüf je Motiv im Browser per `SVGGeometryElement.isPointInFill`
   mindestens einen Punkt im Körper (muss gefüllt sein) und einen in jeder Aussparung
   (muss leer sein). Wenn eine Probe fehlschlägt, prüf zuerst deinen Probepunkt, dann das
   Glyph.
3. **Kontrast** messen, nicht schätzen: Farben über einen Canvas rastern und das Pixel
   lesen statt `getComputedStyle` per Regex zu zerlegen (der Browser liefert dort auch
   `color(srgb …)`).
4. **Unit-Tests** (vitest, `test/achievement-icons.test.js`):
   - Jedes der 1200 Achievements löst auf ein existierendes Motiv auf.
   - Jedes Motiv wird mindestens einmal benutzt.
   - Kein Emoji ohne Zuordnung.
   - Jede Stufe hat eine Form.
   - Jeder Pfad parst, liegt im viewBox und enthält kein `id`, `transform`, `url(` oder
     `<script`.
   - Keine zwei Motive mit identischem Pfad.
   - `ACH_MOTIFS` ist genau das, was der Generator heute erzeugt (Generator laufen
     lassen, Ausgabe vergleichen), damit niemand die generierte Datei von Hand ändert.
   - Rückfall auf Emoji bzw. Pokal, wenn ein Motiv fehlt.
   - `textContent`-/DOM-Aufbau statt `innerHTML` in `achBadge`.
5. **Gegenprobe jedes neuen Tests:** Bau den Fehler absichtlich ein und sieh den Test
   **rot**. Prüf vorher per Prüfsumme, dass die Mutation die Datei wirklich verändert
   hat. Ein Test, den du nie scheitern gesehen hast, beweist nichts.
6. Volle Suite `npm test` und `npm run lint` müssen grün sein.
7. Danach `git add`, **dann** `npm run badges` (die Zeilenzahl ändert sich), und den
   CHANGELOG-Eintrag samt `package.json`-Version anheben (Minor). `test/docs.test.js`
   verlangt, dass jedes neue `lib/`-Modul in `docs/ARCHITECTURE.md` steht und jede
   Version im CHANGELOG.

## Was ich am Ende von dir sehen will

- Die Motiv-Tabelle (Emoji → Motiv) mit deinen Zusammenfassungs-Entscheidungen.
- Die Kontaktbogen-PNGs in beiden Themes.
- Testergebnis mit Anzahl, Liste der Gegenproben (rot gesehen: ja/nein).
- Eine ehrliche Liste: welche Motive dir bei 18 px nicht gut gelungen sind.

## Grenzen

- Keine neuen npm-Abhängigkeiten, kein Icon-Font, keine Rastergrafiken für die Icons.
- Keine Bildgenerierung per KI-Bildmodell: die Icons sind Vektorgeometrie aus dem
  Generator.
- Nichts an Freischalt-Logik, Punkten, Schwellen oder Texten der Achievements ändern.
- Commit-Messages englisch, UI-Texte deutsch mit echten Umlauten.
- Nicht pushen und nicht deployen.
