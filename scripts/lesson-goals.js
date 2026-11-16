(() => {
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
        if (checkpoint.status) checkpoint.status.textContent = 'Alle Lernziele abgehakt. Der nächste Abschnitt ist freigeschaltet.';
        window.setTimeout(() => checkpoint.nextChapter.classList.remove('is-celebrating'), 1300);
      } else if (!complete) {
        checkpoint.nextChapter.classList.remove('is-celebrating');
        if (checkpoint.status) checkpoint.status.textContent = '';
      }
    };
    checkpoint.goals.forEach(goal => goal.addEventListener('change', updateNextChapter));
    updateNextChapter();
  });
})();
