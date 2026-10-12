(() => {
  const button = document.querySelector('[data-fretboard-flip]');
  const diagram = document.querySelector('.pentatonic-fretboard-img');
  const caption = document.querySelector('[data-fretboard-caption]');
  const fullSizeLink = diagram?.closest('a');
  if (!button || !diagram || !caption || !fullSizeLink) return;

  button.addEventListener('click', () => {
    const lowEAtBottom = button.getAttribute('aria-pressed') !== 'true';
    button.setAttribute('aria-pressed', String(lowEAtBottom));
    diagram.src = lowEAtBottom
      ? 'assets/gitarre/pentatonik-c-dur-griffbrett-umgedreht.svg'
      : 'assets/gitarre/pentatonik-c-dur-griffbrett.svg';
    fullSizeLink.href = diagram.src;
    diagram.alt = lowEAtBottom
      ? 'Gedrehtes Gitarrengriffbrett mit tiefer E-Saite unten, Tönen der C-Dur-Pentatonik und fünf farblich markierten Positionsbereichen. C als Dur-Grundton ist rot hervorgehoben.'
      : 'Ganzes Gitarrengriffbrett mit Tönen der C-Dur-Pentatonik und fünf farblich markierten Positionsbereichen. C als Dur-Grundton ist rot hervorgehoben.';
    button.textContent = lowEAtBottom
      ? 'Tiefe E-Saite nach oben anzeigen'
      : 'Tiefe E-Saite nach unten anzeigen';
    caption.textContent = lowEAtBottom
      ? 'C-Dur-Pentatonik: Alle roten C-Markierungen zeigen den Dur-Grundton. Die tiefe E-Saite liegt unten.'
      : 'C-Dur-Pentatonik: Alle roten C-Markierungen zeigen den Dur-Grundton. Die tiefe E-Saite liegt oben.';
  });
})();
