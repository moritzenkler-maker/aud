# Loco Chicken Deutschland – Gaming App

Mobile Gaming- und Loyalty-App für Loco Chicken Deutschland: Gäste spielen
**Loco Fryer**, verdienen dabei **Loco Coins** und tauschen diese gegen
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

## Das Spiel: Loco Fryer

Ein Timing-Spiel an der Fritteuse. In sechs Körben garen Nuggets, Tenders und
Keulen vor sich hin. Jedes Teil hat einen Garring, der sich füllt – und kurz
bevor er voll ist, leuchtet ein schmaler goldener Abschnitt auf. Genau dann
muss gezogen werden.

| Zeitpunkt | Folge |
| --- | --- |
| Im goldenen Fenster | **Perfekt**: 100 Punkte × Combo, Combo steigt (bis x10) |
| Vorher, ab halb gar | **Gut**: 20 Punkte × Combo, Combo bleibt stehen |
| Zu früh | Teil ist hin, Combo fällt auf x1 zurück |
| Zu spät | **Verbrannt**: ein Strike – nach dreien ist die Schicht vorbei |

Fünf perfekte Züge in Folge geben zusätzlich 500 Punkte („Heiß!").

Zwei Entscheidungen machen das Spiel schwer und dadurch reizvoll: Der goldene
Moment liegt direkt vor dem Verbrennen, Warten bringt also Punkte und Risiko
zugleich. Und die drei Teilesorten garen unterschiedlich schnell, weshalb
blindes Mitzählen nicht funktioniert. Wildes Dauertippen wird bestraft, weil
jedes zu früh gezogene Teil die Combo zerstört.

Mit jedem servierten Teil wird es schneller: Die Garzeit sinkt von 3,4 auf
1,6 Sekunden, der Nachschub kommt dichter, und das goldene Fenster schrumpft
von 18 % auf 7,5 % der Garzeit.

- **Steuerung:** Teil antippen. Am Desktop wahlweise die Tasten 1–6.
- **Alle Stellschrauben** stehen als Konstanten am Anfang von `src/js/game.js`.

Sämtliche Grafik wird prozedural auf ein Canvas gezeichnet – Edelstahlwand,
Karo-Streifen, brodelndes Öl, Garringe und die Teile in jedem Garzustand.

## Engagement-Mechaniken

Die Auswahl orientiert sich daran, was in kurzformatig sozialisierten
Zielgruppen nachweislich trägt – übernommen wurde nur, was zur Marke passt
und die Ökonomie nicht aufweicht.

### Was übernommen wurde

| Mechanik | Wirkprinzip | Umsetzung |
| --- | --- | --- |
| **Kurze Runden mit Sofort-Neustart** | Die Entscheidung "noch eine Runde" darf keine Reibung haben. | Ergebnisbildschirm mit "Sofort nochmal" als erstem Button, Enter/Leertaste startet direkt. Die Erklärung vor der Runde erscheint nur einmal je Sitzung. |
| **Beinahe-Treffer** | Knapp verfehlt motiviert stärker als klar verfehlt – vorausgesetzt, man sieht, wie knapp es war. | Jeder verfrühte Zug zeigt den Abstand in Sekunden ("0,18 s zu früh"), das Rundenergebnis nennt den knappsten Fehlversuch. |
| **Sichtbare Könnenssteigerung** | Fortschritt muss spürbar sein, auch ohne Belohnung. | Combo bis x10, Perfekt-Serien mit Bonus, fünf Ränge von der Küchenhilfe zur Loco Legende. |
| **Tagesserie** | Verlustaversion bindet stärker als Belohnung: Eine Serie will man nicht reißen lassen. | Serienzähler auf der Startseite, deutlicher Hinweis, wenn heute noch nicht gespielt wurde. Bewusst **ohne** Coin-Auszahlung. |
| **Tagesmissionen** | Ein frisches Ziel pro Tag, unabhängig vom Punktestand – und etwas, worüber man reden kann. | Drei Aufgaben täglich, aus dem Datum abgeleitet und damit für alle Geräte gleich. |
| **Teilbares Ergebnis** | Reichweite entsteht durch Weitergabe, nicht durch Werbung. | Ergebniskarte im Hochformat 9:16 mit Punktzahl, Combo, Rang und Serie – über das System-Teilen-Menü oder als Screenshot. |
| **Spürbare Rückmeldung** | Auf dem Handy trägt Haptik und Ton mehr als jede Animation. | Vibration bei Perfekt und beim Verbrennen, mit der Combo steigende Tonhöhe, Aufblitzen und Partikel. |

### Was bewusst nicht übernommen wurde

Nicht übernommen wurden Lootboxen, Zufallsbelohnungen mit unbekanntem Wert
und "Doppelt oder nichts"-Momente. Sie wirken kurzfristig am stärksten, sind
aber glücksspielnah – bei einer Gastronomiemarke, deren Publikum teils
minderjährig ist, wäre das weder rechtlich sauber noch dem Ruf zuträglich.
Ebenfalls verzichtet: Energiesysteme, die zum Warten oder Bezahlen zwingen.
Das Spiel bleibt unbegrenzt spielbar – begrenzt ist nur der Coin-Ertrag.

### Warum das die Ökonomie nicht aufweicht

Alle erspielbaren Coins laufen über eine einzige Funktion (`grantCoins`), die
die Tagesobergrenze durchsetzt. Missionen sind dadurch kein zusätzlicher
Kanal, sondern nur ein anderer Weg zum selben Tageskontingent von 20 Coins.
Serie und Rang zahlen überhaupt nichts aus – sie wirken über Status. Ein
Test hält das fest: Missionen bringen bei ausgeschöpftem Tageslimit null
Coins.

## Loyalty-Mechanik

Die Ökonomie ist bewusst streng ausgelegt: Ein Gutschein soll ein Grund zum
Wiederkommen sein, kein Automatismus.

| Element | Regel |
| --- | --- |
| Coins | 2.000 Spielpunkte = 1 Loco Coin (wird abgerundet) |
| Tagesobergrenze | höchstens 20 erspielte Coins pro Kalendertag |
| Tagesbonus | +5 Coins fürs Reinschauen (zählt nicht gegen die Obergrenze) |
| Missionen | 3 Aufgaben täglich, je 3 Coins – innerhalb der Obergrenze |
| Offene Gutscheine | nur einer gleichzeitig |
| Gültigkeit | 14 Tage ab Einlösung |
| Code | Format `LOCO-XXXX-XXXX`, ohne verwechselbare Zeichen (I, O, 0, 1) |

### Belohnungen

| Belohnung | Coins | Bedingung |
| --- | --- | --- |
| Dip nach Wahl | 100 | zu jeder Bestellung |
| Loco Fries | 200 | ab 10 € Bestellwert |
| 4 Chicken Tenders | 350 | ab 15 € Bestellwert |
| Loco Burger für 1 € | 600 | ab 15 € Bestellwert |
| 20 % auf den Bucket | 900 | ab 25 € Bestellwert |

### Warum der Laden dabei nicht draufzahlt

Vier Bremsen greifen ineinander:

1. **Punkte gibt es nur für Können.** Spielzeit allein bringt nichts – Punkte
   entstehen ausschließlich durch perfekt getroffene Züge. Eine Anfängerrunde
   liegt bei ein paar hundert Punkten, eine sehr gute bei einigen tausend.
2. **Hoher Umrechnungskurs.** 2.000 Punkte pro Coin. Eine durchschnittliche
   Runde bringt 1–3 Coins.
3. **Tagesobergrenze.** Mehr als 20 erspielte Coins pro Tag sind nicht
   möglich, Dauergrinden lohnt also nicht. Punkte und Rekorde zählen weiter,
   nur Coins nicht.
4. **Mindestbestellwert.** Außer dem Dip hängt jede Belohnung an einem
   Bestellwert – hinter jedem eingelösten Gutschein steht Umsatz.

In der Praxis heißt das: Wer fast täglich spielt, kommt nach etwa einer Woche
zum ersten Dip; die großen Belohnungen brauchen mehrere Wochen. Wer nur
gelegentlich spielt, entsprechend länger.

Zum Nachjustieren genügen die Konstanten am Anfang von `src/js/economy.js`
(`POINTS_PER_COIN`, `DAILY_COIN_CAP`, `DAILY_BONUS_COINS`,
`MAX_ACTIVE_COUPONS`) sowie die `cost`- und `minOrder`-Werte im Katalog.

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
src/js/game.js          Spiel "Loco Fryer" (Canvas, Timing, Rendering)
src/js/economy.js       Coins, Belohnungen, Gutscheine, Serie, Ränge
src/js/missions.js      Tagesmissionen (frei von Browser-APIs, testbar)
src/js/sharecard.js     Ergebniskarte 9:16 zum Teilen
src/js/storage.js       Persistenz im localStorage
src/js/audio.js         synthetisierte Sounds via Web Audio API
scripts/serve.mjs       Entwicklungsserver ohne Abhängigkeiten
scripts/build-preview.mjs  baut die Vorschau als Einzeldatei
test/economy.test.mjs   Unit-Tests der Spiel-Ökonomie
test/missions.test.mjs  Unit-Tests für Missionen, Serie, Ränge, Tageslimit
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

- Ökonomie nach den ersten Wochen anhand echter Zahlen nachjustieren
  (eingelöste Gutscheine je aktivem Gast, Anteil abgelaufener Codes)

- Backend mit Nutzerkonto, damit Coins geräteübergreifend gelten
- Serverseitige Ausstellung und Prüfung der Gutscheincodes (inklusive
  QR-Code für die Kasse), damit Codes nicht lokal erzeugt werden
- Filialauswahl und Anbindung an das Bestellsystem
- Bestenliste über alle Spieler, Wochen-Challenges und Push-Erinnerungen
- Rechtliches: Datenschutzerklärung, Impressum und Teilnahmebedingungen
