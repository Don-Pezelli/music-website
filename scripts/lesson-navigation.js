(() => {
  const navs = [...document.querySelectorAll('.lesson-nav, .mock-nav')];
  if (!navs.length) return;

  navs.forEach((nav) => {
    const melodieNav = nav.getAttribute('aria-label') === 'Kapitel und Lektionen in Melodie 1';
    const manuallyToggledChapters = new Set();
    let pendingManualChapter = null;
    let currentGroup = null;
    let currentCourseLink = null;
    const courseGroups = new Map();
    nav.querySelectorAll('.course-nav-group').forEach(group => {
      const toggle = group.querySelector('.course-nav-toggle');
      const link = group.querySelector('.course-nav-row > a');
      const panel = document.getElementById(toggle.getAttribute('aria-controls'));
      const setOpen = open => {
        panel.hidden = !open;
        toggle.setAttribute('aria-expanded', String(open));
      };
      courseGroups.set(group, { link, setOpen });
      toggle.addEventListener('click', () => setOpen(panel.hidden));
      link.addEventListener('click', () => {
        courseGroups.forEach(({ setOpen: setGroupOpen }, candidate) => setGroupOpen(candidate === group));
        keepCourseLinkVisible(link);
      });
    });
    if (nav.classList.contains('rhythmus-course-nav')) {
      nav.querySelectorAll('[data-chapter-subnav] > summary').forEach((summary) => {
        summary.addEventListener('click', () => {
          const subnav = summary.parentElement;
          const chapterId = subnav.dataset.chapterSubnav;
          manuallyToggledChapters.add(chapterId);
          pendingManualChapter = subnav.open ? null : chapterId;
          schedule();
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
      const readingLine = courseGroups.size && window.innerWidth <= 680
        ? Math.max(Math.min(170, window.innerHeight * 0.28), nav.clientHeight + 16)
        : Math.min(170, window.innerHeight * 0.28);
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
      if (courseGroups.size) {
        const group = current.link.closest('.course-nav-group');
        const controls = courseGroups.get(group);
        if (currentGroup !== group) {
          courseGroups.forEach(({ setOpen }, candidate) => setOpen(candidate === group));
        }
        if (controls) controls.link.setAttribute('aria-current', 'location');
        if (currentGroup !== group || currentCourseLink !== current.link) {
          keepCourseLinkVisible(controls && currentGroup !== group ? controls.link : current.link);
        }
        currentGroup = group;
        currentCourseLink = current.link;
      }

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
        const manuallyOpenedNav = pendingManualChapter
          ? nav.querySelector(`[data-chapter-subnav="${pendingManualChapter}"]`)
          : null;
        pendingManualChapter = null;
        if (manuallyOpenedNav?.open) revealChapterLessons(manuallyOpenedNav, true);
        else if (currentChapterNav?.open) revealChapterLessons(currentChapterNav);
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

    function keepCourseLinkVisible(link) {
      if (link.closest('[hidden]') || nav.scrollHeight <= nav.clientHeight) return;
      const viewport = nav.getBoundingClientRect();
      const bounds = link.getBoundingClientRect();
      if (bounds.top < viewport.top) nav.scrollTop += bounds.top - viewport.top;
      else if (bounds.bottom > viewport.bottom) nav.scrollTop += bounds.bottom - viewport.bottom;
    }

    function revealChapterLessons(subnav, manualOpen = false) {
      if (!subnav) return;
      let nextChapter = subnav.nextElementSibling;
      while (nextChapter && !nextChapter.matches('[data-course-chapter-link]')) nextChapter = nextChapter.nextElementSibling;
      if (window.innerWidth <= 680) {
        nav.style.removeProperty('max-height');
        nav.style.removeProperty('overflow-y');
        if (!manualOpen) return;
        const targetBounds = (nextChapter || subnav.querySelector('a:last-of-type'))?.getBoundingClientRect();
        if (targetBounds && targetBounds.bottom > window.innerHeight - 16) {
          window.scrollBy({ top: targetBounds.bottom - window.innerHeight + 28, behavior: 'smooth' });
        }
        return;
      }
      const initialBounds = nav.getBoundingClientRect();
      const availableHeight = window.innerHeight - Math.max(24, initialBounds.top) - 16;
      if (availableHeight > 80) {
        nav.style.maxHeight = `${availableHeight}px`;
        nav.style.overflowY = 'auto';
      }
      const navBounds = nav.getBoundingClientRect();
      const subnavBounds = subnav.getBoundingClientRect();
      const targetBounds = (nextChapter || subnav).getBoundingClientRect();
      const bottomBoundary = Math.min(navBounds.bottom, window.innerHeight - 12);
      const bottomOverflow = targetBounds.bottom - bottomBoundary;
      const topOverflow = navBounds.top - subnavBounds.top;
      const offset = bottomOverflow > 0 ? bottomOverflow + 22 : topOverflow > 0 ? -topOverflow - 12 : 0;
      if (offset && nav.scrollHeight > nav.clientHeight) nav.scrollBy({ top: offset, behavior: 'smooth' });
    }

    if (nav.classList.contains('rhythmus-course-nav')) {
      nav.querySelectorAll('[data-course-chapter-link]').forEach((link) => {
        link.addEventListener('click', () => {
          const chapterId = link.dataset.courseChapterLink;
          const subnav = nav.querySelector(`[data-chapter-subnav="${chapterId}"]`);
          if (!subnav) return;
          manuallyToggledChapters.delete(chapterId);
          subnav.open = true;
          requestAnimationFrame(() => revealChapterLessons(subnav, true));
          schedule();
        });
      });
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
