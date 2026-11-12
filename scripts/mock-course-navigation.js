(() => {
  const nav = document.querySelector('.mock-nav');
  const content = document.querySelector('.mock-content');
  if (!nav || !content) return;

  const links = [...nav.querySelectorAll('a[href^="#"]')]
    .map((link) => ({ link, section: document.getElementById(link.hash.slice(1)) }))
    .filter((entry) => entry.section);
  const lessonEntries = links.filter((entry) => entry.section.id.startsWith('lektion-'));
  const chapterLinks = new Map(
    links.filter((entry) => entry.section.id.startsWith('kapitel-'))
      .map((entry) => [entry.section.id, entry.link]),
  );
  if (!lessonEntries.length) return;

  let scheduled = false;
  function update() {
    scheduled = false;
    const readingLine = Math.min(170, window.innerHeight * 0.28);
    let currentLesson = null;
    for (const entry of lessonEntries) {
      if (entry.section.getBoundingClientRect().top <= readingLine) currentLesson = entry;
    }
    if (window.scrollY > 0 && window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
      currentLesson = lessonEntries.at(-1);
    }

    for (const { link } of links) link.removeAttribute('aria-current');
    if (!currentLesson) {
      const intro = links.find((entry) => entry.section.id === 'einfuehrung');
      intro?.link.setAttribute('aria-current', 'location');
      return;
    }

    currentLesson.link.setAttribute('aria-current', 'location');
    const chapter = currentLesson.section.closest('section[id^="kapitel-"]');
    chapterLinks.get(chapter?.id)?.setAttribute('aria-current', 'location');
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
  if ('ResizeObserver' in window) new ResizeObserver(schedule).observe(content);
  update();
})();
