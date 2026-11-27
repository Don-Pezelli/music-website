(() => {
  document.querySelectorAll('[data-clap-checker]').forEach((root) => {

  const patternHost = root.querySelector('[data-clap-patterns]');
  const micButton = root.querySelector('[data-clap-mic]');
  const onAir = root.querySelector('[data-clap-on-air]');
  const startButton = root.querySelector('[data-clap-start]');
  const tempoOutput = root.querySelector('[data-clap-bpm]');
  const tempoNeedle = root.querySelector('[data-clap-needle]');
  const tempoButtons = [...root.querySelectorAll('[data-clap-tempo]')];
  const status = root.querySelector('[data-clap-status]');
  const clapDisplay = root.querySelector('[data-clap-display]');
  const liveClapCounter = document.createElement('span');
  liveClapCounter.className = 'clap-live-counter';
  liveClapCounter.hidden = true;
  liveClapCounter.setAttribute('aria-hidden', 'true');
  clapDisplay.append(liveClapCounter);
  const controlPanel = root.querySelector('.clap-checker-controls');
  const helpButton = root.querySelector('[data-clap-help]');
  const nextTaskButton = root.querySelector('[data-clap-next-task]');
  const editorFinish = root.querySelector('[data-clap-editor-finish]');
  const headphoneToggle = root.querySelector('[data-clap-headphones]');
  const auxJack = root.querySelector('[data-clap-aux-jack]');
  const infoToggle = root.querySelector('[data-clap-info-toggle]');
  const barScope = root.querySelector('[data-clap-bar-scope]');
  const barScopeButtons = [...root.querySelectorAll('[data-clap-bars]')];
  const barScopeStatus = root.querySelector('[data-clap-bars-status]');
  const storageKey = root.dataset.clapStorageKey || 'the-tree-of-music-rhythm-task5-patterns';
  const fixedScore = root.dataset.clapFixedScore === 'true';
  let customScore = null;
  try { customScore = JSON.parse(root.dataset.clapCustomScore || 'null'); } catch { customScore = null; }
  let nextCustomScore = null;
  try { nextCustomScore = JSON.parse(root.dataset.clapNextScore || 'null'); } catch { nextCustomScore = null; }
  let customScoreQueue = [];
  try { customScoreQueue = JSON.parse(root.dataset.clapNextScoreQueue || '[]'); } catch { customScoreQueue = []; }
  const guidedScore = fixedScore || root.dataset.clapGuidedScore === 'true';
  const clapThreshold = .065;
  let tempo = Number(root.dataset.clapStartBpm || (fixedScore ? 80 : 50));
  let beatMs = 60000 / tempo;
  tempoOutput.textContent = `${tempo} BPM`;
  const tolerance = .32;
  const congratulationMessages = [
    'Treffer!', 'Gut gemacht!', 'Richtig!', 'Bingo!', 'Yes!', 'Korrekt!',
    'Super!', 'Weiter so!', 'Genau richtig!', 'Juppie!', 'Juhu!', 'Wow!',
    'Nailed it!', 'Oh yeah!'
  ];
  let congratulationBag = [];
  let selectedBars = new Set();
  let patterns = [], selected = null, stream = null, audioContext = null;
  let analyser = null, frame = 0, running = false, claps = [], lastClap = -Infinity;
  let readingTimer = 0, currentExerciseIndex = 0, helpContext = null, helpNodes = [], helpTimer = 0, helpTicker = 0, helpStartedAt = 0, helpRunning = false, scoreCounterLayer = null, scoreErrorLayer = null, scoreCountLabelsLayer = null;
  let metronomeContext = null, metronomeTimer = 0, metronomeEpoch = 0, metronomeBeat = 0;
  const scoreSvgNS = 'http://www.w3.org/2000/svg';
  const scoreBeatXs = [[96, 147, 198, 249], [319, 368, 417, 466], [533, 582, 631, 680], [746, 794, 842, 890]];
  let infoMode = false, pinnedInfo = null, infoPopup = null;

  function hideInfo() {
    if (!infoPopup) return;
    infoPopup.hidden = true;
    pinnedInfo = null;
  }
  function showInfo(marker, message, pin = false) {
    if (!infoPopup) {
      infoPopup = document.createElement('div');
      infoPopup.className = 'clap-info-popover';
      infoPopup.setAttribute('role', 'tooltip');
      document.body.append(infoPopup);
    }
    infoPopup.textContent = message;
    infoPopup.hidden = false;
    const rect = marker.getBoundingClientRect();
    const width = infoPopup.offsetWidth;
    const height = infoPopup.offsetHeight;
    const left = Math.max(12, Math.min(window.innerWidth - width - 12, rect.left + rect.width / 2 - width / 2));
    const below = rect.bottom + 8;
    const top = below + height <= window.innerHeight - 12 ? below : Math.max(12, rect.top - height - 8);
    infoPopup.style.left = `${left}px`;
    infoPopup.style.top = `${top}px`;
    if (pin) pinnedInfo = marker;
  }
  function addInfoMarker(target, message, wrapper = null) {
    if (!target || target.dataset.clapInfoAttached === 'true') return;
    let anchor = target;
    if (wrapper) {
      anchor = document.createElement('span');
      anchor.className = `clap-info-anchor ${wrapper === 'fill' ? 'clap-info-fill' : 'clap-info-inline'}`;
      target.before(anchor);
      anchor.append(target);
    } else {
      anchor.classList.add('clap-info-anchor');
    }
    target.dataset.clapInfoAttached = 'true';
    const marker = document.createElement('button');
    marker.type = 'button';
    marker.className = 'clap-info-marker';
    marker.textContent = 'i';
    marker.setAttribute('aria-label', `Info: ${message}`);
    marker.title = 'Erklärung anzeigen';
    marker.hidden = !infoMode;
    const enter = () => { if (infoMode) showInfo(marker, message); };
    marker.addEventListener('mouseenter', enter);
    marker.addEventListener('focus', enter);
    marker.addEventListener('mouseleave', () => { if (pinnedInfo !== marker) hideInfo(); });
    marker.addEventListener('blur', () => { if (pinnedInfo !== marker) hideInfo(); });
    marker.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      if (pinnedInfo === marker) hideInfo();
      else showInfo(marker, message, true);
    });
    anchor.append(marker);
  }
  if (infoToggle) {
    infoToggle.addEventListener('click', () => {
      infoMode = !infoMode;
      root.classList.toggle('clap-info-mode', infoMode);
      infoToggle.setAttribute('aria-pressed', String(infoMode));
      infoToggle.setAttribute('aria-label', infoMode ? 'Hilfeelemente ausblenden' : 'Hilfeelemente anzeigen');
      infoToggle.title = infoMode ? 'Hilfeelemente ausblenden' : 'Hilfeelemente anzeigen';
      root.querySelectorAll('.clap-info-marker').forEach(marker => { marker.hidden = !infoMode; });
      if (!infoMode) hideInfo();
    });
    document.addEventListener('pointerdown', event => {
      if (pinnedInfo && !event.target.closest('.clap-info-marker') && !infoPopup?.contains(event.target)) hideInfo();
    });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') hideInfo(); });
  }

  const examplePattern = {
    id: 'rhythm-task5-example',
    image: 'assets/kapitel-3/rhythminator-beispiel.svg',
    width: 960,
    height: 135,
    clapEvents: [0, 1, 1.5, 2, 3, 4, 6, 7],
    durationBeats: 8
  };
  const readingExercisePatterns = [
    {
      id: 'rhythm-k2l2-reading-first-half',
      title: 'Leseübung · Takte 1–4',
      image: 'assets/kapitel-2/noten-47-takte-1-4.svg',
      clapEvents: [0, 2, 4, 8, 12, 14],
      noteEvents: [{ beat: 0, duration: 2 }, { beat: 2, duration: 2 }, { beat: 4, duration: 4 }, { beat: 8, duration: 4 }, { beat: 12, duration: 2 }, { beat: 14, duration: 2 }],
      durationBeats: 16
    },
    {
      id: 'rhythm-k2l2-reading-second-half',
      title: 'Leseübung · Takte 5–8',
      image: 'assets/kapitel-2/noten-47-takte-5-8.svg',
      clapEvents: [0, 2, 4, 8, 10, 12],
      noteEvents: [{ beat: 0, duration: 2 }, { beat: 2, duration: 2 }, { beat: 4, duration: 4 }, { beat: 8, duration: 2 }, { beat: 10, duration: 2 }, { beat: 12, duration: 4 }],
      durationBeats: 16
    }
  ];

  function setDisplay(message, state = 'idle', step = controlPanel.dataset.step) {
    status.textContent = message;
    root.querySelector('[data-clap-display]').dataset.state = state;
    controlPanel.dataset.step = step;
    patternHost.dataset.highlight = String(step === 'notation');
  }
  function clearScoreCounter() {
    if (scoreCounterLayer) scoreCounterLayer.replaceChildren();
  }
  function clearScoreErrors() {
    if (scoreErrorLayer) scoreErrorLayer.replaceChildren();
  }
  function clearScoreCountLabels() {
    if (scoreCountLabelsLayer) scoreCountLabelsLayer.replaceChildren();
  }
  function scorePointAtBeat(beat) {
    const layout = selected?.scoreRows;
    if (layout?.length) {
      const safeBeat = Math.min(selected.durationBeats - .01, beat);
      const bar = Math.max(0, Math.floor(safeBeat / 4));
      const row = layout[bar];
      return { x: row.x + (safeBeat - bar * 4) * row.step, y: row.y };
    }
    const safeBeat = Math.min(31.99, beat);
    if (safeBeat < 0) return { x: 96 + safeBeat * 51, y: 80 };
    const bar = Math.floor(safeBeat / 4);
    const row = Math.floor(bar / 4);
    const barInRow = bar % 4;
    const withinBar = safeBeat % 4;
    const beatIndex = Math.floor(withinBar);
    const fraction = withinBar - beatIndex;
    const beatXs = scoreBeatXs[barInRow];
    const x1 = beatXs[beatIndex];
    const nextBar = (barInRow + 1) % 4;
    const x2 = beatIndex < 3
      ? beatXs[beatIndex + 1]
      : barInRow < 3 ? scoreBeatXs[nextBar][0] : beatXs[3] + beatXs[3] - beatXs[2];
    return { x: x1 + (x2 - x1) * fraction, y: 80 + row * 135 };
  }
  function addMissedNoteMarker(beat) {
    if (!scoreErrorLayer) return;
    const point = scorePointAtBeat(beat);
    const circle = document.createElementNS(scoreSvgNS, 'circle');
    circle.setAttribute('cx', String(point.x));
    circle.setAttribute('cy', String(point.y));
    circle.setAttribute('r', '15');
    circle.setAttribute('class', 'clap-score-error-ring');
    scoreErrorLayer.append(circle);
  }
  function addErrorNote(beat, targetBeat = null) {
    if (!scoreErrorLayer) return;
    const point = scorePointAtBeat(beat);
    if (targetBeat !== null) {
      const target = scorePointAtBeat(targetBeat);
      const connector = document.createElementNS(scoreSvgNS, 'line');
      connector.setAttribute('x1', String(target.x));
      connector.setAttribute('x2', String(point.x));
      connector.setAttribute('y1', String(point.y + 14));
      connector.setAttribute('y2', String(point.y + 14));
      connector.setAttribute('class', 'clap-score-error-shift');
      scoreErrorLayer.append(connector);
    }
    const note = document.createElementNS(scoreSvgNS, 'g');
    note.setAttribute('class', 'clap-score-error-note');
    const head = document.createElementNS(scoreSvgNS, 'ellipse');
    head.setAttribute('cx', String(point.x));
    head.setAttribute('cy', String(point.y));
    head.setAttribute('rx', '9');
    head.setAttribute('ry', '6');
    head.setAttribute('transform', `rotate(-22 ${point.x} ${point.y})`);
    const stem = document.createElementNS(scoreSvgNS, 'line');
    stem.setAttribute('x1', String(point.x + 7));
    stem.setAttribute('x2', String(point.x + 7));
    stem.setAttribute('y1', String(point.y - 2));
    stem.setAttribute('y2', String(point.y - 31));
    note.append(head, stem);
    scoreErrorLayer.append(note);
  }
  function formatBeatLabel(beat) {
    const withinBar = ((beat % 4) + 4) % 4;
    const subdivision = Math.min(7, Math.max(0, Math.round(withinBar * 2)));
    const number = Math.floor(subdivision / 2) + 1;
    return subdivision % 2 ? `${number}&` : String(number);
  }
  function errorLocation(beat) {
    const localBeat = Math.max(0, beat);
    const bar = currentExerciseIndex * 4 + Math.floor(localBeat / 4) + 1;
    return { bar, beat: formatBeatLabel(localBeat) };
  }
  function showStaticScoreCounts(startBeat, durationBeats) {
    if (!scoreCountLabelsLayer) return;
    scoreCountLabelsLayer.replaceChildren();
    const subdivisions = Math.max(1, Math.ceil(durationBeats * 2));
    for (let index = 0; index < subdivisions; index += 1) {
      const offset = index / 2;
      const point = scorePointAtBeat(startBeat + offset);
      const label = document.createElementNS(scoreSvgNS, 'text');
      label.setAttribute('x', String(point.x));
      label.setAttribute('y', String(point.y - 52));
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('class', index % 2 ? 'clap-score-count-label is-subdivision' : 'clap-score-count-label');
      label.textContent = index % 2 ? '&' : String((index / 2) % 4 + 1);
      scoreCountLabelsLayer.append(label);
    }
  }
  function activeBarRange() {
    if (!fixedScore) return { startBar: 0, barCount: Math.ceil((selected?.durationBeats || 0) / 4) };
    if (!selectedBars.size) return { startBar: 0, barCount: 4 };
    const bars = [...selectedBars].sort((a, b) => a - b);
    return { startBar: bars[0], barCount: bars[bars.length - 1] - bars[0] + 1 };
  }
  function activeDurationBeats() {
    if (!selected) return 0;
    const fullDuration = selected.durationBeats || 8;
    return fixedScore ? Math.min(fullDuration, activeBarRange().barCount * 4) : fullDuration;
  }
  function activeClapEvents() {
    if (!selected) return [];
    const events = fixedScore && Array.isArray(selected.noteEvents)
      ? selected.noteEvents.map(note => note.beat)
      : selected.clapEvents;
    if (!Array.isArray(events)) return [];
    if (!fixedScore) return events;
    const { startBar, barCount } = activeBarRange();
    const startBeat = startBar * 4;
    const endBeat = startBeat + barCount * 4;
    return events
      .filter(beat => beat >= startBeat && beat < endBeat)
      .map(beat => beat - startBeat)
      .sort((a, b) => a - b);
  }
  function updateBarScope(announce = true, invalidSelection = false) {
    const range = activeBarRange();
    const firstBar = currentExerciseIndex * 4 + 1;
    barScopeButtons.forEach((button, index) => {
      button.setAttribute('aria-pressed', String(selectedBars.has(index)));
      const lastBar = firstBar + index;
      const wouldCompleteAll = !selectedBars.has(index) && selectedBars.size === 3;
      const label = wouldCompleteAll ? `Alle vier Takte ${firstBar} bis ${firstBar + 3} auswählen; Markierungen zurücksetzen` : selectedBars.has(index) ? `Takt ${lastBar} aus der Auswahl nehmen` : `Takt ${lastBar} auswählen; nur angrenzende Takte möglich`;
      button.setAttribute('aria-label', label);
      button.title = label;
      button.disabled = running;
    });
    const absoluteFirstBar = firstBar + range.startBar;
    const absoluteLastBar = absoluteFirstBar + range.barCount - 1;
    const isFullRange = range.startBar === 0 && range.barCount === 4;
    if (barScopeStatus) barScopeStatus.textContent = invalidSelection ? 'Nur zusammenhängende Takte' : isFullRange && currentExerciseIndex === 0 ? 'Alle 4 Takte' : range.barCount === 1 && !isFullRange ? `Takt ${absoluteFirstBar}` : `Takte ${absoluteFirstBar}–${absoluteLastBar}`;
    if (announce && stream && !running && fixedScore) {
      const rangeLabel = isFullRange ? `Alle vier Takte ${firstBar}–${firstBar + 3}` : range.barCount === 1 ? `Takt ${absoluteFirstBar}` : `Takte ${absoluteFirstBar}–${absoluteLastBar}`;
      const message = invalidSelection ? 'Takte müssen zusammenhängen. Übersprungene Takte sind nicht möglich.' : `${rangeLabel} ausgewählt. Drücke Start, wenn du bereit bist.`;
      setDisplay(message, 'idle', 'start');
      startButton.disabled = false;
    }
  }
  function showScoreCounter(number, x, y) {
    if (!scoreCounterLayer) return;
    scoreCounterLayer.replaceChildren();
    const badge = document.createElementNS(scoreSvgNS, 'rect');
    badge.setAttribute('x', String(x - 12));
    badge.setAttribute('y', String(y - 18));
    badge.setAttribute('width', '24');
    badge.setAttribute('height', '24');
    badge.setAttribute('rx', '4');
    badge.setAttribute('class', 'clap-score-counter-badge');
    const text = document.createElementNS(scoreSvgNS, 'text');
    text.setAttribute('x', String(x));
    text.setAttribute('y', String(y));
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('class', 'clap-score-counter-number');
    text.textContent = String(number);
    scoreCounterLayer.append(badge, text);
  }
  function updateScoreCounter(elapsed, durationBeats, startBeat = 0) {
    if (!guidedScore) return;
    const countInMs = 4 * beatMs;
    if (elapsed < countInMs) {
      const beat = Math.max(0, Math.min(3, Math.floor(elapsed / beatMs)));
      showScoreCounter(beat + 1, 68, 28);
      return;
    }
    const playbackBeat = startBeat + Math.max(0, Math.min(durationBeats - 1, Math.floor((elapsed - countInMs) / beatMs)));
    if (selected?.scoreRows) {
      const point = scorePointAtBeat(playbackBeat);
      showScoreCounter(playbackBeat % 4 + 1, point.x, point.y - 52);
      return;
    }
    const bar = Math.floor(playbackBeat / 4);
    const beatInBar = playbackBeat % 4;
    const row = Math.floor(bar / 4);
    const barInRow = bar % 4;
    const y = Number(selected?.height) > 135 ? (row === 0 ? 28 : 163) : 28;
    showScoreCounter(beatInBar + 1, scoreBeatXs[barInRow][beatInBar], y);
  }
  function stopCapture() {
    running = false;
    tempoButtons.forEach(button => { button.disabled = false; });
    barScopeButtons.forEach(button => { button.disabled = false; });
    if (helpButton) helpButton.disabled = false;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  }

  function playMetronomeTick(context, time, beat) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(beat % 4 === 0 ? 1050 : 760, time);
    gain.gain.setValueAtTime(.0001, time);
    gain.gain.linearRampToValueAtTime(beat % 4 === 0 ? .19 : .13, time + .004);
    gain.gain.exponentialRampToValueAtTime(.0001, time + .075);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(time);
    oscillator.stop(time + .08);
  }
  function startContinuousMetronome(context) {
    window.clearInterval(metronomeTimer);
    metronomeContext = context;
    metronomeEpoch = performance.now();
    metronomeBeat = 0;
    const tick = () => {
      if (!metronomeContext || metronomeContext.state === 'closed') return;
      const beat = metronomeBeat++;
      playMetronomeTick(metronomeContext, metronomeContext.currentTime + .025, beat);
    };
    tick();
    metronomeTimer = window.setInterval(tick, beatMs);
  }
  function stopContinuousMetronome(closeContext = true) {
    window.clearInterval(metronomeTimer);
    metronomeTimer = 0;
    const context = metronomeContext;
    metronomeContext = null;
    if (closeContext && context && context.state !== 'closed') context.close().catch(() => {});
  }
  function nextMetronomeBeat() {
    const now = performance.now();
    return metronomeEpoch + (Math.floor((now - metronomeEpoch) / beatMs) + 1) * beatMs;
  }

  async function stopHelp() {
    helpRunning = false;
    window.clearTimeout(helpTimer);
    window.clearInterval(helpTicker);
    helpTicker = 0;
    clearScoreCounter();
    helpNodes.forEach(node => { try { node.stop(); } catch {} try { node.disconnect(); } catch {} });
    helpNodes = [];
    if (helpContext && helpContext.state !== 'closed') {
      try { await helpContext.close(); } catch {}
    }
    helpContext = null;
    if (helpButton) {
      helpButton.textContent = 'HELP!';
      helpButton.setAttribute('aria-label', 'Leseübung anhören');
      helpButton.setAttribute('aria-pressed', 'false');
    }
  }

  async function playHelp() {
    if (helpRunning) { await stopHelp(); return; }
    if (!selected) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    if (metronomeContext) stopContinuousMetronome();
    try {
      helpContext = new AudioContextClass();
      await helpContext.resume();
      const startAt = helpContext.currentTime + .12;
      const beatSeconds = beatMs / 1000;
      const helpStartBeat = activeBarRange().startBar * 4;
      const durationBeats = activeDurationBeats() || 16;
      const addSound = (time, frequency, duration, volume, type = 'sine') => {
        const oscillator = helpContext.createOscillator();
        const gain = helpContext.createGain();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, time);
        gain.gain.setValueAtTime(.0001, time);
        gain.gain.exponentialRampToValueAtTime(volume, time + .01);
        gain.gain.setValueAtTime(volume, time + Math.max(.02, duration - .08));
        gain.gain.exponentialRampToValueAtTime(.0001, time + Math.max(.04, duration - .015));
        oscillator.connect(gain);
        gain.connect(helpContext.destination);
        oscillator.start(time);
        oscillator.stop(time + duration);
        helpNodes.push(oscillator, gain);
      };
      for (let beat = 0; beat < 4; beat += 1) {
        addSound(startAt + beat * beatSeconds, beat === 0 ? 1050 : 760, .08, beat === 0 ? .24 : .16, 'triangle');
      }
      for (let beat = 0; beat < durationBeats; beat += 1) {
        const time = startAt + (4 + beat) * beatSeconds;
        const measureBeat = beat % 4;
        addSound(time, measureBeat === 0 ? 1050 : 760, .08, measureBeat === 0 ? .24 : .16, 'triangle');
      }
      selected.noteEvents?.forEach(note => {
        const localBeat = note.beat - helpStartBeat;
        if (localBeat < 0 || localBeat >= durationBeats) return;
        addSound(startAt + (4 + localBeat) * beatSeconds, 392, note.duration * beatSeconds, note.accent ? .18 : .11);
      });
      helpRunning = true;
      helpStartedAt = performance.now() + 120;
      updateScoreCounter(0, durationBeats, helpStartBeat);
      helpTicker = window.setInterval(() => updateScoreCounter(performance.now() - helpStartedAt, durationBeats, helpStartBeat), 50);
      helpButton.textContent = 'STOP';
      helpButton.setAttribute('aria-label', 'Wiedergabe stoppen');
      helpButton.setAttribute('aria-pressed', 'true');
      helpTimer = window.setTimeout(async () => {
        const keepMetronome = headphoneToggle?.getAttribute('aria-pressed') === 'true';
        const context = keepMetronome ? helpContext : null;
        if (keepMetronome) helpContext = null;
        await stopHelp();
        if (context && context.state !== 'closed') startContinuousMetronome(context);
      }, (4 + durationBeats) * beatMs + 30);
    } catch { await stopHelp(); }
  }
  tempoButtons.forEach(button => button.addEventListener('click', () => {
    if (running) return;
    tempo = Math.max(30, Math.min(120, tempo + Number(button.dataset.clapTempo)));
    beatMs = 60000 / tempo;
    tempoOutput.textContent = `${tempo} BPM`;
    tempoNeedle.style.transform = `rotate(${((tempo - 30) / 90) * 110 - 55}deg)`;
    if (metronomeContext) startContinuousMetronome(metronomeContext);
  }));
  tempoNeedle.style.transform = `rotate(${((tempo - 30) / 90) * 110 - 55}deg)`;
  function nextCongratulation() {
    if (!congratulationBag.length) {
      congratulationBag = [...congratulationMessages];
      for (let i = congratulationBag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [congratulationBag[i], congratulationBag[j]] = [congratulationBag[j], congratulationBag[i]];
      }
    }
    return congratulationBag.pop();
  }
  function startNotationStep() {
    window.clearTimeout(readingTimer);
    setDisplay('Notation lesen und vorbereiten', 'idle', 'notation');
    readingTimer = window.setTimeout(() => {
      if (stream && !running && controlPanel.dataset.step === 'notation') {
        setDisplay('Klatschen starten', 'idle', 'start');
      }
    }, 4500);
  }
  function readPatterns() {
    if (customScore) {
      patterns = [customScore];
      selected = customScore;
      renderPatterns();
      startButton.disabled = !stream;
      return;
    }
    if (editorFinish) return;
    if (fixedScore) {
      patterns = [readingExercisePatterns[currentExerciseIndex]];
      selected = readingExercisePatterns[currentExerciseIndex];
      renderPatterns();
      startButton.disabled = !stream;
      return;
    }
    try {
      const value = JSON.parse(localStorage.getItem(storageKey) || '[]');
      patterns = Array.isArray(value) ? value : [];
    } catch { patterns = []; }
    selected = patterns.at(-1) || examplePattern;
    renderPatterns();
    startButton.disabled = !stream || !selected;
  }
  function renderPatterns() {
    patternHost.replaceChildren();
    scoreCounterLayer = null;
    scoreErrorLayer = null;
    scoreCountLabelsLayer = null;
    const shownPatterns = patterns.length ? patterns : [examplePattern];
    const list = document.createElement('div');
    list.className = 'clap-pattern-list';
    shownPatterns.forEach((pattern, index) => {
      const card = document.createElement('article');
      card.className = 'clap-pattern-card';
      const isExample = pattern.id === examplePattern.id;
      const isReadingExercise = readingExercisePatterns.some(exercise => exercise.id === pattern.id) || pattern.id === customScore?.id;
      const title = document.createElement('h5');
      title.textContent = isReadingExercise ? pattern.title : isExample ? 'Beispielrhythmus · nur zum Ausprobieren' : `Eigener Rhythmus ${index + 1}`;
      const image = document.createElement('img');
      image.alt = isReadingExercise ? pattern.title : isExample ? 'Beispielnotation für zwei 4/4-Takte' : 'Gespeicherte Notation: eigener Zwei-Takt-Rhythmus';
      image.src = pattern.image || `data:image/svg+xml;charset=utf-8,${encodeURIComponent(pattern.svg || '')}`;
      image.width = Number(pattern.width) || 960;
      image.height = Number(pattern.height) || (isReadingExercise ? 135 : 150);
      image.loading = 'lazy';
      if (selected?.id === pattern.id) card.classList.add('is-selected');
      if (guidedScore && isReadingExercise) {
        const scoreFrame = document.createElement('div');
        scoreFrame.className = 'clap-score-notation';
        const overlay = document.createElementNS(scoreSvgNS, 'svg');
        overlay.setAttribute('viewBox', `0 0 ${image.width} ${image.height}`);
        overlay.setAttribute('preserveAspectRatio', 'none');
        overlay.setAttribute('aria-hidden', 'true');
        overlay.setAttribute('class', 'clap-score-counter-overlay');
        scoreErrorLayer = document.createElementNS(scoreSvgNS, 'g');
        scoreErrorLayer.setAttribute('class', 'clap-score-error-layer');
        scoreCountLabelsLayer = document.createElementNS(scoreSvgNS, 'g');
        scoreCountLabelsLayer.setAttribute('class', 'clap-score-count-labels');
        scoreCounterLayer = document.createElementNS(scoreSvgNS, 'g');
        overlay.append(scoreCountLabelsLayer, scoreErrorLayer, scoreCounterLayer);
        scoreFrame.append(image, overlay);
        addInfoMarker(scoreFrame, 'Lies die sichtbaren Takte. HELP! spielt diese Takte mit Einzähler vor; mit aktivem Kopfhörermodus läuft das Metronom danach weiter.');
        card.append(title, scoreFrame);
        if (barScope) {
          barScope.classList.add('clap-bar-scope-in-notation');
          card.append(barScope);
        }
      } else {
        card.append(title, image);
      }
      if (!isExample && selected?.id !== pattern.id) {
        const choose = document.createElement('button');
        choose.type = 'button';
        choose.textContent = 'Diesen Rhythmus verwenden';
        choose.addEventListener('click', () => {
          selected = pattern;
          startButton.disabled = !stream;
          setDisplay(stream ? 'Klatschen starten' : 'Mikrofon anschalten', 'idle', stream ? 'start' : 'mic');
          renderPatterns();
        });
        card.append(choose);
      }
      list.append(card);
    });
    patternHost.append(list);
  }
  function setMicUi(active) {
    micButton.setAttribute('aria-pressed', String(active));
    micButton.setAttribute('aria-label', active ? 'Mikrofon ausschalten' : 'Mikrofon einschalten');
    micButton.title = active ? 'Mikrofon ausschalten' : 'Mikrofon einschalten';
    if (onAir) {
      onAir.dataset.active = String(active);
      onAir.setAttribute('aria-label', active ? 'Mikrofon eingeschaltet' : 'Mikrofon aus');
    }
  }
  function stopMic() {
    window.clearTimeout(readingTimer);
    stopCapture();
    stopContinuousMetronome();
    liveClapCounter.hidden = true;
    stream?.getTracks().forEach(track => track.stop());
    stream = null;
    analyser = null;
    if (audioContext) { audioContext.close().catch(() => {}); audioContext = null; }
    setMicUi(false);
    startButton.textContent = 'Start';
    startButton.setAttribute('aria-label', 'Start');
    startButton.disabled = true;
    setDisplay(guidedScore ? 'Lesen und vorbereiten. Erst dann Mic anschalten.' : 'Mikrofon anschalten', 'idle', guidedScore ? 'notation' : 'mic');
  }

  micButton.addEventListener('click', async () => {
    if (helpRunning) await stopHelp();
    if (stream) {
      stopMic();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setDisplay('Mikrofonzugriff benötigt HTTPS oder localhost.', 'error', 'mic');
      return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) throw new Error('Audioanalyse nicht verfügbar');
      audioContext = new AudioContextClass();
      await audioContext.resume();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      audioContext.createMediaStreamSource(stream).connect(analyser);
      setMicUi(true);
      startButton.disabled = !selected;
      if (guidedScore) setDisplay('Klatschen starten', 'idle', 'start');
      else startNotationStep();
    } catch {
      stopMic();
      setDisplay('Mikrofonfreigabe prüfen und erneut versuchen.', 'error', 'mic');
    }
  });

  if (helpButton) helpButton.addEventListener('click', playHelp);
  if (editorFinish) {
    root.addEventListener('rhythm:editor-score', event => {
      if (helpRunning) void stopHelp();
      stopMic();
      editorFinish.hidden = true;
      const score = event.detail;
      customScore = score?.durationBeats === 8 && score.clapEvents?.length ? score : null;
      selected = null;
      patterns = [];
      root.hidden = !customScore;
      if (customScore) {
        readPatterns();
        setDisplay('Lies deine zwei Takte. Schalte dann das Mikrofon ein.', 'idle', 'notation');
      }
    });
    editorFinish.addEventListener('click', () => {
      const target = document.getElementById(editorFinish.dataset.clapEditorFinish);
      if (!target || editorFinish.hidden || running) return;
      if (helpRunning) void stopHelp();
      stopMic();
      setDisplay('Beide Takte richtig geklatscht.', 'hit', 'result');
      target.focus({ preventScroll: true });
      target.scrollIntoView({ block: 'start' });
    });
  }
  if (nextTaskButton) nextTaskButton.addEventListener('click', () => {
    if (running || nextTaskButton.hidden) return;
    if (nextTaskButton.dataset.clapFinishTarget && currentExerciseIndex === 1) {
      const target = document.getElementById(nextTaskButton.dataset.clapFinishTarget);
      if (target) {
        if (helpRunning) stopHelp();
        window.history.replaceState(null, '', `#${target.id}`);
        target.focus({ preventScroll: true });
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }
    const nextScore = customScoreQueue.shift() || nextCustomScore;
    if (!nextScore) return;
    if (helpRunning) stopHelp();
    customScore = nextScore;
    selected = nextScore;
    patterns = [selected];
    currentExerciseIndex = 1;
    renderPatterns();
    if (!customScoreQueue.length) {
      if (document.activeElement === nextTaskButton) helpButton?.focus();
      if (nextTaskButton.dataset.clapFinishTarget) {
        nextTaskButton.hidden = true;
        nextTaskButton.textContent = 'Fertig!';
        nextTaskButton.setAttribute('aria-label', 'Fertig! Zu den Höraufgaben');
        nextTaskButton.classList.add('is-finish');
      } else {
        nextTaskButton.remove();
      }
    }
    startButton.disabled = !stream;
    const nextTitle = nextScore.title || 'die nächste Leseübung';
    setDisplay(stream
      ? `Lies ${nextTitle} und bereite dich vor. Dann Start drücken.`
      : `Lies ${nextTitle} und bereite dich vor. Erst dann Mic anschalten.`, 'idle', 'notation');
  });
  barScopeButtons.forEach(button => button.addEventListener('click', () => {
    if (running || !fixedScore) return;
    const clickedBar = Number(button.dataset.clapBars) - 1;
    const candidate = new Set(selectedBars);
    if (candidate.has(clickedBar)) candidate.delete(clickedBar);
    else candidate.add(clickedBar);
    const ordered = [...candidate].sort((a, b) => a - b);
    if (ordered.length && ordered[ordered.length - 1] - ordered[0] + 1 !== ordered.length) {
      updateBarScope(true, true);
      return;
    }
    selectedBars = candidate.size === 4 ? new Set() : candidate;
    updateBarScope();
  }));
  if (headphoneToggle && auxJack) headphoneToggle.addEventListener('click', () => {
    const active = headphoneToggle.getAttribute('aria-pressed') !== 'true';
    headphoneToggle.setAttribute('aria-pressed', String(active));
    headphoneToggle.setAttribute('aria-label', active ? 'Kopfhörer ausschalten' : 'Kopfhörer einschalten');
    headphoneToggle.title = active ? 'Kopfhörer ausschalten' : 'Kopfhörer einschalten';
    auxJack.dataset.active = String(active);
    auxJack.setAttribute('aria-label', active ? 'AUX-Buchse: Kopfhörer verbunden' : 'AUX-Buchse: nicht verbunden');
    auxJack.title = active ? 'AUX-Buchse: Kopfhörer verbunden' : 'AUX-Buchse: nicht verbunden';
    if (!active) stopContinuousMetronome();
  });

  patternHost.addEventListener('click', () => {
    if (stream && !running && controlPanel.dataset.step === 'notation') {
      window.clearTimeout(readingTimer);
      setDisplay('Klatschen starten', 'idle', 'start');
      startButton.disabled = false;
    }
  });

  startButton.addEventListener('click', async () => {
    if (running) {
      stopCapture();
      stopContinuousMetronome();
      clearScoreCounter();
      liveClapCounter.hidden = true;
      startButton.textContent = 'Start';
      startButton.setAttribute('aria-label', 'Start');
      startButton.disabled = !stream;
      setDisplay('Klatschen starten', 'idle', 'start');
      return;
    }
    if (!stream || !selected) return;
    if (editorFinish) editorFinish.hidden = true;
    if (helpRunning) await stopHelp();
    clearScoreErrors();
    clearScoreCountLabels();
    const attemptScore = selected;
    const attemptContext = audioContext;
    const expected = activeClapEvents();
    const attemptDurationBeats = activeDurationBeats();
    const attemptStartBeat = fixedScore ? activeBarRange().startBar * 4 : 0;
    if (!expected.length) {
      setDisplay('Für diese Notation sind keine Klatschimpulse gespeichert.', 'error', 'start');
      return;
    }
    try { await attemptContext.resume(); }
    catch {
      if (attemptContext !== audioContext) return;
      setDisplay('Der Einzähler konnte nicht starten. Audiofreigabe prüfen.', 'error', 'start');
      return;
    }
    if (attemptContext !== audioContext || attemptScore !== selected || running) return;
    claps = [];
    lastClap = -Infinity;
    liveClapCounter.textContent = `Klatscher 0 / ${expected.length}`;
    liveClapCounter.hidden = false;
    running = true;
    if (helpButton) helpButton.disabled = true;
    tempoButtons.forEach(button => { button.disabled = true; });
    barScopeButtons.forEach(button => { button.disabled = true; });
    startButton.disabled = false;
    startButton.textContent = 'Abbrechen';
    const countStart = metronomeContext ? nextMetronomeBeat() : performance.now() + 120;
    const recordStart = countStart + 4 * beatMs;
    const end = recordStart + attemptDurationBeats * beatMs;
    if (!metronomeContext) {
      const audioCountStart = audioContext.currentTime + .12;
      for (let beat = 0; beat < 4; beat++) {
        const at = audioCountStart + beat * beatMs / 1000;
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(beat === 0 ? 1050 : 760, at);
        gain.gain.setValueAtTime(.0001, at);
        gain.gain.linearRampToValueAtTime(beat === 0 ? .2 : .13, at + .004);
        gain.gain.exponentialRampToValueAtTime(.0001, at + .075);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(at);
        oscillator.stop(at + .08);
      }
    }
    setDisplay('An Einzähler orientieren', 'idle', 'countin');
    const data = new Float32Array(analyser.fftSize);
    const listen = () => {
      if (!running) return;
      const now = performance.now();
      if (guidedScore) updateScoreCounter(now - countStart, attemptDurationBeats, attemptStartBeat);
      if (now < countStart + 4 * beatMs) {
        const beat = Math.floor((now - countStart) / beatMs) + 1;
        setDisplay(`Einzähler · ${Math.max(1, Math.min(4, beat))}`, 'idle', 'countin');
      } else if (now < end) {
        setDisplay('Klatschen!', 'idle', 'clap');
        analyser.getFloatTimeDomainData(data);
        let sum = 0;
        for (const sample of data) sum += sample * sample;
        const rms = Math.sqrt(sum / data.length);
        if (rms > clapThreshold && now - lastClap > 190) {
          claps.push(now);
          lastClap = now;
          liveClapCounter.textContent = `Klatscher ${claps.length} / ${expected.length}`;
        }
      } else {
        stopCapture();
        stopContinuousMetronome();
        clearScoreCounter();
        evaluateClaps(recordStart, expected, attemptStartBeat, attemptDurationBeats);
        return;
      }
      frame = requestAnimationFrame(listen);
    };
    frame = requestAnimationFrame(listen);
  });

  function evaluateClaps(recordStart, expected, attemptStartBeat, attemptDurationBeats) {
    const measured = claps.map(time => (time - recordStart) / beatMs);
    const pairs = [];
    if (measured.length <= expected.length) {
      const table = Array.from({ length: measured.length + 1 }, () => Array(expected.length + 1).fill(null));
      for (let targetIndex = 0; targetIndex <= expected.length; targetIndex++) table[0][targetIndex] = { cost: 0, pairs: [] };
      for (let clapIndex = 1; clapIndex <= measured.length; clapIndex++) {
        for (let targetIndex = 1; targetIndex <= expected.length; targetIndex++) {
          const skipTarget = table[clapIndex][targetIndex - 1];
          const previous = table[clapIndex - 1][targetIndex - 1];
          const candidates = [];
          if (skipTarget) candidates.push(skipTarget);
          if (previous) candidates.push({ cost: previous.cost + Math.abs(measured[clapIndex - 1] - expected[targetIndex - 1]), pairs: [...previous.pairs, [clapIndex - 1, targetIndex - 1]] });
          table[clapIndex][targetIndex] = candidates.reduce((best, candidate) => candidate.cost < best.cost ? candidate : best, candidates[0] || null);
        }
      }
      pairs.push(...(table[measured.length][expected.length]?.pairs || []));
    } else {
      const table = Array.from({ length: measured.length + 1 }, () => Array(expected.length + 1).fill(null));
      for (let clapIndex = 0; clapIndex <= measured.length; clapIndex++) table[clapIndex][0] = { cost: 0, pairs: [] };
      for (let clapIndex = 1; clapIndex <= measured.length; clapIndex++) {
        for (let targetIndex = 1; targetIndex <= expected.length; targetIndex++) {
          const skipClap = table[clapIndex - 1][targetIndex];
          const previous = table[clapIndex - 1][targetIndex - 1];
          const candidates = [];
          if (skipClap) candidates.push(skipClap);
          if (previous) candidates.push({ cost: previous.cost + Math.abs(measured[clapIndex - 1] - expected[targetIndex - 1]), pairs: [...previous.pairs, [clapIndex - 1, targetIndex - 1]] });
          table[clapIndex][targetIndex] = candidates.reduce((best, candidate) => candidate.cost < best.cost ? candidate : best, candidates[0] || null);
        }
      }
      pairs.push(...(table[measured.length][expected.length]?.pairs || []));
    }
    const matchedClaps = new Set();
    const matchedTargets = new Set();
    const timingErrors = [];
    pairs.forEach(([clapIndex, targetIndex]) => {
      const offset = measured[clapIndex] - expected[targetIndex];
      if (Math.abs(offset) <= tolerance) {
        matchedClaps.add(clapIndex);
        matchedTargets.add(targetIndex);
      } else if (Math.abs(offset) <= .85) {
        matchedClaps.add(clapIndex);
        matchedTargets.add(targetIndex);
        timingErrors.push({ clapIndex, targetIndex, offset });
      }
    });
    const missedTargets = expected.map((_, index) => index).filter(index => !matchedTargets.has(index));
    const extraClaps = measured.map((_, index) => index).filter(index => !matchedClaps.has(index));
    const misses = missedTargets.length;
    const extras = extraClaps.length;
    startButton.textContent = 'Start';
    startButton.setAttribute('aria-label', 'Start');
    startButton.disabled = !stream;
    if (misses === 0 && extras === 0 && timingErrors.length === 0) {
      if (editorFinish) editorFinish.hidden = false;
      if (nextTaskButton?.hasAttribute('data-clap-unlock-on-success') &&
          (currentExerciseIndex === 0 || nextTaskButton.dataset.clapFinishTarget)) {
        nextTaskButton.hidden = false;
      }
      clearScoreErrors();
      clearScoreCountLabels();
      const completedSelection = activeBarRange();
      if (fixedScore && (completedSelection.startBar !== 0 || completedSelection.barCount < 4)) {
        const firstBar = currentExerciseIndex * 4 + completedSelection.startBar + 1;
        const lastBar = firstBar + completedSelection.barCount - 1;
        const completedRange = completedSelection.barCount === 1 ? `Takt ${firstBar}` : `Takte ${firstBar}–${lastBar}`;
        setDisplay(`${nextCongratulation()} ${completedRange} geschafft. Du kannst jetzt angrenzende Takte dazunehmen.`, 'hit', 'result');
      } else if (fixedScore && currentExerciseIndex === 0) {
        setDisplay(nextCongratulation(), 'hit', 'result');
        startButton.disabled = true;
        window.setTimeout(() => {
          currentExerciseIndex = 1;
          selectedBars.clear();
          updateBarScope(false);
          selected = readingExercisePatterns[currentExerciseIndex];
          patterns = [selected];
          renderPatterns();
          setDisplay(stream ? 'Zweite Hälfte lesen und vorbereiten. Dann Start drücken.' : 'Zweite Hälfte lesen und vorbereiten. Erst dann Mic anschalten.', 'idle', 'notation');
          if (stream) {
            startButton.disabled = true;
            readingTimer = window.setTimeout(() => {
              if (stream && !running && controlPanel.dataset.step === 'notation') {
                setDisplay('Klatschen starten', 'idle', 'start');
                startButton.disabled = false;
              }
            }, 4500);
          }
        }, 1500);
      } else {
        setDisplay(fixedScore ? `${nextCongratulation()} Takte 1–8 geschafft. Weiter zur Höraufgabe.` : nextCongratulation(), 'hit', 'result');
        if (fixedScore) {
          startButton.disabled = true;
          if (currentExerciseIndex === 1) barScopeButtons.forEach(button => { button.disabled = true; });
        }
      }
    } else {
      clearScoreErrors();
      const diagnostics = [];
      missedTargets.forEach(targetIndex => {
        const beat = attemptStartBeat + expected[targetIndex];
        const place = errorLocation(beat);
        addMissedNoteMarker(beat);
        diagnostics.push({ beat, bar: place.bar, position: place.beat, reason: 'fehlt' });
      });
      extraClaps.forEach(clapIndex => {
        const beat = attemptStartBeat + measured[clapIndex];
        const place = errorLocation(beat);
        addErrorNote(beat);
        diagnostics.push({ beat, bar: place.bar, position: place.beat, reason: 'zu viel' });
      });
      timingErrors.forEach(({ clapIndex, targetIndex, offset }) => {
        const targetBeat = attemptStartBeat + expected[targetIndex];
        const actualBeat = attemptStartBeat + measured[clapIndex];
        const place = errorLocation(targetBeat);
        addErrorNote(actualBeat, targetBeat);
        diagnostics.push({ beat: targetBeat, bar: place.bar, position: place.beat, reason: offset < 0 ? 'zu früh' : 'zu spät' });
      });
      diagnostics.sort((a, b) => a.beat - b.beat);
      showStaticScoreCounts(attemptStartBeat, attemptDurationBeats);
      const feedback = diagnostics
        .map(({ bar, position, reason }) => `Takt ${bar}: Note auf Schlag ${position} ${reason}`)
        .join('\n');
      setDisplay(feedback, 'miss', 'result');
    }
  }

  window.addEventListener('rhythm:patterns-updated', event => {
    if (guidedScore) return;
    if (event.detail?.storageKey && event.detail.storageKey !== storageKey) return;
    patterns = event.detail?.patterns || [];
    selected = patterns.at(-1) || examplePattern;
    renderPatterns();
    startButton.disabled = !stream || !selected;
  });
  window.addEventListener('storage', event => { if (!guidedScore && event.key === storageKey) readPatterns(); });
  window.addEventListener('pagehide', stopMic);
  window.addEventListener('pagehide', stopHelp);
  if (infoToggle) {
    addInfoMarker(clapDisplay, 'Hier erscheinen die aktuelle Anweisung, der Einzähler und die Rückmeldung zum Klatschen.');
    addInfoMarker(micButton, 'Schalte das Mikrofon ein. Dein Browser fragt gegebenenfalls nach der Freigabe.', 'fill');
    addInfoMarker(onAir, 'ON AIR leuchtet, wenn das Mikrofon eingeschaltet ist.', 'fill');
    addInfoMarker(root.querySelector('.clap-tempo-control'), 'Mit den Pfeilen stellst du das Tempo ein. Zähler und Metronom folgen diesem BPM-Wert.');
    addInfoMarker(startButton, 'Start gibt vier Schläge Einzähler. Danach klatschst du die Notation; Abbrechen beendet den Versuch.', 'fill');
    addInfoMarker(headphoneToggle, 'Aktiviere den Kopfhörermodus, wenn du Kopfhörer verwendest. Nach HELP! läuft das Metronom weiter und begleitet den Aufnahmeversuch.', 'inline');
    addInfoMarker(auxJack, 'Die leuchtende AUX-Buchse zeigt an, dass der Kopfhörermodus aktiviert ist.', 'inline');
    addInfoMarker(helpButton, 'Spielt die aktuellen Takte mit Einzähler vor. Bei aktiviertem Kopfhörermodus läuft das Metronom anschließend weiter.', 'inline');
    addInfoMarker(barScope, 'Wähle einen Takt allein oder mehrere direkt benachbarte Takte, zum Beispiel Takt 2 oder Takte 2–4. Lücken sind nicht möglich. Sind alle vier markiert, springt die Auswahl zurück und alle Takte werden geübt.');
  }
  if (guidedScore) setDisplay('Lesen und vorbereiten. Erst dann Mic anschalten.', 'idle', 'notation');
  if (fixedScore) updateBarScope(false);
  if (!editorFinish) readPatterns();
  });
})();
