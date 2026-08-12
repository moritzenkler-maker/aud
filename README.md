# Loco Chicken Deutschland – Gaming App

Mobile Gaming- und Loyalty-App für Loco Chicken Deutschland: Gäste spielen
**Nugget Rush**, verdienen dabei **Loco Coins** und tauschen diese gegen
Gutscheine ein, die im Restaurant vorgezeigt werden.

Die App ist eine installierbare Web-App (PWA) ohne Build-Schritt und ohne
Laufzeit-Abhängigkeiten – reines HTML, CSS und modernes JavaScript (ES-Module).

## Schnellstart

```bash
npm start     # startet einen lokalen Server auf http://localhost:5173
npm test      # führt die Unit-Tests der Spiel-Ökonomie aus
```

Für Node ab Version 20. Alternativ genügt jeder statische Webserver, der das
Projektverzeichnis ausliefert (ein Öffnen der `index.html` per `file://`
funktioniert wegen der ES-Module nicht).

## Das Spiel: Nugget Rush

Ein Drei-Spuren-Runner. Das Huhn läuft über die Straße und muss Nuggets und
Coins einsammeln, während es Chili-Sperren ausweicht.

- **Steuerung:** Wischen oder Tippen auf die linke/rechte Bildschirmhälfte, die
  Buttons am unteren Rand oder die Pfeiltasten bzw. `A`/`D` am Desktop.
- **Leben:** drei Herzen, nach einem Treffer ist das Huhn kurz unverwundbar.
- **Combo:** Je fünf eingesammelte Objekte steigt der Multiplikator (bis x5),
  ein Treffer setzt ihn zurück.
- **Tempo:** Die Geschwindigkeit steigt kontinuierlich bis zu einem Maximum.

Alle Grafiken werden prozedural auf ein Canvas gezeichnet – es müssen keine
Bild-Assets ausgeliefert werden.

## Loyalty-Mechanik

| Element | Regel |
| --- | --- |
| Coins | 10 Spielpunkte = 1 Loco Coin (wird abgerundet) |
| Tagesbonus | +25 Coins, einmal pro Kalendertag |
| Gutscheine | Katalog von 150 bis 1500 Coins |
| Gültigkeit | 14 Tage ab Einlösung |
| Code | Format `LOCO-XXXX-XXXX`, ohne verwechselbare Zeichen (I, O, 0, 1) |

Ein Gutschein kann in der App als „im Restaurant eingelöst" entwertet werden,
damit derselbe Code nicht mehrfach verwendet wird.

## Projektstruktur

```
index.html              App-Shell mit allen Screens
manifest.webmanifest    PWA-Manifest
sw.js                   Service Worker (Offline-Betrieb)
assets/icon.svg         App-Icon
src/css/styles.css      Styles, Farben zentral als CSS-Variablen
src/js/app.js           Navigation, Zustand, Anbindung Spiel <-> Profil
src/js/game.js          Spiel-Engine (Canvas, Physik, Rendering)
src/js/economy.js       Coins, Belohnungen, Gutscheine (frei von Browser-APIs)
src/js/storage.js       Persistenz im localStorage
src/js/audio.js         synthetisierte Sounds via Web Audio API
scripts/serve.mjs       Entwicklungsserver ohne Abhängigkeiten
test/economy.test.mjs   Unit-Tests der Spiel-Ökonomie
```

`economy.js` enthält die gesamte Wirtschaftslogik als reine Funktionen ohne
DOM-Zugriff. Dadurch ist sie unter Node testbar und lässt sich später
unverändert gegen ein Backend austauschen.

## Anpassung an das Corporate Design

Farben, Radien und Schatten liegen als CSS-Variablen im `:root`-Block von
`src/css/styles.css`. Die aktuell hinterlegten Werte (Orange, Chili-Rot,
Nugget-Gelb auf dunklem Grill-Braun) sind Platzhalter und sollten durch die
offiziellen CI-Farben ersetzt werden; dasselbe gilt für `assets/icon.svg` und
das Logo in der Kopfzeile. Die Farben des Spielfelds stehen im Objekt `PALETTE`
in `src/js/game.js`.

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
