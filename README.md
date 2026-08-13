# Loco Chicken Deutschland – Gaming App

Mobile Gaming- und Loyalty-App für Loco Chicken Deutschland: Gäste spielen
**acht Küchenspiele**, verdienen dabei **Loco Coins** und tauschen diese gegen
Gutscheine ein, die im Restaurant vorgezeigt werden.

Die App ist eine installierbare Web-App (PWA) ohne Build-Schritt und ohne
Laufzeit-Abhängigkeiten – reines HTML, CSS und modernes JavaScript (ES-Module).
Gestaltet ist die App wie der Laden am Abend: dunkler Tresen, gefliste Wand,
gebürsteter Stahl, warmes Licht von oben, Leuchtschrift in Gelb und Rot und
das rot-weiße Karo der Verpackung als wiederkehrendes Detail. Flächen
arbeiten mit Verläufen, Tiefe und Glanzkanten statt mit Comic-Konturen; die
Ware im Spiel bekommt Kruste, Krümel und Glanzlicht.

## Schnellstart

```bash
npm start            # startet einen lokalen Server auf http://localhost:5173
npm test             # führt die Unit-Tests der Spiel-Ökonomie aus
npm run build:preview # baut dist/preview.html als teilbare Einzeldatei
```

Für Node ab Version 20. Alternativ genügt jeder statische Webserver, der das
Projektverzeichnis ausliefert (ein Öffnen der `index.html` per `file://`
funktioniert wegen der ES-Module nicht).

## Markenrecherche

Grundregel im Projekt: **In der App taucht nur auf, was es bei Loco Chicken
wirklich gibt.** Alle Produktnamen und Angaben liegen in `src/js/brand.js`,
und `test/brand.test.mjs` bricht den Build ab, wenn Belohnungen oder Spiele
etwas verwenden, das dort nicht steht.

### Was belegt ist

| Thema | Stand |
| --- | --- |
| Marke | Crispy-Fried-Chicken-Konzept von Luciano, betrieben mit Lanch; gestartet als virtuelle Liefermarke in rund 100 Städten |
| Läden | inzwischen auch feste Standorte, u. a. Berlin Friedrichshain (Frankfurter Allee 60) und Düsseldorf |
| Positionierung | 100 % halal, extra large Wings und Filets |
| Signature Flavours | Hot Chilli, Garlic Cheese, White Truffle, Korean, Lemon Pepper – als Spice Rub im Shake Bucket |
| Bucket | Signature Shake Bucket: Wings und Filets, 2 Flavours, 1 Side, 1 Dip |
| Sides | Crispy Fries, Potato Pops, Onion Rings, BBQ Waffles |
| Dips | White Truffle Mayo, Harissa Mayo, Rosemary Ketchup, Loco's Hot Chili Sauce |
| Burger | Classic Cheese und Chili Cheese |
| High Protein | Kooperation mit ESN: Designer Whey in der Sorte Chicken Waffle, 23 g Protein und 114 kcal je Portion (30 g auf 200 ml); dazu Vanilla-Sample und Shaker zu bestimmten Menüs |
| Kreatin-Flavour | Lemon Pepper Flavour mit 3 g Kreatin pro Tütchen – ein Produkt von Loco Chicken, laut Fachpresse **nicht** Teil der ESN-Kooperation |

Quellen: [Über uns – Loco Chicken](https://loco-chicken.com/about-us/),
[Loco Chicken bei Lieferando](https://www.lieferando.de/lieferdienst/ketten/loco-chicken),
[Wolt Mannheim](https://wolt.com/en/deu/mannheim/restaurant/loco-chicken-mannheim),
[Tageskarte zur ersten Filiale](https://www.tageskarte.io/gastronomie/detail/einst-virtuelle-marke-loco-chicken-eroeffnet-filiale-in-duesseldorf.html),
[Stack3d zur ESN-Kooperation](https://www.stack3d.com/2026/01/loco-chicken-x-esn-creatine-seasoning/),
[Stack3d zur Einordnung des Kreatin-Flavours](https://www.stack3d.com/2026/01/loco-chicken-makes-lemon-pepper-creatine.html),
[Stack3d zum Chicken-Waffle-Whey](https://www.stack3d.com/2026/04/esn-loco-fried-chicken-waffles-designer-whey-protein.html).

### Was weiterhin Platzhalter ist

- `assets/icon.svg` und `assets/logo.svg` sind Nachbauten des Badge-Logos.
- Die Hausschrift ist eine fette kursive Systemschrift (`--display`).
- Preise und Mindestbestellwerte der Gutscheine sind Vorschläge, keine
  abgestimmten Konditionen.

Der Netzwerkzugang dieser Entwicklungsumgebung lässt nur wenige Domains zu;
die Recherche stützt sich deshalb auf Suchergebnisse, nicht auf vollständig
abgerufene Seiten. Vor dem Launch sollten Sortiment, Nährwerte und
Gutscheinbedingungen einmal gegen die offizielle Karte geprüft werden.

## High Protein in der App

Die Protein-Schiene taucht an drei Stellen auf, jeweils mit den echten Zahlen:

1. **Karte auf der Startseite** mit dem Designer Whey Chicken Waffle
   (23 g Protein, 114 kcal je Portion) und dem Hinweis auf das Lemon Pepper
   Flavour mit 3 g Kreatin.
2. **Zwei Belohnungen** – der Loco × ESN Shaker (700 Coins) und eine Portion
   Designer Whey Chicken Waffle (1.100 Coins), beide mit „High Protein"
   gekennzeichnet.
3. **Im Spiel "Bestellung"** steht der Shaker mit im Regal, weil er zu
   bestimmten Menüs dazugehört.

Bewusst getrennt formuliert: Der Whey ist die ESN-Kooperation, das
Kreatin-Flavour ist ein eigenes Produkt. Ein Test hält diese Unterscheidung
fest, damit sie beim Umformulieren nicht verloren geht.

## Die acht Spiele

Jedes Spiel hat eine eigene Mechanik – wem eines zu langweilig wird, wechselt.
Gemeinsam sind ihnen nur der Rahmen und die Wertung.

| Spiel | Können | Worum es geht |
| --- | --- | --- |
| **Fritteuse** | Timing | Wings, Filets und Onion Rings im goldenen Moment ziehen |
| **Bestellung** | Gedächtnis | Reihenfolge merken und nachtippen, sie wird länger und kürzer gezeigt |
| **Sortieren** | Tempo | Chicken nach links, Sides nach rechts – im freien Fall |
| **Chili-Alarm** | Reaktion | Chicken aus neun Luken greifen, Chilis liegen lassen |
| **Burger-Stapel** | Präzision | Den Chili Cheese Burger Schicht für Schicht bauen |
| **Dip-Meter** | Nerven | Den Zeiger in der schrumpfenden Zone stoppen |
| **Kasse** | Kopfrechnen | Das richtige Wechselgeld unter Zeitdruck wählen |
| **Fließband** | Rhythmus | Jedes Teil genau an der Marke abgreifen |

### In allen Spielen gleich

| Element | Regel |
| --- | --- |
| Sauberer Zug | volle Punkte × Combo, die Combo steigt bis x8 |
| Ungenauer Zug | kaum Punkte, die Combo fällt auf x1 zurück |
| Fehler | drei davon beenden die Runde |
| Serie | alle 6 sauberen Züge in Folge gibt es 300 Bonuspunkte |
| Tempo | jedes Spiel wird mit jedem bearbeiteten Objekt schneller |

Wichtig für die Ökonomie: **In keinem Spiel bringt Nichtstun oder wildes
Tippen Punkte.** Jedes Spiel setzt Untätigkeit unter Druck – verpasste Ware,
Zugzwang-Balken oder ablaufende Zeitfenster – und jede unsaubere Aktion
zerstört die Combo. Ein automatisierter Test spielt alle acht Spiele mit
zufälligen Tipps: Sie enden zuverlässig mit drei Fehlern und nahezu null
Punkten.

### Architektur

`src/js/games/base.js` enthält alles, was jedes Spiel gleich braucht:
Spielschleife, Auflösung, virtuelles Koordinatensystem, Eingaben, Partikel,
Combo-Buchführung und die Übergabe an die App. Ein Spiel beschreibt nur noch
seine eigene Mechanik über `setup`, `update`, `render` und `onPointer` und
meldet Ergebnisse über `hit()` und `fail()`. Ein neues Spiel ist dadurch eine
Datei plus ein Eintrag in `src/js/modes.js`.

Alle Grafiken werden prozedural auf ein Canvas gezeichnet; die Speisen-Icons
liegen gemeinsam in `src/js/games/icons.js`, damit ein Filet überall gleich
aussieht.

## Engagement-Mechaniken

Die Auswahl orientiert sich daran, was in kurzformatig sozialisierten
Zielgruppen nachweislich trägt – übernommen wurde nur, was zur Marke passt
und die Ökonomie nicht aufweicht.

### Was übernommen wurde

| Mechanik | Wirkprinzip | Umsetzung |
| --- | --- | --- |
| **Kurze Runden mit Sofort-Neustart** | Die Entscheidung "noch eine Runde" darf keine Reibung haben. | Ergebnisbildschirm mit "Sofort nochmal" als erstem Button, Enter/Leertaste startet direkt. Die Erklärung vor der Runde erscheint nur einmal je Sitzung. |
| **Beinahe-Treffer** | Knapp verfehlt motiviert stärker als klar verfehlt – vorausgesetzt, man sieht, wie knapp es war. | Jeder verfrühte Zug zeigt den Abstand in Sekunden ("0,18 s zu früh"), das Rundenergebnis nennt den knappsten Fehlversuch. |
| **Sichtbare Könnenssteigerung** | Fortschritt muss spürbar sein, auch ohne Belohnung. | Combo bis x8, Bonus für saubere Serien, fünf Ränge von der Küchenhilfe zur Loco Legende, eigener Bestwert je Spiel. |
| **Tagesserie** | Verlustaversion bindet stärker als Belohnung: Eine Serie will man nicht reißen lassen. | Serienzähler auf der Startseite, deutlicher Hinweis, wenn heute noch nicht gespielt wurde. Bewusst **ohne** Coin-Auszahlung. |
| **Tagesmissionen** | Ein frisches Ziel pro Tag, unabhängig vom Punktestand – und etwas, worüber man reden kann. | Drei Aufgaben täglich, aus dem Datum abgeleitet und damit für alle Geräte gleich. Eine davon belohnt das Ausprobieren verschiedener Spiele. |
| **Auswahl gegen Sättigung** | Ein einzelnes Spiel nutzt sich ab; die Wahl hält die Gewohnheit am Leben. | Acht Spiele mit eigenen Bestwerten, jederzeit wechselbar. |
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
Kanal, sondern nur ein anderer Weg zum selben Tageskontingent von 10 Coins.
Serie und Rang zahlen überhaupt nichts aus – sie wirken über Status. Ein
Test hält das fest: Missionen bringen bei ausgeschöpftem Tageslimit null
Coins.

## Loyalty-Mechanik

Die Ökonomie ist bewusst streng ausgelegt: Ein Gutschein soll ein Grund zum
Wiederkommen sein, kein Automatismus.

| Element | Regel |
| --- | --- |
| Coins | 4.000 Spielpunkte = 1 Loco Coin (wird abgerundet) |
| Tagesobergrenze | höchstens 10 erspielte Coins pro Kalendertag |
| Tagesbonus | +2 Coins fürs Reinschauen (zählt nicht gegen die Obergrenze) |
| Missionen | 3 Aufgaben täglich, je 2 Coins – innerhalb der Obergrenze |
| Offene Gutscheine | nur einer gleichzeitig |
| Gültigkeit | 14 Tage ab Einlösung |
| Code | Format `LOCO-XXXX-XXXX`, ohne verwechselbare Zeichen (I, O, 0, 1) |

### Belohnungen

| Belohnung | Coins | Bedingung |
| --- | --- | --- |
| Dip nach Wahl | 150 | zu jeder Bestellung |
| Crispy Fries | 300 | ab 10 € Bestellwert |
| Crunchy Filets | 550 | ab 15 € Bestellwert |
| Loco × ESN Shaker | 700 | ab 15 € Bestellwert |
| Chili Cheese Burger für 1 € | 900 | ab 15 € Bestellwert |
| Designer Whey Chicken Waffle | 1.100 | ab 15 € Bestellwert |
| 20 % auf den Shake Bucket | 1.500 | ab 25 € Bestellwert |

### Warum der Laden dabei nicht draufzahlt

Vier Bremsen greifen ineinander:

1. **Punkte gibt es nur für Können.** Spielzeit allein bringt nichts – Punkte
   entstehen ausschließlich durch perfekt getroffene Züge. Eine Anfängerrunde
   liegt bei ein paar hundert Punkten, eine sehr gute bei einigen tausend.
2. **Hoher Umrechnungskurs.** 4.000 Punkte pro Coin. Eine durchschnittliche
   Runde bringt 0–2 Coins.
3. **Tagesobergrenze.** Mehr als 10 erspielte Coins pro Tag sind nicht
   möglich, Dauergrinden lohnt also nicht – auch nicht über acht Spiele
   hinweg, denn die Obergrenze gilt für alle gemeinsam. Punkte, Bestwerte und
   Ränge zählen weiter, nur Coins nicht.
4. **Mindestbestellwert.** Außer dem Dip hängt jede Belohnung an einem
   Bestellwert – hinter jedem eingelösten Gutschein steht Umsatz.

In der Praxis heißt das: Wer fast täglich spielt, kommt nach rund zwei bis
drei Wochen zum ersten Dip; der Bucket-Rabatt liegt bei mehreren Monaten. Wer
nur gelegentlich spielt, entsprechend länger. Höchstmögliche Ausschüttung sind
12 Coins pro Tag (10 erspielt plus 2 Tagesbonus) – mehr geht selbst bei
stundenlangem Spielen nicht.

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
src/js/game.js          Fabrik: erzeugt das Spiel zum gewählten Modus
src/js/modes.js         Katalog der acht Spiele (nur Daten, testbar)
src/js/games/base.js    gemeinsame Basis aller Spiele
src/js/games/icons.js   Speisen-Icons für alle Spiele
src/js/games/*.js       die acht Spielmechaniken
src/js/brand.js         Markenfakten: Produkte, Flavours, Dips, Protein
src/js/economy.js       Coins, Belohnungen, Gutscheine, Serie, Ränge
src/js/missions.js      Tagesmissionen (frei von Browser-APIs, testbar)
src/js/sharecard.js     Ergebniskarte 9:16 zum Teilen
src/js/storage.js       Persistenz im localStorage
src/js/audio.js         synthetisierte Sounds via Web Audio API
scripts/serve.mjs       Entwicklungsserver ohne Abhängigkeiten
scripts/build-preview.mjs  baut die Vorschau als Einzeldatei
test/economy.test.mjs   Unit-Tests der Spiel-Ökonomie
test/missions.test.mjs  Unit-Tests für Missionen, Serie, Ränge, Tageslimit
test/modes.test.mjs     prüft Vollständigkeit und Eigenständigkeit der Spiele
test/brand.test.mjs     stellt sicher, dass nur echte Produkte vorkommen
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
