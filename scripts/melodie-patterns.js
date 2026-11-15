(() => {
  const buttons = [...document.querySelectorAll('[data-melody-example]')];
  if (!buttons.length) return;
  let context;
  let activeOscillators = [];
  let activeToggleButton = null;
  const announceScaleFinished = button => {
    if (button?.dataset.melodyFlowScale === 'true') button.dispatchEvent(new CustomEvent('melody:scale-finished', { bubbles: true }));
  };
  const stopAudio = (userStopped = false) => {
    activeOscillators.forEach(oscillator => { try { oscillator.stop(); } catch {} });
    activeOscillators = [];
    const stoppedButton = activeToggleButton;
    if (activeToggleButton) {
      activeToggleButton.textContent = activeToggleButton.dataset.melodyIdleText || '▶ Tonleiter';
      activeToggleButton.setAttribute('aria-pressed', 'false');
      activeToggleButton = null;
    }
    if (userStopped) announceScaleFinished(stoppedButton);
  };
  document.querySelectorAll('.melody-level-group').forEach(group => {
    const rootButton = group.querySelector('.melody-level-tools [data-melody-label="den Grundton"]');
    const scaleButton = group.querySelector('.melody-level-tools [data-melody-toggle]');
    const taskPlayButton = group.querySelector('[data-melody-task-play]');
    const solutionButton = group.querySelector('[data-melody-show-solution]');
    const solutionArea = group.querySelector('[data-current-solution]');
    const flowStatus = group.querySelector('[data-melody-flow-status]');
    const taskCards = [...group.querySelectorAll('.melody-listen-task[data-task-example]')];
    const solutions = [...group.querySelectorAll('.melody-listen-task details')];
    if (!rootButton || !scaleButton || !taskPlayButton || !solutionButton || !solutionArea || taskCards.length !== 3 || solutions.length !== 3) return;
    scaleButton.dataset.melodyFlowScale = 'true';
    let step = 0, taskIndex = 0;
    const setInstruction = text => { if (flowStatus) flowStatus.textContent = text; };
    const showStep = button => {
      group.querySelectorAll('.flow-step-active').forEach(item => item.classList.remove('flow-step-active'));
      button?.classList.add('flow-step-active');
    };
    const selectTask = index => {
      taskIndex = index;
      const source = taskCards[taskIndex];
      const fields = { melodyExample: 'taskExample', melodyBpm: 'taskBpm', melodyRhythm: 'taskRhythm', melodyPart: 'taskPart', melodyLabel: 'taskLabel' };
      Object.entries(fields).forEach(([targetKey, sourceKey]) => {
        if (source.dataset[sourceKey] === undefined) delete taskPlayButton.dataset[targetKey];
        else taskPlayButton.dataset[targetKey] = source.dataset[sourceKey];
      });
      taskPlayButton.textContent = `▶ Aufgabe abspielen ${taskIndex + 1}/3`;
    };
    solutionButton.addEventListener('click', () => {
      if (solutionArea.classList.contains('is-open')) {
        solutionArea.classList.remove('is-open');
        solutionArea.setAttribute('aria-hidden', 'true');
        solutionButton.textContent = 'Lösung anzeigen';
        solutionButton.setAttribute('aria-expanded', 'false');
        showStep(solutionButton);
        setInstruction('Die Lösung ist geschlossen. Du kannst sie erneut anzeigen.');
        return;
      }
      solutionArea.replaceChildren();
      [...solutions[taskIndex].children].filter(item => item.tagName !== 'SUMMARY').forEach(item => solutionArea.append(item.cloneNode(true)));
      solutionArea.setAttribute('aria-hidden', 'false');
      solutionButton.textContent = 'Lösung schließen';
      solutionButton.setAttribute('aria-expanded', 'true');
      const next = document.createElement('button');
      next.type = 'button';
      next.className = 'intonation-link melody-task-next';
      next.textContent = 'Nächste Aufgabe';
      solutionArea.append(next);
      showStep(next);
      setInstruction('Prüfe deine Antwort. Klicke danach auf „Nächste Aufgabe“.');
      requestAnimationFrame(() => solutionArea.classList.add('is-open'));
      next.addEventListener('click', () => {
        const nextIndex = (taskIndex + 1) % taskCards.length;
        selectTask(nextIndex);
        solutionArea.classList.remove('is-open');
        solutionArea.setAttribute('aria-hidden', 'true');
        solutionButton.textContent = 'Lösung anzeigen';
        solutionButton.setAttribute('aria-expanded', 'false');
        step = 2;
        showStep(taskPlayButton);
        setInstruction(`Notiere die Noten als Zahlen. Aufgabe ${nextIndex + 1}/3.`);
      });
    });
    selectTask(0);
    step = 0;
    showStep(rootButton);
    rootButton.addEventListener('click', () => {
      if (step === 0) {
        step = 1;
        showStep(scaleButton);
        setInstruction('Klicke auf „Tonleiter“, um alle Stufen zu hören.');
      }
    });
    scaleButton.addEventListener('click', () => {
      if (step === 1) setInstruction('Zuhören.');
    });
    scaleButton.addEventListener('melody:scale-finished', () => {
      if (step === 1) {
        step = 2;
        showStep(taskPlayButton);
        setInstruction('Höre jetzt Aufgabe 1 an.');
      }
    });
    taskPlayButton.addEventListener('click', () => {
      if (step === 2) setInstruction('Notiere die Noten als Zahlen.');
    });
  });
  const playMelody = async (button) => {
    stopAudio();
    const status = button.closest('.intonation-panel, .lesson-section')?.querySelector('[data-melody-status]') || document.querySelector('[data-melody-status]');
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) {
      if (status) status.textContent = 'Audio wird von diesem Browser nicht unterstützt.';
      return;
    }
    try {
      if (!context || context.state === 'closed') context = new Audio();
      if (context.state !== 'running') await context.resume();
      let bars = button.dataset.melodyExample.split('|').map(bar => bar.split(',').map(Number));
      const duration = .48, gap = .1, beatDuration = button.dataset.melodyBpm ? 60 / Number(button.dataset.melodyBpm) : .58, barPause = Number(button.dataset.melodyBarPause ?? 0);
      let rhythm = button.dataset.melodyRhythm?.split(',').map(Number) || null;
      const part = button.dataset.melodyPart;
      if (part === '0' || part === '1') {
        const selectedBar = Number(part);
        const rhythmStart = bars.slice(0, selectedBar).reduce((total, bar) => total + bar.length, 0);
        rhythm = rhythm ? rhythm.slice(rhythmStart, rhythmStart + bars[selectedBar].length) : null;
        bars = [bars[selectedBar]];
      }
      const countIn = button.hasAttribute('data-melody-task-play');
      const countInStart = context.currentTime + .08;
      const start = countIn ? countInStart + beatDuration * 4 : countInStart;
      if (countIn) {
        const scheduleClick = (time, accented = false) => {
          const click = context.createOscillator(), clickGain = context.createGain();
          click.type = 'sine';
          click.frequency.setValueAtTime(accented ? 1560 : 1120, time);
          clickGain.gain.setValueAtTime(0, time);
          clickGain.gain.linearRampToValueAtTime(accented ? .2 : .13, time + .003);
          clickGain.gain.exponentialRampToValueAtTime(.001, time + .045);
          click.connect(clickGain); clickGain.connect(context.destination);
          click.start(time); click.stop(time + .05);
          activeOscillators.push(click);
          click.onended = () => { click.disconnect(); clickGain.disconnect(); activeOscillators = activeOscillators.filter(item => item !== click); };
        };
        for (let beat = 0; beat < 4; beat += 1) scheduleClick(countInStart + beat * beatDuration, beat === 0);
        for (let beat = 0; beat < bars.length * 4; beat += 1) scheduleClick(start + beat * beatDuration, beat % 4 === 0);
        if (status) status.textContent = 'Zähle mit: 1, 2, 3, 4. Danach beginnt die Melodie.';
      }
      let elapsed = 0, noteIndex = 0;
      bars.forEach((bar, barIndex) => {
        bar.forEach(degree => {
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          const time = start + elapsed;
          const rhythmicSpacing = rhythm ? beatDuration * (rhythm[noteIndex] === 8 ? .5 : rhythm[noteIndex] === 2 ? 2 : 1) : duration + gap;
          const noteDuration = rhythm ? Math.max(.12, rhythmicSpacing - .04) : duration;
          const midi = 60 + [0,2,4,5,7,9,11,12][degree - 1];
          oscillator.type = 'triangle';
          oscillator.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
          gain.gain.setValueAtTime(0, time);
          gain.gain.linearRampToValueAtTime(.14, time + .025);
          gain.gain.setValueAtTime(.14, time + noteDuration - .06);
          gain.gain.linearRampToValueAtTime(0, time + noteDuration);
          oscillator.connect(gain);
          gain.connect(context.destination);
          oscillator.start(time);
          oscillator.stop(time + noteDuration + .02);
          oscillator.onended = () => {
            oscillator.disconnect();
            gain.disconnect();
            activeOscillators = activeOscillators.filter(item => item !== oscillator);
            if (!activeOscillators.length && activeToggleButton) {
              const finishedButton = activeToggleButton;
              activeToggleButton.textContent = activeToggleButton.dataset.melodyIdleText || '▶ Tonleiter';
              activeToggleButton.setAttribute('aria-pressed', 'false');
              activeToggleButton = null;
              announceScaleFinished(finishedButton);
            }
          };
          activeOscillators.push(oscillator);
          elapsed += rhythmicSpacing;
          noteIndex += 1;
        });
        if (barIndex < bars.length - 1) elapsed += barPause;
      });
      if (button.hasAttribute('data-melody-toggle')) {
        button.dataset.melodyIdleText ||= button.textContent;
        activeToggleButton = button;
        button.textContent = '■ Tonleiter stoppen';
        button.setAttribute('aria-pressed', 'true');
      }
      if (status) status.textContent = button.hasAttribute('data-melody-task-play') ? '' : button.dataset.melodyLabel ? `Spiele ${button.dataset.melodyLabel} ab.` : part === '0' ? 'Höre Takt 1 und singe ihn anschließend mit.' : part === '1' ? 'Höre Takt 2 und singe ihn anschließend mit.' : 'Höre beide Takte und singe sie anschließend mit.';
    } catch {
      if (status) status.textContent = 'Das Hörbeispiel konnte nicht abgespielt werden. Versuche es noch einmal.';
    }
  };
  buttons.forEach(button => button.addEventListener('click', () => {
    if (button === activeToggleButton) {
      stopAudio(true);
      const status = button.closest('.intonation-panel, .lesson-section')?.querySelector('[data-melody-status]') || document.querySelector('[data-melody-status]');
      if (status) status.textContent = 'Tonleiter gestoppt.';
      return;
    }
    playMelody(button);
  }));
  window.addEventListener('pagehide', stopAudio);
})();
