# Grundlagen assets

Source: Main/Deutsch/Einführung/Rhythmus Kurs 1 Grundlagen.pdf (5 pages).

All 11 raster images were extracted directly from PDF image streams, without resizing or lossy recompression. Original RGB pixels, alpha masks and ICC profiles are preserved in PNG files. Every output pixel was verified against the source. The downloadable PDF is an identical copy (SHA-256 verified).

| File | Original pixels | PDF object |
| --- | --- | --- |
| takt.png | 660 × 144 | 24 |
| vier-schlaege.png | 904 × 182 | 25 |
| ganze-note.png | 664 × 206 | 36 |
| halbe-noten.png | 670 × 202 | 37 |
| klang-und-zeit.png | 588 × 224 | 38 |
| viertelnoten.png | 662 × 202 | 51 |
| achtelnoten.png | 666 × 200 | 52 |
| ganze-pause.png | 918 × 212 | 62 |
| halbe-pausen.png | 1246 × 284 | 63 |
| viertelpausen.png | 1244 × 278 | 64 |
| achtelpausen.png | 1244 × 282 | 65 |

`uhr.svg` preserves the original vector clock path from page 3. The simple timeline on page 1 is represented as scalable inline SVG. Text from all five pages is transcribed as HTML in grundlagen.html, with spelling and grammar corrected.

## Sharp vector replacements

The website now uses eleven matching SVG diagrams instead of the PNGs. Original PNGs and the PDF remain unchanged as source references. Yellow/blue fields, beat counts, note/rest values and grouping follow the source; borders and typography are clean vector reconstructions, not pixel-identical tracings.

Musical symbols are **complete glyph outlines from Bravura Text**, supplied with the locally installed MuseScore 3. No music font needs to be installed by website visitors; all musical glyphs are SVG paths. The notation is not AI-generated. Bravura is by Steinberg Media Technologies; only outlines used in the diagrams are included, not the font software.

| Meaning | SMuFL glyph | Occurrences per diagram |
| --- | --- | --- |
| Whole note | U+E1D2 noteWhole | 1 |
| Half note, stem up | U+E1D3 noteHalfUp | 2 |
| Quarter note, stem up | U+E1D5 noteQuarterUp | 4 |
| Eighth note, stem up | U+E1D7 note8thUp | 8 |
| Whole rest, hanging below line | U+E4E3 restWhole | 1 |
| Half rest, sitting on line | U+E4E4 restHalf | 2 |
| Quarter rest | U+E4E5 restQuarter | 4 |
| Eighth rest | U+E4E6 rest8th | 8 |

Mappings checked against the official SMuFL tables:
- https://smufl.formats.music/latest/tables/individual-notes.html
- https://w3c.github.io/smufl/latest/tables/rests.html

Rebuild using `ruby -E UTF-8 scripts/build-notation.rb` from the Design directory. The glyph outlines are retained in `scripts/bravura-glyphs.json`. Validation checks SVG XML, glyph identity and counts, and asset links; a rendered contact sheet was used for visual inspection.
