document.querySelectorAll('[data-rest-calculator]').forEach(calculator => {
  const tasks = [...calculator.querySelectorAll('[data-rest-task]')];
  const choices = [...calculator.querySelectorAll('[data-rest-choice]')];
  const step = calculator.querySelector('[data-rest-step]');
  const status = calculator.querySelector('[data-rest-status]');
  const next = calculator.querySelector('[data-rest-next]');
  let index = 0;

  choices.forEach(choice => choice.addEventListener('click', () => {
    if (!next.hidden) return;
    const task = tasks[index];
    task.querySelector('[data-rest-answer]').textContent = choice.dataset.restChoice;
    const correct = choice.dataset.restChoice === task.dataset.answer;
    calculator.dataset.result = correct ? 'correct' : 'incorrect';
    const last = index === tasks.length - 1;
    status.textContent = correct
      ? last ? 'Richtig! Alle Aufgaben gelöst.' : 'Richtig!'
      : 'Versuch es noch einmal.';
    if (!correct) return;
    choices.forEach(button => { button.disabled = true; });
    if (last) {
      const reading = document.getElementById(calculator.dataset.readingTarget);
      if (reading) {
        window.setTimeout(() => {
          reading.focus({ preventScroll: true });
          reading.scrollIntoView({ block: 'start' });
        }, 900);
      }
      return;
    }
    next.hidden = false;
    next.focus();
  }));

  next.addEventListener('click', () => {
    tasks[index].hidden = true;
    index += 1;
    const task = tasks[index];
    task.querySelector('[data-rest-answer]').textContent = '?';
    task.hidden = false;
    step.textContent = `Aufgabe ${index + 1} von ${tasks.length}`;
    status.textContent = '';
    delete calculator.dataset.result;
    choices.forEach(button => { button.disabled = false; });
    task.querySelector('h4').setAttribute('tabindex', '-1');
    task.querySelector('h4').focus();
    next.hidden = true;
  });
});
