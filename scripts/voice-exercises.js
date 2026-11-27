function formatVoiceTime(seconds) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

document.querySelectorAll('.voice-airflow').forEach(exercise => {
  const button = exercise.querySelector('[data-airflow-toggle]');
  const phaseLabel = exercise.querySelector('[data-airflow-phase]');
  const beatLabel = exercise.querySelector('[data-airflow-beat]');
  const beatStrip = exercise.querySelector('[data-airflow-beat-strip]');
  const beatSquares = Array.from(beatStrip?.children ?? []);
  const nextLabel = exercise.querySelector('[data-airflow-next]');
  const registerLabel = exercise.querySelector('[data-airflow-register]');
  const registers = ['Tief', 'Mittel', 'Hoch'];
  const metronome = exercise.dataset.airflowMetronome !== undefined;
  const progressBar = exercise.querySelector('[data-airflow-phase-progress]');
  const tutorialId = exercise.dataset.airflowTutorial;
  const tutorial = tutorialId ? document.getElementById(tutorialId) : null;
  let tutorialComplete = !tutorial;
  const phases = [
    { key: 'count', label: exercise.dataset.airflowCountLabel || 'Einzähler · 5/4', beats: 5 },
    { key: 'inhale', label: nextLabel ? '3s einatmen' : 'Entspannt einatmen', beats: 3 },
    { key: 'hold', label: nextLabel ? '2s halten' : 'Kurz halten', beats: 2 },
    { key: 'exhale', label: nextLabel ? '5s ausatmen S' : 'Auf S oder F ausatmen', beats: 5 },
    { key: 'recover', label: nextLabel ? '10s erholen' : 'Erholen · frei atmen', beats: 10 }
  ];
  const duration = Number(exercise.dataset.airflowDuration);
  const timer = exercise.querySelector('[data-warmup-time]');
  const countOnce = Boolean(timer) || exercise.dataset.airflowCountOnce !== undefined;
  const countBeats = phases[0].beats;
  const breathingBeats = phases.slice(1).reduce((total, phase) => total + phase.beats, 0);
  const cycleBeats = countBeats + breathingBeats;
  let audio;
  let pendingBeat;
  let progressAnimation;

  function playClick(accent) {
    if (audio?.state !== 'running') return;
    const click = audio.createOscillator();
    const level = audio.createGain();
    const now = audio.currentTime;
    click.frequency.value = accent ? 990 : 740;
    level.gain.setValueAtTime(accent ? .145 : .08, now);
    level.gain.exponentialRampToValueAtTime(.001, now + .055);
    click.connect(level).connect(audio.destination);
    click.onended = () => {
      click.disconnect();
      level.disconnect();
    };
    click.start(now);
    click.stop(now + .06);
  }

  function stop(label) {
    clearTimeout(pendingBeat);
    pendingBeat = undefined;
    delete exercise.dataset.phase;
    progressAnimation?.cancel();
    if (progressBar) progressBar.style.clipPath = '';
    phaseLabel.textContent = label;
    if (nextLabel) nextLabel.textContent = '';
    if (registerLabel) registerLabel.textContent = '';
    beatLabel.hidden = true;
    button.textContent = 'Start';
  }

  function openTutorial() {
    tutorial.scrollIntoView({ block: 'start' });
    tutorial.querySelector('h5').focus({ preventScroll: true });
  }

  if (tutorial) {
    exercise.querySelector('[data-airflow-tutorial-link]')?.addEventListener('click', event => {
      event.preventDefault();
      openTutorial();
    });
  }

  tutorial?.querySelector('[data-airflow-tutorial-done]').addEventListener('click', () => {
    tutorialComplete = true;
    if (pendingBeat === undefined) {
      phaseLabel.textContent = exercise.dataset.airflowIdleLabel ?? 'Bereit';
      button.textContent = 'Start';
    }
    exercise.scrollIntoView({ block: 'start' });
    button.focus({ preventScroll: true });
  });

  button.addEventListener('click', () => {
    if (!tutorialComplete) {
      openTutorial();
      return;
    }
    if (pendingBeat !== undefined) {
      stop(exercise.dataset.airflowIdleLabel ?? 'Bereit');
      if (timer) timer.textContent = formatVoiceTime(duration);
      return;
    }

    if (window.AudioContext) {
      audio ??= new AudioContext();
      audio.resume().catch(() => {});
    }
    button.textContent = 'Stopp';
    beatLabel.hidden = false;
    const start = performance.now();

    function advance() {
      const elapsed = performance.now() - start;
      const seconds = Math.floor(elapsed / 1000);
      const practiceSeconds = Math.max(0, seconds - countBeats);
      if (timer) {
        timer.textContent = formatVoiceTime(Math.max(0, duration - practiceSeconds));
        if (practiceSeconds >= duration) {
          stop('Fertig');
          return;
        }
      }
      let beat = countOnce && seconds >= countBeats
        ? countBeats + practiceSeconds % breathingBeats
        : seconds % cycleBeats;
      const phase = phases.find(entry => {
        if (beat < entry.beats) return true;
        beat -= entry.beats;
        return false;
      });
      if (progressBar) {
        const inhaleEnd = phases[1].beats / countBeats;
        const from = phase.key === 'hold' ? inhaleEnd : 0;
        const to = phase.key === 'inhale' ? inhaleEnd : 1;
        const clip = fill => `inset(0 ${(1 - fill) * 100}% 0 0)`;

        if (phase.key === 'count') {
          progressAnimation?.cancel();
          progressAnimation = undefined;
          progressBar.style.clipPath = '';
        } else if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          progressBar.style.clipPath = clip(from + (to - from) * (beat + 1) / phase.beats);
        } else if (exercise.dataset.phase !== phase.key) {
          progressBar.style.clipPath = '';
          progressAnimation?.cancel();
          progressAnimation = progressBar.animate(
            [{ clipPath: clip(from) }, { clipPath: clip(to) }],
            { duration: phase.beats * 1000, fill: 'both' }
          );
          progressAnimation.currentTime = beat * 1000 + elapsed % 1000;
        }
      }
      const phaseChanged = exercise.dataset.phase !== phase.key;
      exercise.dataset.phase = phase.key;
      phaseLabel.textContent = timer && phase.key === 'exhale'
        ? `Auf ${Math.floor(practiceSeconds / breathingBeats) % 2 === 0 ? 'S' : 'F'} ausatmen`
        : phase.label;
      if (nextLabel) {
        const nextIndex = (phases.indexOf(phase) + 1) % phases.length;
        nextLabel.textContent = phases[countOnce && nextIndex === 0 ? 1 : nextIndex].label;
        if (phaseChanged && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          phaseLabel.animate?.([
            { opacity: .55, transform: 'perspective(240px) rotateX(-35deg)' },
            { opacity: 1, transform: 'perspective(240px) rotateX(0deg)' }
          ], { duration: 220, easing: 'ease-out' });
        }
      }
      if (registerLabel) {
        const round = Math.floor(practiceSeconds / breathingBeats);
        const nextRound = round + (phase.key === 'recover' ? 1 : 0);
        registerLabel.textContent = registers[nextRound % registers.length];
      }
      const beatInBar = (beat + (phase.key === 'hold' ? phases[1].beats : 0)) % countBeats;
      if (beatSquares.length) {
        beatSquares.forEach((square, index) => {
          square.classList.toggle('is-filled', index <= beatInBar);
          square.classList.toggle('is-current', index === beatInBar);
        });
        beatLabel.textContent = `Gruppe ${beatInBar < 3 ? 1 : 2}, Zählzeit ${beatSquares[beatInBar].textContent}`;
      } else {
        beatLabel.textContent = `${beat + 1} / ${phase.beats}`;
      }
      if (phase.key === 'count' || metronome) playClick(beatSquares.length > 0 && (beatInBar === 0 || beatInBar === 3));
      pendingBeat = setTimeout(advance, Math.ceil(1000 - (elapsed % 1000)));
    }

    advance();
  });
});

document.querySelectorAll('[data-warmup-seconds]').forEach(timer => {
  const duration = Number(timer.dataset.warmupSeconds);
  const button = timer.querySelector('[data-warmup-toggle]');
  const time = timer.querySelector('[data-warmup-time]');
  const status = timer.querySelector('[data-warmup-status]');
  let pendingTick;

  button.addEventListener('click', () => {
    if (pendingTick !== undefined) {
      clearTimeout(pendingTick);
      pendingTick = undefined;
      time.textContent = formatVoiceTime(duration);
      button.textContent = 'Start';
      status.textContent = '';
      return;
    }
    const start = performance.now();
    button.textContent = 'Stopp';
    status.textContent = '';

    function tick() {
      const elapsed = performance.now() - start;
      const left = Math.max(0, duration - Math.floor(elapsed / 1000));
      time.textContent = formatVoiceTime(left);
      if (left === 0) {
        pendingTick = undefined;
        button.textContent = 'Start';
        status.textContent = 'Übungszeit beendet.';
        return;
      }
      pendingTick = setTimeout(tick, Math.ceil(1000 - (elapsed % 1000)));
    }

    tick();
  });
});
