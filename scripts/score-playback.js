(() => {
  const button = document.querySelector('[data-score-play="whole-half-eight-bars"]');
  if (!button) return;

  const stage = button.parentElement.querySelector('.score-notation-link');
  const overlay = stage?.querySelector('.score-play-overlay');
  const counterLayer = overlay?.querySelector('[data-score-counter]');
  const pulseLayer = overlay?.querySelector('[data-score-pulses]');
  const status = button.parentElement.querySelector('[data-score-status]');
  const svgNS = 'http://www.w3.org/2000/svg';
  const bpm = 50;
  const beatSeconds = 60 / bpm;
  const countIn = 4;
  const bars = [[2, 2], [4], [4], [2, 2], [2, 2], [4], [2, 2], [4]];
  const beatXs = [
    [96, 147, 198, 249], [319, 368, 417, 466], [533, 582, 631, 680], [746, 794, 842, 890],
    [96, 147, 198, 249], [319, 368, 417, 466], [533, 582, 631, 680], [746, 794, 842, 890],
  ];
  const rowYs = [31, 166];
  const noteYs = [80, 215];
  const notes = [
    [{ beat: 0, x: 105, duration: 2 }, { beat: 2, x: 199, duration: 2 }],
    [{ beat: 0, x: 319, duration: 4 }], [{ beat: 0, x: 533, duration: 4 }],
    [{ beat: 0, x: 746, duration: 2 }, { beat: 2, x: 840, duration: 2 }],
    [{ beat: 0, x: 105, duration: 2 }, { beat: 2, x: 199, duration: 2 }],
    [{ beat: 0, x: 319, duration: 4 }],
    [{ beat: 0, x: 533, duration: 2 }, { beat: 2, x: 626, duration: 2 }],
    [{ beat: 0, x: 746, duration: 4 }],
  ];
  let context;
  let nodes = [];
  let timer;
  let ticker;
  let startedAt = 0;
  let playing = false;

  const svgElement = (name, attrs = {}) => {
    const element = document.createElementNS(svgNS, name);
    Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
    return element;
  };

  const clearCounter = () => { if (counterLayer) counterLayer.replaceChildren(); };
  const showCounter = (number, x, y) => {
    if (!counterLayer) return;
    clearCounter();
    counterLayer.append(
      svgElement('rect', { x: x - 17, y: y - 25, width: 34, height: 34, rx: 6, class: 'score-counter-badge' }),
      svgElement('text', { x, y, 'text-anchor': 'middle', class: 'score-counter-number' }),
    );
    counterLayer.querySelector('text').textContent = String(number);
  };

  const pulseNote = (bar, beat) => {
    if (!pulseLayer) return;
    const note = notes[bar]?.find((entry) => entry.beat === beat);
    if (!note) return;
    const circle = svgElement('circle', { cx: note.x, cy: noteYs[Math.floor(bar / 4)], r: 15, class: 'score-note-pulse' });
    pulseLayer.append(circle);
    window.setTimeout(() => circle.remove(), 680);
  };

  const addClick = (time, accent) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(accent ? 1120 : 760, time);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(accent ? 0.3 : 0.19, time + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.075);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(time);
    oscillator.stop(time + 0.08);
    nodes.push(oscillator, gain);
  };

  const addNote = (time, duration) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(392, time);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.13, time + 0.035);
    gain.gain.setValueAtTime(0.13, time + duration - 0.07);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration - 0.015);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(time);
    oscillator.stop(time + duration);
    nodes.push(oscillator, gain);
  };

  const stop = async (message = 'Wiedergabe gestoppt.') => {
    playing = false;
    clearTimeout(timer);
    clearInterval(ticker);
    nodes.forEach((node) => {
      try { node.stop(); } catch {}
      try { node.disconnect(); } catch {}
    });
    nodes = [];
    if (context && context.state !== 'closed') {
      try { await context.close(); } catch {}
    }
    context = undefined;
    button.textContent = '▶';
    button.setAttribute('aria-label', 'Leseübung abspielen');
    button.setAttribute('aria-pressed', 'false');
    clearCounter();
    if (pulseLayer) pulseLayer.replaceChildren();
    if (status) status.textContent = message;
  };

  const update = () => {
    const elapsed = Math.max(0, (performance.now() - startedAt) / 1000);
    if (elapsed < countIn * beatSeconds) {
      const beat = Math.min(countIn - 1, Math.floor(elapsed / beatSeconds));
      showCounter(beat + 1, 56, 34);
      if (status) status.textContent = `Einzähler, Schlag ${beat + 1} von ${countIn}.`;
      return;
    }
    const playbackBeat = Math.min(bars.length * 4 - 1, Math.floor((elapsed - countIn * beatSeconds) / beatSeconds));
    const bar = Math.floor(playbackBeat / 4);
    const beatInBar = playbackBeat % 4;
    const x = beatXs[bar][beatInBar];
    const y = rowYs[Math.floor(bar / 4)];
    showCounter(beatInBar + 1, x, y);
    if (status) status.textContent = `Takt ${bar + 1} von ${bars.length}, Schlag ${beatInBar + 1}.`;
  };

  const start = async () => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      if (status) status.textContent = 'Dieser Browser unterstützt keine Audio-Wiedergabe.';
      return;
    }
    try {
      context = new AudioContextClass();
      await context.resume();
      const startAt = context.currentTime + 0.12;
      startedAt = performance.now() + 120;
      for (let beat = 0; beat < countIn; beat += 1) addClick(startAt + beat * beatSeconds, beat === 0);
      for (let beat = 0; beat < bars.length * 4; beat += 1) {
        const bar = Math.floor(beat / 4);
        const beatInBar = beat % 4;
        const time = startAt + (countIn + beat) * beatSeconds;
        addClick(time, beatInBar === 0);
        const note = notes[bar].find((entry) => entry.beat === beatInBar);
        if (note) {
          addNote(time, note.duration * beatSeconds);
          window.setTimeout(() => { if (playing) pulseNote(bar, beatInBar); }, (countIn + beat) * beatSeconds * 1000 + 120);
        }
      }
      playing = true;
      button.textContent = '■';
      button.setAttribute('aria-label', 'Wiedergabe stoppen');
      button.setAttribute('aria-pressed', 'true');
      update();
      ticker = window.setInterval(update, 80);
      timer = window.setTimeout(() => stop('Leseübung beendet.'), (countIn + bars.length * 4) * beatSeconds * 1000 + 150);
    } catch {
      await stop('Die Wiedergabe konnte nicht gestartet werden.');
    }
  };

  button.addEventListener('click', () => playing ? stop() : start());
})();
