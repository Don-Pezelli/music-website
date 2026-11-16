(() => {
  const navs = [...document.querySelectorAll('.lesson-nav, .mock-nav')];
  if (!navs.length) return;

  navs.forEach((nav) => {
    const melodieNav = nav.getAttribute('aria-label') === 'Kapitel und Lektionen in Melodie 1';
    const manuallyToggledChapters = new Set();
    if (nav.classList.contains('rhythmus-course-nav')) {
      nav.querySelectorAll('[data-chapter-subnav] > summary').forEach((summary) => {
        summary.addEventListener('click', () => {
          manuallyToggledChapters.add(summary.parentElement.dataset.chapterSubnav);
        });
      });
    }
    const entries = [...nav.querySelectorAll('a[href^="#"]')]
      .map((link) => ({ link, section: document.getElementById(link.hash.slice(1)) }))
      .filter((entry) => entry.section);
    if (!entries.length) {
      if (melodieNav) nav.querySelector('.mock-nav-chapter[aria-current="page"]')?.closest('.mock-nav-group')?.classList.add('is-current');
      return;
    }

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
      if (nav.classList.contains('rhythmus-course-nav')) {
        const currentChapterNav = chapterId
          ? nav.querySelector(`[data-chapter-subnav="${chapterId}"]`)
          : null;
        if (currentChapterNav && !manuallyToggledChapters.has(chapterId)) currentChapterNav.open = true;
        current.link.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
      if (melodieNav) {
        const activeGroup = (chapterLink || current.link).closest('.mock-nav-group');
        nav.querySelectorAll('.mock-nav-group.is-current').forEach((group) => group.classList.toggle('is-current', group === activeGroup));
        activeGroup?.classList.add('is-current');
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
    document.addEventListener('toggle', (event) => {
      if (!nav.contains(event.target)) schedule();
    }, true);
    const content = document.querySelector('.lesson-content, .mock-content, main');
    if ('ResizeObserver' in window && content) new ResizeObserver(schedule).observe(content);
    update();
  });
})();
