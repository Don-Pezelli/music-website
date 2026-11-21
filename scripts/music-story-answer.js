(() => {
  const answers = document.querySelectorAll('input[name="music-story-answer"]');
  const affirmation = document.getElementById('music-story-affirmation');
  const noResponse = document.getElementById('music-story-no-response');
  if (!affirmation || !noResponse || answers.length === 0) return;

  answers.forEach((answer) => {
    answer.addEventListener('change', () => {
      if (!answer.checked) return;
      affirmation.hidden = answer.value !== 'ja';
      noResponse.hidden = answer.value !== 'nein';
    });
  });
})();
