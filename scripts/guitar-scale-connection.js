(() => {
  const image = document.querySelector('[data-scale3-image]');
  const link = document.querySelector('[data-scale3-link]');
  const caption = document.querySelector('[data-scale3-caption]');
  const flip = document.querySelector('[data-scale3-flip]');
  const labels = document.querySelector('[data-scale3-labels]');
  const connection = document.querySelector('[data-scale3-connection]');
  if (!image || !link || !caption || !flip || !labels || !connection) return;

  let lowEAtBottom = true;
  let showDegrees = false;
  let showBoxes = false;
  function update() {
    const file = `assets/gitarre/pentatonik-c-dur-tonleiter${showDegrees ? '-stufen' : ''}${lowEAtBottom ? '-umgedreht' : ''}${showBoxes ? '-boxen' : ''}.svg`;
    image.src = file;
    link.href = file;
    image.alt = `C-Dur-Tonleiter in Dur-Position 1: ${showDegrees ? 'Tonstufen 1 bis 7' : 'Notennamen C, D, E, F, G, A und B'}. F und B sind farbig markiert.${showBoxes ? ' Der gesamte Griffbereich ist mit einem roten Rahmen markiert.' : ''}`;
    caption.textContent = `C-Dur-Tonleiter in Dur-Position 1.${showBoxes ? ' Ein roter Rahmen umfasst Bund 7 bis 10 über die tiefe E-, A- und D-Saite.' : ' F und B heben sich farbig ab.'}`;
    flip.textContent = `Tiefe E-Saite nach ${lowEAtBottom ? 'oben' : 'unten'} anzeigen`;
    flip.setAttribute('aria-pressed', String(lowEAtBottom));
    labels.textContent = showDegrees ? 'Notennamen anzeigen' : 'Tonstufen anzeigen';
    labels.setAttribute('aria-pressed', String(showDegrees));
    connection.textContent = showBoxes ? 'Umrandung ausblenden' : 'Tonleiterbereich umranden';
    connection.setAttribute('aria-pressed', String(showBoxes));
  }
  flip.addEventListener('click', () => { lowEAtBottom = !lowEAtBottom; update(); });
  labels.addEventListener('click', () => { showDegrees = !showDegrees; update(); });
  connection.addEventListener('click', () => { showBoxes = !showBoxes; update(); });
})();
