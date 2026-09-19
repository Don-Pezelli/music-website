(() => {
  const entries = [...document.querySelectorAll('.lesson-nav a[href^="#"]')]
    .map(link => ({ link, section: document.getElementById(link.hash.slice(1)) }))
    .filter(entry => entry.section);
  if (!entries.length) return;

  let scheduled = false;
  function update() {
    scheduled = false;
    // Keep the current section selected until the next heading reaches the reading area.
    const readingLine = Math.min(160, window.innerHeight * 0.25);
    let current = entries[0];
    for (const entry of entries) {
      if (entry.section.getBoundingClientRect().top <= readingLine) current = entry;
    }
    if (window.scrollY > 0 && window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
      current = entries[entries.length - 1];
    }
    for (const entry of entries) {
      if (entry === current) entry.link.setAttribute('aria-current', 'location');
      else entry.link.removeAttribute('aria-current');
    }
  }
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(update);
  }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  window.addEventListener('hashchange', schedule);
  window.addEventListener('pageshow', schedule);
  document.addEventListener('toggle', schedule, true);
  // Images, fonts and expanded solutions can move section boundaries without a scroll.
  if ('ResizeObserver' in window) new ResizeObserver(schedule).observe(document.querySelector('.lesson-content'));
  update();
})();
