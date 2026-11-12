(() => {
  const navs = [...document.querySelectorAll('.lesson-nav, .mock-nav')];
  if (!navs.length) return;

  navs.forEach((nav) => {
    const entries = [...nav.querySelectorAll('a[href^="#"]')]
      .map((link) => ({ link, section: document.getElementById(link.hash.slice(1)) }))
      .filter((entry) => entry.section);
    if (!entries.length) return;

    let scheduled = false;
    function update() {
      scheduled = false;
      const readingLine = Math.min(170, window.innerHeight * 0.28);
      let current = null;
      for (const entry of entries) {
        if (entry.section.getBoundingClientRect().top <= readingLine) current = entry;
      }
      if (window.scrollY > 0 && window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
        current = entries[entries.length - 1];
      }

      for (const { link } of entries) {
        if (link.getAttribute('aria-current') === 'location') link.removeAttribute('aria-current');
      }
      if (!current) current = entries[0];
      current.link.setAttribute('aria-current', 'location');

      const courseChapter = current.section.closest('[data-course-chapter]');
      const chapterId = courseChapter?.getAttribute('data-course-chapter');
      let chapterLink = chapterId
        ? nav.querySelector(`[data-course-chapter-link="${chapterId}"]`)
        : null;
      if (!chapterLink) {
        const chapterSection = current.section.closest('section[id^="kapitel-"], section[id^="kurs-kapitel-"]');
        if (chapterSection) chapterLink = entries.find((entry) => entry.section === chapterSection)?.link;
      }
      if (chapterLink && chapterLink !== current.link) chapterLink.setAttribute('aria-current', 'location');
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
    const content = document.querySelector('.lesson-content, .mock-content, main');
    if ('ResizeObserver' in window && content) new ResizeObserver(schedule).observe(content);
    update();
  });
})();
