(() => {
  const flipButton = document.querySelector('[data-fretboard-flip]');
  const rootsButton = document.querySelector('[data-fretboard-roots]');
  const diagram = document.querySelector('.pentatonic-fretboard-img');
  const caption = document.querySelector('[data-fretboard-caption]');
  const fullSizeLink = diagram?.closest('a');
  if (!flipButton || !rootsButton || !diagram || !caption || !fullSizeLink) return;

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
    moll: 'Nur der Moll-Grundton A ist blau hervorgehoben.'
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
        ? `Ganzes Griffbrett der C-Dur-Pentatonik mit C als rotem Grundton, E als violetter Terz und G als grüner Quinte. Rote Linien verbinden die Akkordformen. Die tiefe E-Saite liegt ${lessonLowEAtBottom ? 'unten' : 'oben'}.`
        : `Ganzes Griffbrett der C-Dur-Pentatonik mit markiertem Dur-Grundton C, der Terz E und der Quinte G. Die tiefe E-Saite liegt ${lessonLowEAtBottom ? 'unten' : 'oben'}.`;
      lessonCaption.textContent = lessonChordMode
        ? 'Der C-Dur-Grundakkord besteht aus Grundton (1), Terz (3) und Quinte (5). C bleibt rot, E violett und G grün. Rote Linien verbinden die Töne der E-Dur-Barreform in Position 1 ab Bund 8, der D-Form auf G12, B13 und hoher E12 der nächsten Form auf A15, D14 und G12'
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
})();
