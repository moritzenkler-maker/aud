# Loco Chicken Deutschland – Gaming App

Mobile Gaming- und Loyalty-App für Loco Chicken Deutschland: Gäste spielen
**Nugget Rush**, verdienen dabei **Loco Coins** und tauschen diese gegen
Gutscheine ein, die im Restaurant vorgezeigt werden.

Die App ist eine installierbare Web-App (PWA) ohne Build-Schritt und ohne
Laufzeit-Abhängigkeiten – reines HTML, CSS und modernes JavaScript (ES-Module).
Gestaltung, Spielgrafik und Icons folgen dem Marken-CI: Gelb und Rot des
Badge-Logos, kräftige schwarze Comic-Konturen, das rot-weiße Karo der
Verpackung und der Hahn mit Sonnenbrille als Spielfigur.

## Schnellstart

```bash
npm start            # startet einen lokalen Server auf http://localhost:5173
npm test             # führt die Unit-Tests der Spiel-Ökonomie aus
npm run build:preview # baut dist/preview.html als teilbare Einzeldatei
```

Für Node ab Version 20. Alternativ genügt jeder statische Webserver, der das
Projektverzeichnis ausliefert (ein Öffnen der `index.html` per `file://`
funktioniert wegen der ES-Module nicht).

## Das Spiel: Nugget Rush

Ein Drei-Spuren-Runner: Der Loco-Hahn mit Sonnenbrille, Kamm und blauer Weste
rennt über die Straße, sammelt Nuggets, Fries und Burger ein und weicht dabei
den Flammen aus.

- **Steuerung:** Wischen oder Tippen auf die linke/rechte Bildschirmhälfte, die
  Buttons am unteren Rand oder die Pfeiltasten bzw. `A`/`D` am Desktop.
- **Sammeln:** Nugget 10 Punkte, Fries 25 Punkte, Loco Burger 50 Punkte.
- **Ausweichen:** Flammen kosten ein Leben.
- **Leben:** drei Herzen, nach einem Treffer ist das Huhn kurz unverwundbar.
- **Combo:** Je fünf eingesammelte Objekte steigt der Multiplikator (bis x5),
  ein Treffer setzt ihn zurück.
- **Tempo:** Die Geschwindigkeit steigt kontinuierlich bis zu einem Maximum.

Alle Spielgrafiken werden prozedural auf ein Canvas gezeichnet – Straße mit
rot-weißem Karo-Bordstein, Sammelobjekte, Flammen und die Spielfigur. Für das
Spiel müssen keine Bilddateien ausgeliefert werden.

## Loyalty-Mechanik

| Element | Regel |
| --- | --- |
| Coins | 10 Spielpunkte = 1 Loco Coin (wird abgerundet) |
| Tagesbonus | +25 Coins, einmal pro Kalendertag |
| Gutscheine | Dip (150), Fries (300), Tenders (600), Burger (900), Bucket (1500) |
| Gültigkeit | 14 Tage ab Einlösung |
| Code | Format `LOCO-XXXX-XXXX`, ohne verwechselbare Zeichen (I, O, 0, 1) |

Ein Gutschein kann in der App als „im Restaurant eingelöst" entwertet werden,
damit derselbe Code nicht mehrfach verwendet wird.

## Projektstruktur

```
index.html              App-Shell mit allen Screens
manifest.webmanifest    PWA-Manifest
sw.js                   Service Worker (Offline-Betrieb)
assets/icon.svg         App-Icon (Badge ohne Schriftzug)
assets/logo.svg         Badge-Logo mit Schriftzug für große Flächen
assets/coin.svg         Loco Coin
assets/rewards/*.svg    Icons des Belohnungskatalogs
src/css/styles.css      Styles, Marken-Werte zentral als CSS-Variablen
src/js/app.js           Navigation, Zustand, Anbindung Spiel <-> Profil
src/js/game.js          Spiel-Engine (Canvas, Physik, Rendering)
src/js/economy.js       Coins, Belohnungen, Gutscheine (frei von Browser-APIs)
src/js/storage.js       Persistenz im localStorage
src/js/audio.js         synthetisierte Sounds via Web Audio API
scripts/serve.mjs       Entwicklungsserver ohne Abhängigkeiten
scripts/build-preview.mjs  baut die Vorschau als Einzeldatei
test/economy.test.mjs   Unit-Tests der Spiel-Ökonomie
```

`economy.js` enthält die gesamte Wirtschaftslogik als reine Funktionen ohne
DOM-Zugriff. Dadurch ist sie unter Node testbar und lässt sich später
unverändert gegen ein Backend austauschen.

## Vorschau zum Testen

`npm run build:preview` erzeugt `dist/preview.html`: die komplette App in einer
einzigen Datei, mit eingebettetem CSS, JavaScript und allen Grafiken als
data:-URI. Die Datei braucht weder Server noch Internet und lässt sich per
Doppelklick im Browser öffnen oder weitergeben.

Die Vorschau wird immer aus den Quellen gebaut und kann deshalb nicht vom
Code abweichen. Der Service Worker ist darin ausgespart, weil Offline-Caching
nur für die ausgelieferte App sinnvoll ist. `dist/` liegt in `.gitignore`.

## Corporate Design

Die Marken-Werte liegen gesammelt im `:root`-Block von `src/css/styles.css`:

| Variable | Wert | Verwendung |
| --- | --- | --- |
| `--red` | `#d91f26` | Logo-Ring, Buttons, Überschriften |
| `--yellow` | `#ffdd00` | Badge-Fläche, App-Hintergrund, Coins |
| `--ink` | `#12100e` | Konturen und Schatten (Comic-Look) |
| `--blue` | `#2e5fa3` | Weste des Maskottchens, Truffle-Mayo-Akzent |
| `--checker` | Kachelmuster | rot-weißes Karo der Verpackung |

Die Farben des Spielfelds stehen als `PALETTE` in `src/js/game.js` und sind auf
dieselben Werte abgestimmt.

Die Dateien `assets/icon.svg` und `assets/logo.svg` sind **nachgebaute
Annäherungen** an das Badge-Logo, damit die App ohne Zulieferung startklar ist.
Sobald die offiziellen Logodateien vorliegen, sollten sie diese ersetzen – die
Pfade bleiben dabei gleich. Gleiches gilt für die Hausschrift: aktuell wird eine
fette kursive Systemschrift verwendet (`--display`), die sich an einer Stelle
gegen die CI-Schrift tauschen lässt.

Der Belohnungskatalog wird über die Konstante `REWARDS` in `src/js/economy.js`
gepflegt. Die `id` eines Eintrags wird in bereits ausgestellten Gutscheinen
gespeichert und darf sich deshalb nachträglich nicht ändern.

## Datenhaltung

Der aktuelle Stand ist ein reiner Client-Prototyp: Coins, Rekorde und
Gutscheine liegen im `localStorage` des Geräts (Schlüssel
`loco-chicken:profile:v1`). Sie sind damit weder geräteübergreifend
synchronisiert noch manipulationssicher.

## Nächste Schritte

- Backend mit Nutzerkonto, damit Coins geräteübergreifend gelten
- Serverseitige Ausstellung und Prüfung der Gutscheincodes (inklusive
  QR-Code für die Kasse), damit Codes nicht lokal erzeugt werden
- Filialauswahl und Anbindung an das Bestellsystem
- Bestenliste über alle Spieler, Wochen-Challenges und Push-Erinnerungen
- Rechtliches: Datenschutzerklärung, Impressum und Teilnahmebedingungen
