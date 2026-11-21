(() => {
  const gallery = document.querySelector('.area-gallery');
  if (!gallery) return;

  const card = gallery.querySelector('.area-gallery-card');
  const symbol = gallery.querySelector('.area-gallery-symbol');
  const name = gallery.querySelector('.area-gallery-name');
  const hint = gallery.querySelector('.area-gallery-hint');
  const dots = gallery.querySelector('.area-gallery-dots');
  const previous = gallery.querySelector('.area-gallery-prev');
  const next = gallery.querySelector('.area-gallery-next');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let areas = [];
  let activeIndex = 0;
  let timer = 0;

  const descriptions = {
    philosophie: 'Fragen, die Musik eröffnet',
    rhythmus: 'Puls, Zeit und Bewegung',
    gehoertraining: 'Hören, erkennen und nachsingen',
    melodie: 'Tonleitern, Motive und Melodien',
    harmonie: 'Akkorde und musikalische Beziehungen',
    gesang: 'Stimme, Atem und Intonation',
    gitarre: 'Klänge und Musik auf der Gitarre',
    'bewegung-musiker': 'Bewegung und Körper beim Musizieren'
  };

  function show(index) {
    if (!areas.length) return;
    activeIndex = (index + areas.length) % areas.length;
    const area = areas[activeIndex];
    card.href = `kurse.html#${area.id}`;
    card.setAttribute('aria-label', `${area.name} entdecken`);
    symbol.replaceChildren(area.icon.cloneNode(true));
    name.textContent = area.name;
    hint.textContent = descriptions[area.id] || 'Kurse entdecken';
    gallery.style.setProperty('--area-color', area.color);
    gallery.style.setProperty('--area-tint', area.tint);
    dots.querySelectorAll('button').forEach((dot, dotIndex) => {
      dot.setAttribute('aria-current', String(dotIndex === activeIndex));
      dot.setAttribute('aria-label', `${areaName(dotIndex)} anzeigen`);
    });
  }

  function areaName(index) { return areas[index]?.name || `Bereich ${index + 1}`; }
  function stop() { window.clearInterval(timer); timer = 0; }
  function start() {
    stop();
    if (reducedMotion.matches || areas.length < 2 || document.hidden) return;
    timer = window.setInterval(() => show(activeIndex + 1), Number(gallery.dataset.galleryInterval) || 4800);
  }

  fetch('kurse.html').then(response => {
    if (!response.ok) throw new Error('Kursübersicht nicht verfügbar');
    return response.text();
  }).then(markup => {
    const documentCopy = new DOMParser().parseFromString(markup, 'text/html');
    areas = [...documentCopy.querySelectorAll('.catalog-branch')].map(section => {
      const icon = section.querySelector('.branch-emblem');
      const heading = section.querySelector('.branch-heading h2');
      if (!icon || !heading) return null;
      const style = section.getAttribute('style') || '';
      const color = style.match(/--branch-color\s*:\s*([^;]+)/)?.[1]?.trim() || '#655381';
      const tint = style.match(/--branch-tint\s*:\s*([^;]+)/)?.[1]?.trim() || '#e7e0ed';
      return { id: section.id, name: heading.textContent.trim(), icon, color, tint };
    }).filter(Boolean);
    if (!areas.length) return;
    document.querySelectorAll('.home-area-links a[href^="kurse.html#"]').forEach(link => {
      const id = link.getAttribute('href').split('#')[1];
      const area = areas.find(item => item.id === id);
      if (!area) return;
      const icon = area.icon.cloneNode(true);
      icon.classList.add('home-area-link-symbol');
      icon.setAttribute('aria-hidden', 'true');
      link.prepend(icon);
      link.style.setProperty('--area-color', area.color);
      link.style.setProperty('--area-tint', area.tint);
    });
    dots.replaceChildren(...areas.map((area, index) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'area-gallery-dot';
      dot.setAttribute('aria-label', `${area.name} anzeigen`);
      dot.addEventListener('click', () => { show(index); start(); });
      return dot;
    }));
    show(0);
    start();
  }).catch(() => {});

  previous.addEventListener('click', () => { show(activeIndex - 1); start(); });
  next.addEventListener('click', () => { show(activeIndex + 1); start(); });
  gallery.addEventListener('mouseenter', stop);
  gallery.addEventListener('mouseleave', start);
  gallery.addEventListener('focusin', stop);
  gallery.addEventListener('focusout', event => { if (!gallery.contains(event.relatedTarget)) start(); });
  document.addEventListener('visibilitychange', start);
  reducedMotion.addEventListener?.('change', start);
})();
