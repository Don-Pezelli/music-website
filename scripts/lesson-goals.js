(() => {
  const skillsBook = document.getElementById('buch-der-faehigkeiten');
  if (skillsBook) setupSkillsBook(skillsBook);

  function setupSkillsBook(book) {
    const storageKey = 'music-method-rhythmus-1-goals-v1';
    const emptyMessage = book.querySelector('[data-skills-book-empty]');
    const summary = book.querySelector('[data-skills-book-summary]');
    const entries = book.querySelector('[data-skills-book-entries]');
    const course = book.closest('article');
    const readLessons = (container, selector) => [...container.querySelectorAll(selector)].map((lesson) => ({
      id: lesson.id,
      title: lesson.querySelector('h2')?.textContent.trim() || '',
      achievement: lesson.querySelector('[data-complete-message]')?.dataset.completeMessage,
      goals: [...lesson.querySelectorAll('.exercise-goals input[type="checkbox"][id]')].map((input) => ({
        input,
        text: input.labels[0]?.textContent.trim() || ''
      }))
    })).filter((lesson) => lesson.goals.length);
    const chapters = [
      { heading: 'Einführung', lessons: readLessons(course, ':scope > .lesson-section') },
      ...[...course.querySelectorAll('[data-course-chapter]')].map((chapter) => ({
        heading: `Kapitel ${Number(chapter.dataset.courseChapter)} · ${chapter.querySelector('.lesson-heading h2').textContent.trim().replace(/\.$/, '')}`,
        lessons: readLessons(chapter, '.lesson-section')
      }))
    ];

    function readCheckedIds() {
      try {
        const data = JSON.parse(localStorage.getItem(storageKey));
        return Array.isArray(data) ? data : null;
      } catch {
        return null;
      }
    }

    function appendText(parent, tag, content, className) {
      const element = document.createElement(tag);
      if (className) element.className = className;
      element.textContent = content;
      parent.append(element);
      return element;
    }

    function render() {
      const content = document.createDocumentFragment();
      let total = 0;
      chapters.forEach((chapter) => {
        const chapterPage = document.createElement('section');
        chapterPage.className = 'skills-book-chapter';
        appendText(chapterPage, 'h3', chapter.heading);
        chapter.lessons.forEach((lesson) => {
          const reached = lesson.goals.filter(({ input }) => input.checked);
          if (!reached.length) return;
          total += reached.length;

          const lessonEntry = document.createElement('div');
          lessonEntry.className = 'skills-book-lesson';
          const heading = document.createElement('h4');
          const link = appendText(heading, 'a', lesson.title);
          link.href = `#${lesson.id}`;
          lessonEntry.append(heading);

          const list = document.createElement('ul');
          reached.forEach(({ text }) => appendText(list, 'li', text));
          lessonEntry.append(list);

          if (reached.length === lesson.goals.length && lesson.achievement) {
            appendText(lessonEntry, 'p', lesson.achievement, 'skills-book-achievement');
          }
          chapterPage.append(lessonEntry);
        });
        if (chapterPage.childElementCount > 1) content.append(chapterPage);
      });
      entries.replaceChildren(content);
      emptyMessage.hidden = total > 0;
      summary.hidden = total === 0;
      summary.textContent = total === 1 ? '1 erreichtes Ziel' : `${total} erreichte Ziele`;
    }

    const goals = chapters.flatMap((chapter) => chapter.lessons.flatMap((lesson) => lesson.goals));
    const saved = readCheckedIds();
    if (saved) {
      const ids = new Set(saved);
      goals.forEach(({ input }) => { input.checked = ids.has(input.id); });
    }
    goals.forEach(({ input }) => {
      input.addEventListener('change', () => {
        try {
          const ids = new Set(readCheckedIds() ?? goals.filter((goal) => goal.input.checked).map((goal) => goal.input.id));
          if (input.checked) ids.add(input.id);
          else ids.delete(input.id);
          localStorage.setItem(storageKey, JSON.stringify([...ids]));
        } catch {
          // The book also works without persistent storage.
        }
        render();
      });
    });
    const resetStatus = book.querySelector('[data-skills-book-reset-status]');
    book.querySelector('[data-skills-book-reset]').addEventListener('click', () => {
      if (!window.confirm('Möchtest du alle abgehakten Ziele in Rhythmus 1 zurücksetzen?')) return;
      try {
        localStorage.setItem(storageKey, '[]');
      } catch {
        resetStatus.textContent = 'Der gespeicherte Fortschritt konnte nicht zurückgesetzt werden.';
        return;
      }
      goals.forEach(({ input }) => { input.checked = false; });
      document.dispatchEvent(new Event('rhythmus-goals:reset'));
      render();
      resetStatus.textContent = 'Dein Fortschritt wurde zurückgesetzt.';
    });
    render();
  }

  let goalGroups = [...document.querySelectorAll('[data-unlock-goals]')];
  if (!goalGroups.length) {
    const fallback = document.querySelector('#kapitelziel .exercise-goals');
    if (fallback) goalGroups = [fallback];
  }
  if (!goalGroups.length) return;

  const checkpoints = goalGroups.map((fieldset, index) => {
    const targetId = fieldset.dataset.unlockTarget;
    const nextChapter = targetId
      ? document.getElementById(targetId)
      : document.querySelector('#next-chapter-card');
    const section = fieldset.closest('.lesson-section, section');
    const status = section?.querySelector('[data-unlock-status]') || document.querySelector('[data-unlock-status]');
    const goals = [...fieldset.querySelectorAll('input[type="checkbox"]')];
    return { fieldset, nextChapter, status, goals, index };
  }).filter(checkpoint => checkpoint.nextChapter && checkpoint.goals.length);

  if (!checkpoints.length) return;

  const visibleGoals = new Set();
  const animateGoal = goal => {
    if (goal.checked) return;
    goal.classList.remove('checklist-visible');
    void goal.offsetWidth;
    goal.classList.add('checklist-visible');
    window.setTimeout(() => goal.classList.remove('checklist-visible'), 1800);
  };

  const checklists = goalGroups;
  if ('IntersectionObserver' in window) {
    const checklistObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if (!visibleGoals.has(entry.target)) animateGoal(entry.target);
          visibleGoals.add(entry.target);
        } else {
          visibleGoals.delete(entry.target);
        }
      });
    }, { threshold: 1 });
    checklists.forEach(checklist => {
      checklist.querySelectorAll('input[type="checkbox"]').forEach(goal => checklistObserver.observe(goal));
    });
  } else {
    const updateFallbackVisibility = () => {
      checklists.forEach(checklist => {
        checklist.querySelectorAll('input[type="checkbox"]').forEach(goal => {
          const bounds = goal.getBoundingClientRect();
          const visible = bounds.bottom > 0 && bounds.top < window.innerHeight;
          if (visible) {
            if (!visibleGoals.has(goal)) animateGoal(goal);
            visibleGoals.add(goal);
          } else visibleGoals.delete(goal);
        });
      });
    };
    window.addEventListener('scroll', updateFallbackVisibility, { passive: true });
    window.addEventListener('resize', updateFallbackVisibility);
    updateFallbackVisibility();
  }

  window.setInterval(() => visibleGoals.forEach(animateGoal), 30000);

  checkpoints.forEach(checkpoint => {
    const updateNextChapter = () => {
      const complete = checkpoint.goals.every(goal => goal.checked);
      const wasHidden = checkpoint.nextChapter.hidden;
      checkpoint.nextChapter.hidden = !complete;

      if (complete && wasHidden) {
        checkpoint.nextChapter.classList.remove('is-celebrating');
        void checkpoint.nextChapter.offsetWidth;
        checkpoint.nextChapter.classList.add('is-celebrating');
        if (checkpoint.status) checkpoint.status.textContent = checkpoint.status.dataset.completeMessage || 'Alle Lernziele abgehakt. Der nächste Abschnitt ist freigeschaltet.';
        window.setTimeout(() => checkpoint.nextChapter.classList.remove('is-celebrating'), 1300);
      } else if (!complete) {
        checkpoint.nextChapter.classList.remove('is-celebrating');
        if (checkpoint.status) checkpoint.status.textContent = '';
      }
    };
    checkpoint.goals.forEach(goal => goal.addEventListener('change', updateNextChapter));
    document.addEventListener('rhythmus-goals:reset', updateNextChapter);
    updateNextChapter();
  });
})();
