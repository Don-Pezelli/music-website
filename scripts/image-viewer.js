(() => {
  const links = [...document.querySelectorAll('.lesson-content a[href]')].filter(link =>
    /\.(svg|png|jpe?g|webp)(?:[?#].*)?$/i.test(link.getAttribute('href'))
  );
  if (!links.length || typeof HTMLDialogElement === 'undefined') return;

  const dialog = document.createElement('dialog');
  dialog.className = 'image-viewer';
  dialog.setAttribute('aria-label', 'Vergrößerte Bildansicht');
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'image-viewer-close';
  close.textContent = 'Schließen ×';
  const picture = document.createElement('img');
  dialog.append(close, picture);
  document.body.append(dialog);
  let opener;

  for (const link of links) {
    link.setAttribute('aria-haspopup', 'dialog');
    link.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      opener = link;
      const thumbnail = link.querySelector('img') || link.closest('figure')?.querySelector('img');
      picture.alt = thumbnail?.alt || 'Vergrößerte Kursabbildung';
      picture.src = link.href;
      dialog.showModal();
      document.documentElement.classList.add('image-viewer-open');
      close.focus({ preventScroll: true });
    });
  }
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('image-viewer-open');
    picture.removeAttribute('src');
    opener?.focus({ preventScroll: true });
  });
})();
