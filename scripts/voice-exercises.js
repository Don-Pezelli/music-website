document.querySelectorAll('.voice-airflow').forEach(exercise => {
  const phaseLabel = exercise.querySelector('[data-airflow-phase]');
  const beatLabel = exercise.querySelector('[data-airflow-beat]');
  const phases = [
    { key: 'count', label: 'Einzähler · 5/4', beats: 5 },
    { key: 'exhale', label: 'Auf S oder F ausatmen', beats: 5 },
    { key: 'recover', label: 'Erholen · frei atmen', beats: 10 }
  ];
  const cycleBeats = phases.reduce((total, phase) => total + phase.beats, 0);
  let audio;
  let pendingBeat;

  function playClick() {
    if (audio?.state !== 'running') return;
    const click = audio.createOscillator();
    const level = audio.createGain();
    const now = audio.currentTime;
    click.frequency.value = 740;
    level.gain.setValueAtTime(.08, now);
    level.gain.exponentialRampToValueAtTime(.001, now + .055);
    click.connect(level).connect(audio.destination);
    click.onended = () => {
      click.disconnect();
      level.disconnect();
    };
    click.start(now);
    click.stop(now + .06);
  }

  exercise.querySelector('summary').addEventListener('click', () => {
    if (exercise.open || !window.AudioContext) return;
    audio ??= new AudioContext();
    audio.resume().catch(() => {});
  });

  exercise.addEventListener('toggle', () => {
    clearTimeout(pendingBeat);
    delete exercise.dataset.phase;
    if (!exercise.open) return;
    const start = performance.now();

    function advance() {
      if (!exercise.open) return;
      const elapsed = performance.now() - start;
      let beat = Math.floor(elapsed / 1000) % cycleBeats;
      const phase = phases.find(entry => {
        if (beat < entry.beats) return true;
        beat -= entry.beats;
        return false;
      });
      exercise.dataset.phase = phase.key;
      phaseLabel.textContent = phase.label;
      beatLabel.textContent = `${beat + 1} / ${phase.beats}`;
      if (phase.key === 'count') playClick();
      pendingBeat = setTimeout(advance, Math.ceil(1000 - (elapsed % 1000)));
    }

    advance();
  });
});
