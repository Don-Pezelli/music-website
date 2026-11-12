(() => {
  const flipButton = document.querySelector('[data-fretboard-flip]');
  const rootsButton = document.querySelector('[data-fretboard-roots]');
  const diagram = document.querySelector('.pentatonic-fretboard-img');
  const caption = document.querySelector('[data-fretboard-caption]');
  const fullSizeLink = diagram?.closest('a');
  if (flipButton && rootsButton && diagram && caption && fullSizeLink) {
  let lowEAtBottom = true;
  let rootMode = 'both';
  const files = {
    both: ['assets/gitarre/pentatonik-c-dur-griffbrett-beide-positionen.svg', 'assets/gitarre/pentatonik-c-dur-griffbrett-beide-positionen-umgedreht.svg'],
    dur: ['assets/gitarre/pentatonik-c-dur-griffbrett-dur-positionen.svg', 'assets/gitarre/pentatonik-c-dur-griffbrett-dur-positionen-umgedreht.svg'],
    moll: ['assets/gitarre/pentatonik-c-dur-griffbrett-moll-positionen.svg', 'assets/gitarre/pentatonik-c-dur-griffbrett-moll-positionen-umgedreht.svg']
  };
  const descriptions = {
    both: 'Rot markiert den Dur-Grundton C, Blau den Moll-Grundton A.',
    dur: 'Nur der Dur-Grundton C ist rot hervorgehoben.',
    moll: 'Nur der Moll-Grundton A ist violett hervorgehoben.'
  };
  const nextMode = { both: 'dur', dur: 'moll', moll: 'both' };
  const nextLabel = { both: 'Nur Dur-Grundton anzeigen', dur: 'Nur Moll-Grundton anzeigen', moll: 'Beide Grundtöne anzeigen' };

  function update() {
    const source = files[rootMode][Number(lowEAtBottom)];
    diagram.src = source;
    fullSizeLink.href = source;
    diagram.alt = `Gitarrengriffbrett der C-Dur-Pentatonik. ${descriptions[rootMode]} Die tiefe E-Saite liegt ${lowEAtBottom ? 'unten' : 'oben'}.`;
    caption.textContent = `C-Dur/A-Moll-Pentatonik: ${descriptions[rootMode]} Die tiefe E-Saite liegt ${lowEAtBottom ? 'unten' : 'oben'}.`;
    flipButton.textContent = `Tiefe E-Saite nach ${lowEAtBottom ? 'oben' : 'unten'} anzeigen`;
    flipButton.setAttribute('aria-pressed', String(lowEAtBottom));
    rootsButton.textContent = nextLabel[rootMode];
    rootsButton.setAttribute('aria-label', `Grundtonanzeige wechseln; aktuell ${rootMode === 'both' ? 'Dur und Moll' : rootMode === 'dur' ? 'nur Dur' : 'nur Moll'}`);
  }

  flipButton.addEventListener('click', () => {
    lowEAtBottom = !lowEAtBottom;
    update();
  });
  rootsButton.addEventListener('click', () => {
    rootMode = nextMode[rootMode];
    update();
  });
  }

  const lessonFlipButton = document.querySelector('[data-fretboard-flip-lesson]');
  const lessonChordButton = document.querySelector('[data-fretboard-chord]');
  const lessonDiagram = document.querySelector('[data-fretboard-image-lesson]');
  const lessonCaption = document.querySelector('[data-fretboard-caption-lesson]');
  const lessonLink = lessonDiagram?.closest('a');
  if (lessonFlipButton && lessonChordButton && lessonDiagram && lessonCaption && lessonLink) {
    let lessonLowEAtBottom = true;
    let lessonChordMode = false;
    const lessonFiles = {
      notes: [
        'assets/gitarre/pentatonik-c-dur-griffbrett-dur-grundton.svg',
        'assets/gitarre/pentatonik-c-dur-griffbrett-dur-grundton-umgedreht.svg'
      ],
      chord: [
        'assets/gitarre/pentatonik-c-dur-griffbrett-dur-dreiklang.svg',
        'assets/gitarre/pentatonik-c-dur-griffbrett-dur-dreiklang-umgedreht.svg'
      ]
    };
    function updateLessonDiagram() {
      const source = lessonFiles[lessonChordMode ? 'chord' : 'notes'][Number(lessonLowEAtBottom)];
      lessonDiagram.src = source;
      lessonLink.href = source;
      lessonDiagram.alt = lessonChordMode
        ? `Ganzes Griffbrett der C-Dur-Pentatonik mit C als rotem Grundton, E als grünem Ton und G als blauem Ton. Rote Linien verbinden die Akkordformen. Die tiefe E-Saite liegt ${lessonLowEAtBottom ? 'unten' : 'oben'}.`
        : `Ganzes Griffbrett der C-Dur-Pentatonik mit markiertem Dur-Grundton C, der Terz E und der Quinte G. Die tiefe E-Saite liegt ${lessonLowEAtBottom ? 'unten' : 'oben'}.`;
      lessonCaption.textContent = lessonChordMode
        ? 'Der C-Dur-Grundakkord besteht aus Grundton (1), Terz (3) und Quinte (5). C bleibt rot, E grün und G blau. Rote Linien verbinden die Töne der E-Dur-Barreform in Position 1 ab Bund 8, der D-Form auf G12, B13 und hoher E12 der nächsten Form auf A15, D14 und G12'
        : 'C-Dur-Pentatonik: Rot markiert die Dur-Grundtöne C, Violett die Terz E, Grün die Quinte G. Moll-Grundtöne sind nicht hervorgehoben.';
      lessonFlipButton.textContent = `Tiefe E-Saite nach ${lessonLowEAtBottom ? 'oben' : 'unten'} anzeigen`;
      lessonFlipButton.setAttribute('aria-pressed', String(lessonLowEAtBottom));
      lessonChordButton.textContent = lessonChordMode ? 'Einzelne Töne anzeigen' : 'Dur-Grundakkord anzeigen';
      lessonChordButton.setAttribute('aria-pressed', String(lessonChordMode));
    }
    lessonFlipButton.addEventListener('click', () => {
      lessonLowEAtBottom = !lessonLowEAtBottom;
      updateLessonDiagram();
    });
    lessonChordButton.addEventListener('click', () => {
      lessonChordMode = !lessonChordMode;
      updateLessonDiagram();
    });
  }

  const numberFlipButton = document.querySelector('[data-fretboard-flip-numbers]');
  const numberChordButton = document.querySelector('[data-fretboard-chord-numbers]');
  const labelModeButton = document.querySelector('[data-fretboard-labels]');
  const numberDiagram = document.querySelector('[data-fretboard-image-numbers]');
  const numberCaption = document.querySelector('[data-fretboard-caption-numbers]');
  const numberLink = numberDiagram?.closest('a');
  if (numberFlipButton && numberChordButton && labelModeButton && numberDiagram && numberCaption && numberLink) {
    let numberLowEAtBottom = true;
    let numberChordMode = false;
    let numberLabelMode = true;
    const numberFiles = {
      names: {
        notes: [
          'assets/gitarre/pentatonik-c-dur-griffbrett-dur-grundton.svg',
          'assets/gitarre/pentatonik-c-dur-griffbrett-dur-grundton-umgedreht.svg'
        ],
        chord: [
          'assets/gitarre/pentatonik-c-dur-griffbrett-dur-dreiklang.svg',
          'assets/gitarre/pentatonik-c-dur-griffbrett-dur-dreiklang-umgedreht.svg'
        ]
      },
      degrees: {
        notes: [
          'assets/gitarre/pentatonik-c-dur-griffbrett-dur-grundton-stufen.svg',
          'assets/gitarre/pentatonik-c-dur-griffbrett-dur-grundton-stufen-umgedreht.svg'
        ],
        chord: [
          'assets/gitarre/pentatonik-c-dur-griffbrett-dur-dreiklang-stufen.svg',
          'assets/gitarre/pentatonik-c-dur-griffbrett-dur-dreiklang-stufen-umgedreht.svg'
        ]
      }
    };
    function updateNumberDiagram() {
      const view = numberLabelMode ? 'degrees' : 'names';
      const source = numberFiles[view][numberChordMode ? 'chord' : 'notes'][Number(numberLowEAtBottom)];
      numberDiagram.src = source;
      numberLink.href = source;
      numberDiagram.alt = numberLabelMode
        ? `C-Dur-Pentatonik mit Tonstufenzahlen: C=1, D=2, E=3, G=5, A=6. Die tiefe E-Saite liegt ${numberLowEAtBottom ? 'unten' : 'oben'}.${numberChordMode ? ' Der C-Dur-Grundakkord aus 1, 3 und 5 ist zusätzlich verbunden.' : ''}`
        : `C-Dur-Pentatonik mit Notennamen C, D, E, G und A. Die tiefe E-Saite liegt ${numberLowEAtBottom ? 'unten' : 'oben'}.${numberChordMode ? ' Der C-Dur-Grundakkord aus C, E und G ist zusätzlich verbunden.' : ''}`;
      numberCaption.textContent = numberChordMode
        ? numberLabelMode
          ? 'C-Dur-Pentatonik in Tonstufen: C=1, D=2, E=3, G=5, A=6. Die Akkordtöne 1 (C), 3 (E) und 5 (G) sind zusätzlich als Akkordformen verbunden.'
          : 'C-Dur-Pentatonik mit Notennamen. Die Akkordtöne C, E und G sind zusätzlich als Akkordformen verbunden.'
        : numberLabelMode
          ? 'C-Dur-Pentatonik: C=1, D=2, E=3, G=5 und A=6. Auch C in einer höheren Oktave wird als 1 angezeigt.'
          : 'C-Dur-Pentatonik: Die Notennamen C, D, E, G und A sind markiert.';
      numberFlipButton.textContent = `Tiefe E-Saite nach ${numberLowEAtBottom ? 'oben' : 'unten'} anzeigen`;
      numberFlipButton.setAttribute('aria-pressed', String(numberLowEAtBottom));
      numberChordButton.textContent = numberChordMode ? 'Einzelne Töne anzeigen' : 'Dur-Grundakkord anzeigen';
      numberChordButton.setAttribute('aria-pressed', String(numberChordMode));
      labelModeButton.textContent = numberLabelMode ? 'Notennamen anzeigen' : 'Tonstufen anzeigen';
      labelModeButton.setAttribute('aria-pressed', String(numberLabelMode));
    }
    numberFlipButton.addEventListener('click', () => {
      numberLowEAtBottom = !numberLowEAtBottom;
      updateNumberDiagram();
    });
    numberChordButton.addEventListener('click', () => {
      numberChordMode = !numberChordMode;
      updateNumberDiagram();
    });
    labelModeButton.addEventListener('click', () => {
      numberLabelMode = !numberLabelMode;
      updateNumberDiagram();
    });
  }

  const scaleFlipButton = document.querySelector('[data-scale-flip]');
  const scaleLabelsButton = document.querySelector('[data-scale-labels]');
  const scaleDiagram = document.querySelector('[data-scale-image]');
  const scaleCaption = document.querySelector('[data-scale-caption]');
  const scaleLink = scaleDiagram?.closest('a');
  if (scaleFlipButton && scaleLabelsButton && scaleDiagram && scaleCaption && scaleLink) {
    let scaleLowEAtBottom = true;
    let scaleDegreeMode = false;
    function updateScaleDiagram() {
      const filename = `assets/gitarre/pentatonik-c-dur-tonleiter${scaleDegreeMode ? '-stufen' : ''}${scaleLowEAtBottom ? '-umgedreht' : ''}.svg`;
      scaleDiagram.src = filename;
      scaleLink.href = filename;
      scaleDiagram.alt = `C-Dur-Tonleiter auf dem gesamten Griffbrett: ${scaleDegreeMode ? 'Tonstufen 1 bis 7' : 'Notennamen C, D, E, F, G, A und B'} sind in allen fünf Positionen markiert. Die tiefe E-Saite liegt ${scaleLowEAtBottom ? 'unten' : 'oben'}.`;
      scaleCaption.textContent = `${scaleDegreeMode ? 'C-Dur-Tonleiter: C=1, D=2, E=3, F=4, G=5, A=6, B=7.' : 'C-Dur-Tonleiter: C, D, E, F, G, A und B sind in allen fünf Positionen markiert.'} Die tiefe E-Saite liegt ${scaleLowEAtBottom ? 'unten' : 'oben'}.`;
      scaleFlipButton.textContent = `Tiefe E-Saite nach ${scaleLowEAtBottom ? 'oben' : 'unten'} anzeigen`;
      scaleFlipButton.setAttribute('aria-pressed', String(scaleLowEAtBottom));
      scaleLabelsButton.textContent = scaleDegreeMode ? 'Notennamen anzeigen' : 'Tonstufen anzeigen';
      scaleLabelsButton.setAttribute('aria-pressed', String(scaleDegreeMode));
    }
    scaleFlipButton.addEventListener('click', () => { scaleLowEAtBottom = !scaleLowEAtBottom; updateScaleDiagram(); });
    scaleLabelsButton.addEventListener('click', () => { scaleDegreeMode = !scaleDegreeMode; updateScaleDiagram(); });
  }

  const cScaleAddBButton = document.querySelector('[data-cscale-add-b]');
  const cScaleDiagram = document.querySelector('[data-cscale-image]');
  const cScaleCaption = document.querySelector('[data-cscale-caption]');
  const cScaleLink = document.querySelector('[data-cscale-link]');
  if (cScaleAddBButton && cScaleDiagram && cScaleCaption && cScaleLink) {
    let showBothStrings = false;
    cScaleAddBButton.addEventListener('click', () => {
      showBothStrings = !showBothStrings;
      const filename = showBothStrings
        ? 'assets/gitarre/c-dur-tonleiter-a-und-b-saite.svg'
        : 'assets/gitarre/c-dur-tonleiter-a-saite-ab-c.svg';
      cScaleDiagram.src = filename;
      cScaleLink.href = filename;
      cScaleLink.setAttribute('aria-label', showBothStrings
        ? 'C-Dur-Tonleiter auf A- und B-Saite vergrößern'
        : 'C-Dur-Tonleiter auf der A-Saite vergrößern');
      cScaleDiagram.alt = showBothStrings
        ? 'Gitarrengriffbrett mit der C-Dur-Tonleiter auf A- und B-Saite. A-Saite: C im dritten bis C im fünfzehnten Bund. B-Saite: C im ersten bis C im dreizehnten Bund.'
        : 'Gitarrengriffbrett mit C, D, E, F, G, A, B und C ausschließlich auf der A-Saite markiert. Die Tonleiter beginnt bei C im dritten Bund und endet bei C im fünfzehnten Bund.';
      cScaleCaption.textContent = showBothStrings
        ? 'Beide Folgen im selben Griffbrettbild: A-Saite C3–C15; B-Saite C1–C13. Die B-Saiten-Töne sind zusätzlich türkis umrandet.'
        : 'Die C-Dur-Tonleiter auf der A-Saite: C im 3. Bund bis zum nächsten C im 15. Bund.';
      cScaleAddBButton.textContent = showBothStrings ? 'B-Saite ausblenden' : 'B-Saite zusätzlich anzeigen';
      cScaleAddBButton.setAttribute('aria-pressed', String(showBothStrings));
    });
  }
  document.querySelectorAll('[data-octave-pattern-tool]').forEach((tool) => {
    const button = tool.querySelector('[data-octave-pattern-toggle]');
    const image = tool.querySelector('[data-octave-pattern-image]');
    const caption = tool.querySelector('[data-octave-pattern-caption]');
    if (!button || !image || !caption) return;
    let startsOnAString = false;
    const views = {
      lowE: {
        src: 'assets/gitarre/pentatonik-c-dur-positionen-oktave-e-only.svg?v=3',
        button: 'A-Saiten-Muster ergänzen',
        alt: 'Gesamtes Griffbrett mit einer Oktave C-Dur-Pentatonik in Dur-Position 1. Die Positionsbänder markieren Dur-Position 4, 1 und 5.',
        caption: 'Eine Oktave ab der tiefen E-Saite in Dur-Position 1: C–D–E–G–A–C auf E-, A- und D-Saite. Die Bänder markieren zusätzlich Dur-Position 4 und 5. Die Fingerfolge lautet M–K–Z–K–Z–K.'
      },
      a: {
        src: 'assets/gitarre/pentatonik-c-dur-positionen-oktave-e-und-a-saite.svg?v=3',
        button: 'A-Saiten-Muster ausblenden',
        alt: 'Gesamtes Griffbrett mit beiden Griffwegen derselben C-Dur-Pentatonik-Oktave. Die Griffwege liegen in Dur-Position 1 und 4; darunter ist zusätzlich Dur-Position 5 markiert.',
        caption: 'Beide Griffwege sind sichtbar: Dur-Position 1 ab tiefer E-Saite und Dur-Position 4 ab A-Saite. Zusätzlich ist Dur-Position 5 markiert. Der Fingersatz bleibt M–K–Z–K–Z–K.'
      }
    };
    button.addEventListener('click', () => {
      startsOnAString = !startsOnAString;
      const view = views[startsOnAString ? 'a' : 'lowE'];
      image.src = view.src;
      image.alt = view.alt;
      caption.textContent = view.caption;
      button.textContent = view.button;
      button.setAttribute('aria-pressed', String(startsOnAString));
    });
  });

  const position2Toggle = document.querySelector('[data-position2-pattern-toggle]');
  const positionPatternImage = document.querySelector('[data-position-pattern-image]');
  const positionPatternCaption = document.querySelector('[data-position-pattern-caption]');
  const positionPatternGuidance = document.querySelector('[data-position-pattern-guidance]');
  const positionGToggle = document.querySelector('[data-position-g-pattern-toggle]');
  const positionGGuidance = document.querySelector('[data-position-g-pattern-guidance]');
  if (position2Toggle && positionPatternImage && positionPatternCaption && positionPatternGuidance && positionGToggle && positionGGuidance) {
    let showPosition2 = false;
    let showPositionG = false;
    function updatePositionPattern() {
      const source = showPosition2 && showPositionG
        ? 'assets/gitarre/pentatonik-c-dur-positionen-oktave-e-a-d-g-saite.svg?v=3'
        : showPosition2
          ? 'assets/gitarre/pentatonik-c-dur-positionen-oktave-e-a-d-saite.svg?v=3'
          : showPositionG
            ? 'assets/gitarre/pentatonik-c-dur-positionen-oktave-e-a-g-saite.svg?v=3'
            : 'assets/gitarre/pentatonik-c-dur-positionen-oktave-e-und-a-saite.svg';
      positionPatternImage.src = source;
      positionPatternImage.alt = showPosition2 && showPositionG
        ? 'Gesamtes Griffbrett mit vier Griffwegen derselben C-Dur-Pentatonik-Oktave ab tiefer E-, A-, D- und G-Saite. Das gemeinsame C am fünften Bund der G-Saite ist mit K/Z markiert.'
        : showPosition2
          ? 'Gesamtes Griffbrett mit Griffwegen derselben C-Dur-Pentatonik-Oktave ab tiefer E-, A- und D-Saite.'
          : showPositionG
            ? 'Gesamtes Griffbrett mit Griffwegen derselben C-Dur-Pentatonik-Oktave ab tiefer E-, A- und G-Saite. Am gemeinsamen C am fünften Bund der G-Saite ist K/Z markiert.'
            : 'Gesamtes Griffbrett mit den Griffwegen der C-Dur-Pentatonik-Oktave in Dur-Position 1 ab tiefer E-Saite und Dur-Position 4 ab A-Saite.';
      positionPatternCaption.textContent = showPosition2 && showPositionG
        ? 'Die Muster ab D- und G-Saite sind ergänzt. Dur-Position 5 bleibt markiert; das gemeinsame C am fünften Bund der G-Saite trägt K/Z.'
        : showPosition2
          ? 'Dazu kommt Dur-Position 2 ab C im zehnten Bund der D-Saite. Dur-Position 5 ist ebenfalls markiert. Auch hier ist der Fingersatz M–K–Z–K–Z–K.'
          : showPositionG
            ? 'Zusätzlich erscheint das Muster ab C im fünften Bund der G-Saite. Dur-Position 5 bleibt markiert; das gemeinsame C trägt K/Z.'
            : 'Dur-Position 1, 4 und 5 sind markiert. Du kannst die Muster ab D- und G-Saite ergänzen.';
      positionPatternGuidance.hidden = !showPosition2 || showPositionG;
      positionGGuidance.hidden = !showPositionG;
      position2Toggle.textContent = showPosition2 ? 'D-Saiten-Muster ausblenden' : 'Muster ab der D-Saite zeigen';
      positionGToggle.textContent = showPositionG ? 'G-Saiten-Muster ausblenden' : 'Muster ab der G-Saite zeigen';
      position2Toggle.setAttribute('aria-pressed', String(showPosition2));
      positionGToggle.setAttribute('aria-pressed', String(showPositionG));
    }
    position2Toggle.addEventListener('click', () => {
      showPosition2 = !showPosition2;
      updatePositionPattern();
    });
    positionGToggle.addEventListener('click', () => {
      showPositionG = !showPositionG;
      updatePositionPattern();
    });
  }

  const extraToneToggle = document.querySelector('[data-extra-tone-toggle]');
  const extraToneImage = document.querySelector('[data-extra-tone-image]');
  const extraToneCaption = document.querySelector('[data-extra-tone-caption]');
  if (extraToneToggle && extraToneImage && extraToneCaption) {
    let showExtraTones = false;
    extraToneToggle.addEventListener('click', () => {
      showExtraTones = !showExtraTones;
      extraToneImage.src = showExtraTones
        ? 'assets/gitarre/pentatonik-c-dur-positionen-ergaenzt-d-g-position5.svg'
        : 'assets/gitarre/pentatonik-c-dur-positionen-oktave-e-a-d-g-position5.svg';
      extraToneImage.alt = showExtraTones
        ? 'Die vier Oktav-Griffwege der C-Dur-Pentatonik mit der unteren Dur-Position 3 samt Fingersatz sowie D auf B3 und G auf hoher E3 ergänzt. Eine rote Umrandung umfasst außerdem C auf G5, D auf B3, E auf B5 sowie G, A und C auf hoher E3, 5 und 8.'
        : 'Die vier Oktav-Griffwege der C-Dur-Pentatonik ab tiefer E-, A-, D- und G-Saite. Die untere Dur-Position 3 mit C–D–E–G–A–C und Fingersatz ist ebenfalls sichtbar; Dur-Position 5 ist markiert.';
      extraToneCaption.textContent = showExtraTones
        ? 'Die untere Dur-Position 3 mit C–D–E–G–A–C und Fingersatz bleibt sichtbar. Zusätzlich rot umrandet sind C auf G5, D auf B3, E auf B5 sowie G, A und C auf der hohen E-Saite in den Bünden 3, 5 und 8.'
        : 'Die vier Oktav-Griffwege und die gelernte tiefe Dur-Position 3 mit C–D–E–G–A–C samt Fingersatz sind sichtbar. Dur-Position 5 ist markiert. Der Knopf ergänzt D auf B3 und G auf hoher E3 und umrandet den vollständigen Griffweg.';
      extraToneToggle.textContent = showExtraTones ? 'Ergänzte Töne ausblenden' : 'Ergänzte Töne anzeigen';
      extraToneToggle.setAttribute('aria-pressed', String(showExtraTones));
    });
  }

  const position5OctaveToggle = document.querySelector('[data-position5-octave-toggle]');
  const position3VariationToggle = document.querySelector('[data-position3-variation-toggle]');
  const position1OctaveToggle = document.querySelector('[data-position1-octave-toggle]');
  const position5OctaveImage = document.querySelector('[data-position5-octave-image]');
  const position5FingerOverlay = document.querySelector('[data-position5-finger-overlay]');
  const position1OctaveOverlay = document.querySelector('[data-position1-octave-overlay]');
  const position5OctaveCaption = document.querySelector('[data-position5-octave-caption]');
  if (position5OctaveToggle && position3VariationToggle && position1OctaveToggle && position5OctaveImage && position5FingerOverlay && position1OctaveOverlay && position5OctaveCaption) {
    let showPosition5Octave = false;
    let showPosition3Variation = false;
    let showPosition1Octave = false;
    const updatePosition5Tool = () => {
      position5OctaveImage.src = showPosition3Variation
        ? showPosition5Octave
          ? 'assets/gitarre/pentatonik-c-dur-position5-position3-highlight.svg'
          : 'assets/gitarre/pentatonik-c-dur-position5-position3.svg'
        : showPosition5Octave
          ? 'assets/gitarre/pentatonik-c-dur-position5-no-fingers-highlight.svg'
          : 'assets/gitarre/pentatonik-c-dur-position5-no-fingers.svg';
      const fingerOverlay = showPosition5Octave && showPosition3Variation
        ? 'assets/gitarre/pentatonik-c-dur-fingersatz-position3-5.svg'
        : showPosition5Octave
          ? 'assets/gitarre/pentatonik-c-dur-fingersatz-position5.svg'
          : showPosition3Variation
            ? 'assets/gitarre/pentatonik-c-dur-fingersatz-position3.svg'
            : '';
      position5FingerOverlay.hidden = !fingerOverlay;
      if (fingerOverlay) position5FingerOverlay.src = fingerOverlay;
      else position5FingerOverlay.removeAttribute('src');
      position1OctaveOverlay.hidden = !showPosition1Octave;
      position1OctaveOverlay.style.display = showPosition1Octave ? 'block' : 'none';
      position5OctaveImage.alt = showPosition3Variation
        ? 'Ganzes Griffbrett mit rot umrandetem Griffweg in Dur-Position 3: C auf A3, D offen auf D0, E auf D2, G offen auf G0, A auf G2 und C auf B1.'
        : 'Gesamtes Griffbrett mit den vier C-Dur-Pentatonik-Oktavmustern. Dur-Position 5 ist markiert.';
      const captionParts = [];
      if (showPosition5Octave) captionParts.push('Dur-Position 5: rot umrandeter Griffweg C–D–E–G–A–C mit Fingersatz: tiefe E8 M, A5–A7 Z–R, D5–D7 Z–R und G5 Z.');
      else captionParts.push('Dur-Position 5 ist wie die anderen Positionen markiert.');
      if (showPosition3Variation) captionParts.push('Dur-Position 3 ist rot umrandet: C auf A3 mit K, D0 offen, E auf D2 mit R, G0 offen, A auf G2 mit R und C auf B1 mit M.');
      if (showPosition1Octave) captionParts.push('Die zweite Oktave von Dur-Position 1 ist rot umrandet: C auf D10 mit K, D auf G7 mit Z, E auf G9 mit R, G auf B8 mit M, A auf B10 mit K und C auf hoher E8 mit M.');
      else captionParts.push('Der zusätzliche Knopf zeigt die zweite Oktave von Dur-Position 1 mit Fingersatz.');
      position5OctaveCaption.textContent = captionParts.join(' ');
      position5OctaveToggle.textContent = showPosition5Octave ? 'Dur-Position 5 ausblenden' : 'Dur-Position 5 mit Fingersatz anzeigen';
      position5OctaveToggle.setAttribute('aria-pressed', String(showPosition5Octave));
      position3VariationToggle.textContent = showPosition3Variation ? 'Dur-Position 3 ausblenden' : 'Dur-Position 3 mit Fingersatz ergänzen';
      position3VariationToggle.setAttribute('aria-pressed', String(showPosition3Variation));
      position1OctaveToggle.textContent = showPosition1Octave ? 'Zweite Oktave ausblenden' : 'Zweite Oktave in Dur-Position 1 anzeigen';
      position1OctaveToggle.setAttribute('aria-pressed', String(showPosition1Octave));
    };
    position5OctaveToggle.addEventListener('click', () => {
      showPosition5Octave = !showPosition5Octave;
      updatePosition5Tool();
    });
    position3VariationToggle.addEventListener('click', () => {
      showPosition3Variation = !showPosition3Variation;
      updatePosition5Tool();
    });
    position1OctaveToggle.addEventListener('click', () => {
      showPosition1Octave = !showPosition1Octave;
      updatePosition5Tool();
    });
    updatePosition5Tool();
  }

  const position3OctaveToggle = document.querySelector('[data-position3-octave-toggle]');
  const position3OctaveOverlay = document.querySelector('[data-position3-octave-overlay]');
  const position3OctaveCaption = document.querySelector('[data-position3-octave-caption]');
  if (position3OctaveToggle && position3OctaveOverlay && position3OctaveCaption) {
    let showPosition3Octave = false;
    const updatePosition3Octave = () => {
      position3OctaveOverlay.hidden = !showPosition3Octave;
      position3OctaveOverlay.setAttribute('aria-hidden', String(!showPosition3Octave));
      position3OctaveToggle.textContent = showPosition3Octave ? 'Dur-Position-3-Griffweg ausblenden' : 'Dur-Position-3-Griffweg anzeigen';
      position3OctaveToggle.setAttribute('aria-pressed', String(showPosition3Octave));
      position3OctaveCaption.textContent = showPosition3Octave
        ? 'Die hohe Dur-Position 3 ist präzise markiert: A15, D12 und D14, G12 und G14 sowie B13. Sie entspricht der ebenfalls rot umrandeten tiefen Dur-Position 3. Beide Positionsstreifen sind als Dur-Position 3 gekennzeichnet.'
        : 'Die tiefe Dur-Position 3 ist bereits rot umrandet. Der Knopf ergänzt die entsprechende Dur-Position 3 ab dem 12. Bund; beide Bereiche werden dann als Dur-Position 3 gekennzeichnet.';
    };
    position3OctaveToggle.addEventListener('click', () => {
      showPosition3Octave = !showPosition3Octave;
      updatePosition3Octave();
    });
  }

})();
