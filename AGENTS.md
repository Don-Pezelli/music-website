# The Music Method – Codex-Regeln

## 1. Allgemeine Arbeitsregeln

1. Ändere nur, was ausdrücklich beauftragt wurde. Bewahre bestehende Funktionen, Inhalte und Designs.
2. Prüfe betroffene Dateien und ihre Zusammenhänge vor der Bearbeitung.
3. Verwende bestehende Komponenten und Konventionen. Vermeide unnötige Duplikate.
4. Bevorzuge einfache, wartbare Lösungen.
5. Teste Änderungen, soweit möglich. Melde Fehler und Unsicherheiten.
6. Frage bei wesentlichen Unklarheiten nach, statt zu raten.
7. Fasse nach jeder Aufgabe die Änderungen kurz zusammen.

## 2. Gitarrennotation

- Standardstimmung: E–A–D–G–B–e (tief nach hoch).
- `E` bezeichnet die tiefe, `e` die hohe E-Saite.
- Format: `Saite Bundnummer [Tonname]`.
- Die Bundnummer steht ohne Präfix; `0` bedeutet Leersaite.
- Der Tonname ist optional und wird bei Bedarf automatisch berechnet.
- Verwende deutsche Tonnamen: H statt englisch B; deutsches B entspricht B♭.
- `B` als Saitenbezeichnung bezeichnet die H-Saite.
- `x` bedeutet gedämpfte Saite.
- Nicht angegebene Bünde bleiben unbestimmt; nichts eigenständig ergänzen.
- Bei mehrzeiligen Eingaben entspricht jede Zeile einer Gitarrensaite.

Beispiel:

```text
E 3
A 2
D 0
G 0
B 0
e 3
```

Ergebnis: G–H–D–G–H–G (G-Dur).

## 3. Design – Baustellentafel

- Verwende eine einheitliche, wiederverwendbare Baustellentafel nur dort, wo ein Kurs ausdrücklich als Baustelle gekennzeichnet werden soll.
- Die Tafel ist rot und gut sichtbar. Oben steht ein Baustellensymbol wie im Straßenverkehr.
- Darunter befindet sich ein weißes Schild mit schwarzer Schrift, das die noch ausstehenden Arbeiten konkret beschreibt.
- Zeige den gewichteten Gesamtfortschritt in Prozent und die aktuell bearbeiteten Entwicklungsphasen.
- Eine aufklappbare Detailansicht zeigt alle Entwicklungsphasen mit Gewichtung, Status und editierbaren Kommentaren.
- Mehrere Phasen dürfen gleichzeitig bearbeitet werden; es gibt keine vorgeschriebene Reihenfolge.
- Fortschritt, Status und Kommentare werden pro Kurs dauerhaft gespeichert. Verwende dafür die vorhandene Projektarchitektur; keine neue Speicherlösung ohne Prüfung einführen.
- Die Baustellentafel bleibt bis zur ausdrücklichen Freigabe sichtbar.

### Entwicklungsphasen und Gewichte

| Nr. | Phase | Gewicht |
| --- | --- | ---: |
| 1 | Zu erlernende Fähigkeit bestimmen | 5 % |
| 2 | Lernziel und Kursumfang eingrenzen | 5 % |
| 3 | Teilziele und Voraussetzungen bestimmen | 5 % |
| 4 | Kurszusammenfassung schreiben | 5 % |
| 5 | Kapitel und didaktische Reihenfolge festlegen | 10 % |
| 6 | Kapiteltexte ausarbeiten, Medien und Tools planen | 15 % |
| 7 | Notationen, Grafiken, Tools und Audiomaterial erstellen | 20 % |
| 8 | Kurs redigieren und Querverweise setzen | 10 % |
| 9 | Videomaterial produzieren, sofern vorgesehen | 10 % |
| 10 | Übungen und Lernzielkontrollen prüfen | 5 % |
| 11 | Kurs praktisch testen und überarbeiten | 5 % |
| 12 | Abschließende Qualitätskontrolle und Freigabe | 5 % |

### Fortschrittsberechnung

- Status je Phase: `offen` = 0 %, `in Arbeit` = 50 %, `abgeschlossen` = 100 % des Phasengewichts.
- Gesamtfortschritt = Summe der gewichteten Statuswerte; maximal 100 %.
- Nicht benötigte optionale Phasen werden als `entfällt` markiert und aus der Berechnung ausgeschlossen. Die verbleibenden Gewichte werden proportional auf 100 % normiert.
- Der Fortschritt wird ausschließlich aus gespeicherten Statuswerten berechnet. Codex darf Statuswerte nicht eigenmächtig ändern, sondern nur Änderungen vorschlagen oder auf ausdrücklichen Auftrag ausführen.
- Kommentare beeinflussen den Fortschritt nicht.

## 4. Dokumentation

- Halte abgeschlossene Änderungen kurz in `CHANGELOG.md` fest.
- Dokumentiere nur tatsächlich durchgeführte Änderungen.
- Vermeide ausführliche Protokolle und unnötige Wiederholungen.
- Lies das Änderungsprotokoll nur, wenn es für die aktuelle Aufgabe erforderlich ist.
