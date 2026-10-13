(() => {
  const flipButton = document.querySelector('[data-fretboard-flip]');
  const rootsButton = document.querySelector('[data-fretboard-roots]');
  const diagram = document.querySelector('.pentatonic-fretboard-img');
  const caption = document.querySelector('[data-fretboard-caption]');
  const fullSizeLink = diagram?.closest('a');
  if (!flipButton || !rootsButton || !diagram || !caption || !fullSizeLink) return;

  let lowEAtBottom = false;
  let rootMode = 'both';
  const files = {
    both: ['assets/gitarre/pentatonik-c-dur-griffbrett.svg', 'assets/gitarre/pentatonik-c-dur-griffbrett-umgedreht.svg'],
    dur: ['assets/gitarre/pentatonik-c-dur-griffbrett-dur.svg', 'assets/gitarre/pentatonik-c-dur-griffbrett-dur-umgedreht.svg'],
    moll: ['assets/gitarre/pentatonik-c-dur-griffbrett-moll.svg', 'assets/gitarre/pentatonik-c-dur-griffbrett-moll-umgedreht.svg']
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
})();
