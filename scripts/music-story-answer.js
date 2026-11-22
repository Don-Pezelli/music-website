(() => {
  document.querySelectorAll('[data-yes-no-question]').forEach((question) => {
    const answers = [...question.querySelectorAll('input[type="radio"]')];
    const feedback = question.querySelectorAll('[data-answer-feedback]');

    function showAnswer(value) {
      feedback.forEach((message) => {
        const response = message.dataset.answerFeedback;
        message.hidden = !value || (response !== value && response !== 'any');
      });
    }

    answers.forEach((answer) => {
      answer.addEventListener('change', () => {
        if (answer.checked) showAnswer(answer.value);
      });
    });

    showAnswer(answers.find((answer) => answer.checked)?.value);
  });
})();
