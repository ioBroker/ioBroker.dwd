# DWD-Widgets

Der `dwd`-Adapter bringt neben dem Adapter selbst zwei Oberflächen mit:

| Wo | Was |
| --- | --- |
| **vis / vis-2** | das Widget `DWD-Warnungen` im Widget-Set `dwd` |
| **ioBroker.devices** | die Kachel `DWD-Warnung` fürs Dashboard |

Beide zeigen dieselben Daten und werden gleich konfiguriert: Instanz auswählen und die Nummer der
Warnung angeben. Alles andere ist optional.

Die Instanzeinstellungen zeigen zusätzlich die gerade aktiven Warnungen, siehe
[Die Instanzeinstellungen](#die-instanzeinstellungen).

---

## Die Warnungen des Adapters

Der Adapter schreibt die Warnungen der eingestellten Region in nummerierte Kanäle:

```
dwd.0.warning0.headline      Amtliche WARNUNG vor WINDBÖEN
dwd.0.warning0.text          WINDBÖEN
dwd.0.warning0.description   Es treten Windböen mit Geschwindigkeiten ...
dwd.0.warning0.instruction   Handlungsempfehlung des DWD, oft leer
dwd.0.warning0.severity      0, 1 … 4, 9, 11, 19, 49, 50
dwd.0.warning0.begin         Beginn, Millisekunden seit Epoch
dwd.0.warning0.end           Ende, kann leer sein
dwd.0.numberOfWarnings       wie viele Warnungen gerade aktiv sind
```

**`warning0` ist immer die schwerste gerade aktive Warnung.** Die Liste wird bei jedem Lauf neu
sortiert — ein Widget auf `warning0` zeigt also stets die wichtigste Warnung und bleibt nicht auf
einem bestimmten Ereignis stehen. Wie viele `warning<n>`-Kanäle es gibt, legt die
Adapter-Konfiguration fest („Anzahl der Warnmeldungen", 1 … 10).

Gibt es weniger Warnungen als Kanäle, werden die übrigen Kanäle geleert. Die Widgets zeigen dann
„Keine Warnung".

### Die Farbe

Die Hintergrundfarbe kommt aus `severity` und ist in beiden Widgets und im alten
vis-1-Widget-Set dieselbe:

| severity | Bedeutung | Farbe |
| --- | --- | --- |
| 0 | keine | — |
| 1 | Wetterwarnung | `#ffeb3b` |
| 2 | Warnung vor markantem Wetter | `#fb8c00` |
| 3 | Unwetterwarnung | `#e53935` |
| 4 | Warnung vor extremem Unwetter | `#880e4f` |
| 9 | Hitzewarnung | `#c99afe` |
| 11 | keine Warnung | `#c9f` |
| 19 | UV-Warnung | `#fe68fe` |
| 49 | starke Hitze | `#e966fe` |
| 50 | extreme Hitze | `#f933fe` |

![Schweregrad-Farben](../img/severity-colors.svg)

*Gerendert, mit der Textfarbe, die jeder Hintergrund bekommt.*

Diese Farben tragen die Bedeutung der Warnung und folgen deshalb **nicht** dem hellen/dunklen Theme
— `#880e4f` bleibt in beiden `#880e4f`. Nur die Textfarbe darauf wird automatisch gewählt (schwarz
oder weiß), damit der Text in jedem Theme lesbar bleibt.

---

## vis-2: das Widget `DWD-Warnungen`

Widget-Set `dwd`, Widget `DWD-Warnungen`.

![Das Widget in beiden Layouts](../img/vis2-widget.svg)

### Einstellungen

| Einstellung | Bedeutung |
| --- | --- |
| **Layout** | `Vollständige Warnung` — Überschrift, Beschreibung, Zeitraum und Handlungsempfehlung. `Kompakt` — eine Zeile mit dem kurzen Warntext. |
| **Instanz** | welche `dwd`-Instanz gelesen wird |
| **Warnung** | Nummer des `warning<n>`-Kanals. `0` ist die schwerste. |
| **Zeitformat** | wie Beginn und Ende ausgegeben werden. Platzhalter: `YYYY`, `YY`, `MM`, `DD`, `hh`, `mm`, `ss`. Vorgabe `DD.MM hh:mm`. Nur im vollständigen Layout. |
| **Handlungsempfehlung anzeigen** | zeigt `instruction` — die Empfehlung des DWD. Sie ist oft leer. Nur im vollständigen Layout. |
| **Ohne Karte** / **Name** | die übliche vis-2-Karte um das Widget |

Unter **Objekt-IDs** gibt es noch einen Schalter:

| Einstellung | Bedeutung |
| --- | --- |
| **Objekt-IDs manuell setzen** | Schaltet die Ableitung aus Instanz und Warnungsnummer ab und lässt das Widget auf beliebige sechs Datenpunkte zeigen. Nur nötig, wenn die Datenpunkte nicht von einer `dwd`-Instanz kommen. |

### Umstieg von vis-1

Das alte Widget-Set hatte zwei Templates, `tplDwdAdapter` (groß) und `tplDwdAdapterSmall`
(kompakt). Das vis-2-Widget ist **ein** Widget, die beiden Varianten sind die Einstellung `Layout`.

- Views mit **`tplDwdAdapter`** übernimmt das vis-2-Widget automatisch — es registriert sich unter
  derselben Template-ID. Die bereits eingetragenen Objekt-IDs werden weiter benutzt, das Widget
  zeigt also dasselbe wie vorher. Von Hand ist nichts zu ändern.
- Views mit **`tplDwdAdapterSmall`** laufen mit dem weiterhin mitgelieferten vis-1-Template weiter.
  Wer sie auf das vis-2-Widget umstellen will, platziert ein `DWD-Warnungen`-Widget und setzt
  `Layout` auf `Kompakt`.

> **Hinweis zum alten Vorgabewert:** im vis-1-Widget war das Feld für die Handlungsempfehlung mit
> `dwd.0.warning.hint` vorbelegt. Diesen Datenpunkt gibt es nicht — der Adapter schreibt
> `dwd.0.warning.instruction`. Wenn bei dir die Handlungsempfehlung immer leer blieb, war das der
> Grund. Das vis-2-Widget benutzt den richtigen Datenpunkt, wenn es die IDs selbst ableitet.

---

## ioBroker.devices: die Kachel `DWD-Warnung`

Im Dashboard von `ioBroker.devices` das Widget **DWD-Warnung** hinzufügen.

![Die Kachel in ihren drei Größen](../img/devices-tiles.svg)

### Einstellungen

| Einstellung | Bedeutung |
| --- | --- |
| **Instanz** | welche `dwd`-Instanz gelesen wird |
| **Warnung** | Nummer des `warning<n>`-Kanals. `0` ist die schwerste. |
| **Zeitformat** | wie Beginn und Ende ausgegeben werden, gleiche Platzhalter wie oben |
| **Zeitraum anzeigen** | zeigt Beginn und Ende der Warnung |
| **Handlungsempfehlung anzeigen** | zeigt die Empfehlung des DWD, standardmäßig aus |
| **Symbol** / **Name** | die übliche Kachel-Kopfzeile |

### Die drei Größen

Die Kachel passt sich der Größe an, die sie im Dashboard bekommt:

- **1×1** — Symbol und der kurze Warntext.
- **2×0,5** — ein Streifen: Symbol, Warntext in der Schweregrad-Farbe, Zeitraum.
- **2×1 und 2×2** — die Titelzeile mit dem Zeitraum, darunter Überschrift, Beschreibung und, wenn
  eingeschaltet, die Handlungsempfehlung.

Solange eine Warnung anliegt, gilt die Kachel als „aktiv" und nimmt die Schweregrad-Farbe als
Akzent an — eine aktive Warnung ist im Dashboard also zu sehen, ohne den Text zu lesen.

---

## Die Instanzeinstellungen

Unter der Konfiguration listen die Instanzeinstellungen die Warnungen auf, die für die eingestellte
Region gerade aktiv sind:

![Die aktuellen Warnungen in den Instanzeinstellungen](../img/config-warnings.svg)

Die Werte kommen direkt aus den Datenpunkten, **nicht** aus dem Adapterprozess — der Adapter läuft im
Schedule-Modus und ist nur ein paar Sekunden alle fünf Minuten am Leben. Alles, was die laufende
Instanz fragen müsste, liefe deshalb meistens ins Timeout.

Eine Warnung mit leerer Überschrift wird ausgeblendet, ebenso die `warning<n>`-Kanäle, die es wegen
einer kleineren „Anzahl der Warnmeldungen" gar nicht gibt. Gibt es überhaupt keine Warnung, steht
dort eine einzelne Zeile. Die Liste aktualisiert sich von selbst, sobald der Adapter neue Werte
schreibt — der Dialog muss nicht neu geöffnet werden.

---

## Aus den Quellen bauen

```bash
npm run build            # Adapter + beide Oberflächen
npm run build:widgets    # nur das vis-2-Widget-Set -> widgets/dwd/
npm run build:devices    # nur die devices-Kachel   -> admin/dm-widgets/
```

Die Quellen liegen in `src-widgets/` (vis-2) und `src-devices/` (devices-Dashboard). Beide sind
React + TypeScript, gebaut mit vite und Module Federation. Die Komponentennamen und die URL stehen
zusätzlich in `io-package.json` unter `common.visWidgets` bzw. `common.deviceWidgets` — ein neues
Widget bedeutet also, `exposes` in der vite-Konfiguration **und** diesen Block anzufassen.
