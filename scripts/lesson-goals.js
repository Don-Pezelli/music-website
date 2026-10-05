(() => {
  const fieldset = document.querySelector('[data-unlock-goals]') || document.querySelector('#kapitelziel .exercise-goals');
  const nextChapter = document.querySelector('#next-chapter-card');
  const status = document.querySelector('[data-unlock-status]') || document.querySelector('#ziel-fertig-status');

  if (!fieldset || !nextChapter) return;

  const goals = Array.from(fieldset.querySelectorAll('input[type="checkbox"]'));

  const checklists = document.querySelectorAll('.exercise-goals[data-unlock-goals]');
  const visibleGoals = new Set();
  const animateGoal = (goal) => {
    if (goal.checked) return;
    goal.classList.remove('checklist-visible');
    void goal.offsetWidth;
    goal.classList.add('checklist-visible');
    window.setTimeout(() => goal.classList.remove('checklist-visible'), 1800);
  };

  if ('IntersectionObserver' in window) {
    const checklistObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (!visibleGoals.has(entry.target)) animateGoal(entry.target);
          visibleGoals.add(entry.target);
        } else {
          visibleGoals.delete(entry.target);
        }
      });
    }, { threshold: 1 });
    checklists.forEach((checklist) => {
      checklist.querySelectorAll('input[type="checkbox"]').forEach((goal) => checklistObserver.observe(goal));
    });
  } else {
    const updateFallbackVisibility = () => {
      checklists.forEach((checklist) => {
        checklist.querySelectorAll('input[type="checkbox"]').forEach((goal) => {
          const bounds = goal.getBoundingClientRect();
          const visible = bounds.bottom > 0 && bounds.top < window.innerHeight;
          if (visible) {
            if (!visibleGoals.has(goal)) animateGoal(goal);
            visibleGoals.add(goal);
          } else {
            visibleGoals.delete(goal);
          }
        });
      });
    };
    window.addEventListener('scroll', updateFallbackVisibility, { passive: true });
    window.addEventListener('resize', updateFallbackVisibility);
    updateFallbackVisibility();
  }

  window.setInterval(() => visibleGoals.forEach(animateGoal), 30000);

  function updateNextChapter() {
    const complete = goals.length > 0 && goals.every((goal) => goal.checked);
    const wasHidden = nextChapter.hidden;

    nextChapter.hidden = !complete;

    if (complete && wasHidden) {
      nextChapter.classList.remove('is-celebrating');
      void nextChapter.offsetWidth;
      nextChapter.classList.add('is-celebrating');
      if (status) status.textContent = 'Alle Lernziele abgehakt. Kapitel 2 ist freigeschaltet.';
      window.setTimeout(() => nextChapter.classList.remove('is-celebrating'), 1300);
    } else if (!complete) {
      nextChapter.classList.remove('is-celebrating');
      if (status) status.textContent = '';
    }
  }

  goals.forEach((goal) => goal.addEventListener('change', updateNextChapter));
  updateNextChapter();
})();
