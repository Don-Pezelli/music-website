(() => {
  const scaleButtons = [...document.querySelectorAll('[data-scale-play]')];
  const semitoneButtons = [...document.querySelectorAll('[data-semitone-play]')];
  const degreeButtons = [...document.querySelectorAll('[data-degree-play]')];
  const patternButtons = [...document.querySelectorAll('[data-degree-pattern]')];
  const trainingPanels = [...document.querySelectorAll('[data-degree-training]')];
  if (!scaleButtons.length && !semitoneButtons.length && !degreeButtons.length && !patternButtons.length && !trainingPanels.length) return;
  const scalePitches = [60, 62, 64, 65, 67, 69, 71, 72];
  const degreeNames = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C'];
  const pitchNames = {59:'B',60:'C',62:'D',64:'E',65:'F',67:'G',69:'A',70:'B♭',71:'B',72:'C'};
  let context, activeOscillators = [];
  const stopAudio = () => {
    activeOscillators.forEach(oscillator => { try { oscillator.stop(); } catch {} });
    activeOscillators = [];
  };
  const playNotes = async (notes, status, message, options = {}) => {
    stopAudio();
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) { status.textContent = 'Audio wird von diesem Browser nicht unterstützt.'; return; }
    try {
      if (!context || context.state === 'closed') context = new Audio();
      if (context.state !== 'running') await context.resume();
      const start = context.currentTime + .08, duration = options.duration ?? .48, gap = options.gap ?? .12;
      let elapsed = 0;
      notes.forEach((midi, index) => {
        const oscillator = context.createOscillator(), gain = context.createGain();
        if (index === options.pauseAfterIndex + 1) elapsed += options.pauseDuration ?? 0;
        const noteDuration = index <= (options.fastUntilIndex ?? -1) ? (options.fastDuration ?? duration) : duration;
        const time = start + elapsed;
        oscillator.type = 'triangle';
        oscillator.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(.14, time + .025);
        gain.gain.setValueAtTime(.14, time + noteDuration - .08);
        gain.gain.linearRampToValueAtTime(0, time + noteDuration);
        oscillator.connect(gain); gain.connect(context.destination);
        oscillator.start(time); oscillator.stop(time + noteDuration + .02);
        activeOscillators.push(oscillator);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); activeOscillators = activeOscillators.filter(item => item !== oscillator); };
        elapsed += noteDuration + gap;
      });
      status.textContent = message;
    } catch {
      status.textContent = 'Das Hörbeispiel konnte nicht abgespielt werden. Versuche es noch einmal.';
    }
  };
  scaleButtons.forEach(button => button.addEventListener('click', () => {
    const down = button.dataset.scalePlay === 'down';
    const notes = down ? [...scalePitches].reverse() : scalePitches;
    playNotes(notes, document.querySelector('[data-scale-status]'), down ? 'C-Dur abwärts: C–B–A–G–F–E–D–C.' : 'C-Dur aufwärts: C–D–E–F–G–A–B–C.');
  }));
  semitoneButtons.forEach(button => button.addEventListener('click', () => {
    const pair = button.dataset.semitonePlay === 'e-f' ? [64, 65] : [71, 72];
    const label = button.dataset.semitonePlay === 'e-f' ? 'E–F' : 'B–C';
    playNotes(pair, document.querySelector('[data-scale-status]'), `${label}: zwei Töne mit einem Halbtonschritt Abstand.`);
  }));
  degreeButtons.forEach(button => button.addEventListener('click', () => {
    const degree = Number(button.dataset.degreePlay), note = scalePitches[degree - 1], status = document.querySelector('[data-degree-status]');
    playNotes([60, note, 60], status, `Stufe ${degree} (${degreeNames[degree - 1]}): C als Bezug, dann die Stufe und zurück zu C.`, { duration: .8, gap: .16 });
  }));
  patternButtons.forEach(button => button.addEventListener('click', () => {
    const pattern = button.dataset.degreePattern.split('-');
    const notes = pattern.map(token => { const lowered = token.startsWith('b'), lowOctave = token.endsWith('low'), degree = Number(token.replace('b', '').replace('low', '')); return scalePitches[degree - 1] - (lowered ? 1 : 0) - (lowOctave ? 12 : 0); });
    const displayPattern = pattern.map(token => token.endsWith('low') ? token.replace('low', '↓') : token).join('–');
    const statusMessage = pattern.join('-') === '7-8' ? 'Hörbeispiel abgespielt.' : `Merkmelodie ${displayPattern}: ${notes.map(note => pitchNames[note]).join('–')}.`;
    playNotes(notes, document.querySelector('[data-pattern-status]'), statusMessage);
  }));
  trainingPanels.forEach(trainingPanel => {
    const scaleButton = trainingPanel.querySelector('[data-training-scale]');
    const intervalButton = trainingPanel.querySelector('[data-training-interval]');
    const answerButtons = [...trainingPanel.querySelectorAll('[data-training-answer]')];
    const status = trainingPanel.querySelector('[data-training-status]');
    const scoreDisplay = trainingPanel.querySelector('[data-training-score]');
    const maxDegree = Number(trainingPanel.dataset.trainingMax || 7);
    const storageKey = `music-method-degree-training:${trainingPanel.dataset.trainingId || location.pathname}`;
    const queueStorageKey = `${storageKey}:target-queue`;
    let targetDegree = null, solved = false, correctCount = 0;
    let targetQueue = null;
    try {
      const savedCount = localStorage.getItem(storageKey) ?? (trainingPanel.dataset.trainingId === 'melodie-1' ? localStorage.getItem('music-method-degree-training:melodie-2') : null);
      correctCount = Number.parseInt(savedCount || '0', 10) || 0;
      if (maxDegree === 7) {
        const savedQueue = JSON.parse(localStorage.getItem(queueStorageKey) || 'null');
        const expected = [1,2,3,4,5,6,7];
        if (Array.isArray(savedQueue?.items) && savedQueue.items.length === 10 && Number.isInteger(savedQueue.index) && savedQueue.index >= 0 && savedQueue.index <= 10 && expected.every(degree => savedQueue.items.includes(degree))) {
          targetQueue = savedQueue;
        }
      }
    } catch {}
    const makeTargetQueue = () => {
      const items = [1,2,3,4,5,6,7];
      for (let index = 0; index < 3; index += 1) items.push(1 + Math.floor(Math.random() * 7));
      for (let index = items.length - 1; index > 0; index -= 1) {
        const other = Math.floor(Math.random() * (index + 1));
        [items[index], items[other]] = [items[other], items[index]];
      }
      return { items, index: 0 };
    };
    if (maxDegree === 7 && !targetQueue) targetQueue = makeTargetQueue();
    const updateScore = () => { scoreDisplay.textContent = `Richtige Antworten bisher: ${correctCount}`; };
    const nextTarget = () => {
      if (maxDegree !== 7) return 1 + Math.floor(Math.random() * maxDegree);
      if (targetQueue.index >= 10) targetQueue = makeTargetQueue();
      const target = targetQueue.items[targetQueue.index];
      targetQueue.index += 1;
      try { localStorage.setItem(queueStorageKey, JSON.stringify(targetQueue)); } catch {}
      return target;
    };
    updateScore();
    scaleButton.addEventListener('click', () => playNotes(scalePitches, status, 'C-Dur: C–D–E–F–G–A–B–C.'));
    intervalButton.addEventListener('click', () => {
      if (targetDegree === null || solved) {
        targetDegree = nextTarget();
        solved = false;
        answerButtons.forEach(button => { button.disabled = false; });
      }
      const target = scalePitches[targetDegree - 1];
      playNotes([60, target], status, 'Höre den Abstand von C zum Zielton und singe das Intervall ein paar Mal nach, bis es sicher im Ohr sitzt. Singe erst danach vom Zielton aus die passende Merkmelodie und wähle die gesuchte Stufe. Du kannst das Intervall erneut abspielen.');
    });
    answerButtons.forEach(button => button.addEventListener('click', () => {
      if (targetDegree === null || solved) return;
      const answer = Number(button.dataset.trainingAnswer);
      if (answer !== targetDegree) {
        status.textContent = 'Das stimmt noch nicht. Höre das Intervall erneut und singe es ein paar Mal nach. Wenn es sicher im Ohr sitzt, singe die Merkmelodie und versuche es noch einmal.';
        return;
      }
      solved = true;
      correctCount += 1;
      try { localStorage.setItem(storageKey, String(correctCount)); } catch {}
      updateScore();
      answerButtons.forEach(item => { item.disabled = true; });
      if (targetDegree === 1) {
        playNotes([60, 62, 60, 59, 60], status, 'Richtig: Stufe 1. Hier ist der passende Merkmelodie-Weg 1–2–1–7–1.');
      } else {
        const motif = patterns[targetDegree].map(degree => scalePitches[degree - 1]);
        playNotes(motif, status, `Richtig: Stufe ${targetDegree}. Hier ist der passende Merkmelodie-Weg ${patterns[targetDegree].join('–')}.`);
      }
    }));
  });
  window.addEventListener('pagehide', stopAudio);
})();
