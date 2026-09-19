# Kapitel 3 — Pausen

Source: `Main/Deutsch/Kapitel 3/Rhythmus Kurs 1 Kapitel 3.pdf`, 22 pages.

The website page `../../kapitel-3.html` contains all five lessons, reading exercises, listening tasks, available solutions, final assignments and chapter goals. Chapter 2 links forward to it, and the course overview and homepage reflect three available chapters.

## Source fidelity

All 65 embedded images were extracted losslessly, retaining original dimensions, alpha masks where present and embedded color profiles. The downloadable PDF is a byte-identical copy. Twenty-eight unique QR codes are decoded in `links.json` and reproduced as exact SVG modules. Their 6,722,800 original black/white pixels were verified. The original image metadata and page references are in `manifest.json`.

Twenty-six complete rhythm diagrams are redrawn as SVG using the course's existing Bravura glyph outlines, including correct whole, half, quarter and eighth rests. `score-data.json` records notes, rests and beam groupings. Rebuild them with `ruby -E UTF-8 scripts/build-chapter-3-scores.rb` from Design. There are 79 bars: 78 contain four beats; the error-finding task 3.1 intentionally contains **five beats under a 4/4 signature**, as in the source. It must not be automatically corrected. The small signature patch (source object 238) is incorporated into that SVG's signature.

The four colored pause diagrams use the existing introduction SVGs. The mute illustration remains its original PNG. Individual rest glyphs replace source objects 208 and 209 and the font-based quarter/eighth rest symbols. The three deliberately incomplete exercises (objects 222–224) remain their full-resolution original PNGs, preserving every blank and partial symbol.

## Known gaps retained from the PDF

- RESOLVED: Lesson 2, hearing task 3 now includes an embedded player and links to the user-provided audio file: https://drive.google.com/file/d/1f0JGZlb16OD2MNkFgy7mHlNB3qMkfjsU/view?usp=drive_link. The incorrect duplicate QR is removed from this task; hearing task 1 retains its original link and QR.
- RESOLVED: Lesson 3, hearing task 3 now links to the user-provided audio file: https://drive.google.com/file/d/1le3JeqZ-lU-msE2D8BB1_gh2ZSwCvuqB/view?usp=drive_link. The missing-audio notice is removed; the supplied solution (object 126) is unchanged.
- Lesson 4, reading exercise 4 has **no score or solution**. Its number and a concise missing-content notice are retained; the remaining exercises keep their original numbering.
- Lesson 5, task 3.1 has no audio link; it can be solved by counting the printed durations. Tasks 3.2 and 3.3 use objects **242 and 241**, respectively, based on their positions on PDF page 20.

No missing recordings or exercises were invented. External links are transcribed from the supplied QR codes; remote audio contents and login requirements were not independently verified.

## Editorial treatment

Minor grammar/spelling fixes and continuous step numbering improve reading. The three white-text solutions on PDF page 20 are readable inside native closed-by-default solution disclosures. Song labels remain the provided abbreviations (LDDLM, Nirvana – CAYR, Bob Marley – CYBL), without guessing expanded titles.

The five rest-duration questions gain optional numeric answer fields and simple arithmetic checks (4, 4, 6, 4, 2). Their symbols follow the written question: questions 2 and 3 display two and three quarter rests, respectively, instead of the single-symbol shorthand in the draft PDF. These checks are derived from the stated durations, not claimed as extra PDF solutions.

## Validation

Checked all source figure roles, all 28 QR destinations, glyph sequences, beam groups, correct 4/4 totals and the intentional 5-beat mistake. Verified 397 local links/anchors across the website, intact PDF and exact QR modules. Rendered all score SVGs for visual comparison with the original. Native disclosure, checkbox and number-field behavior is checked in the browser; mobile/tablet layouts use separate viewport frames.
