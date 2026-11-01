(() => {
  const buttons = [...document.querySelectorAll('[data-melody-example]')];
  if (!buttons.length) return;
  let context;
  let activeOscillators = [];
  const stopAudio = () => {
    activeOscillators.forEach(oscillator => { try { oscillator.stop(); } catch {} });
    activeOscillators = [];
  };
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
      const start = context.currentTime + .08;
      const duration = .48, gap = .1, beatDuration = button.dataset.melodyBpm ? 60 / Number(button.dataset.melodyBpm) : .58, barPause = Number(button.dataset.melodyBarPause ?? .35);
      let rhythm = button.dataset.melodyRhythm?.split(',').map(Number) || null;
      const part = button.dataset.melodyPart;
      if (part === '0' || part === '1') {
        const selectedBar = Number(part);
        const rhythmStart = bars.slice(0, selectedBar).reduce((total, bar) => total + bar.length, 0);
        rhythm = rhythm ? rhythm.slice(rhythmStart, rhythmStart + bars[selectedBar].length) : null;
        bars = [bars[selectedBar]];
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
          };
          activeOscillators.push(oscillator);
          elapsed += rhythmicSpacing;
          noteIndex += 1;
        });
        if (barIndex < bars.length - 1) elapsed += barPause;
      });
      if (status) status.textContent = button.dataset.melodyLabel ? `Spiele ${button.dataset.melodyLabel} ab.` : part === '0' ? 'Höre Takt 1 und singe ihn anschließend mit.' : part === '1' ? 'Höre Takt 2 und singe ihn anschließend mit.' : 'Höre beide Takte und singe sie anschließend mit.';
    } catch {
      if (status) status.textContent = 'Das Hörbeispiel konnte nicht abgespielt werden. Versuche es noch einmal.';
    }
  };
  buttons.forEach(button => button.addEventListener('click', () => playMelody(button)));
  window.addEventListener('pagehide', stopAudio);
})();
