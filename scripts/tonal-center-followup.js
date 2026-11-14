(() => {
  'use strict';
  const pitch = window.PitchDetector;
  const panels = [...document.querySelectorAll('[data-center-followup]')];
  if (!pitch || !panels.length) return;

  const ranges = {
    'octave-c2-c3': [36, 48],
    'octave-g2-g3': [43, 55],
    'octave-c3-c4': [48, 60],
    'octave-g3-g4': [55, 67],
    'octave-c4-c5': [60, 72],
    'octave-g4-g5': [67, 79],
    'octave-c5-c6': [72, 84]
  };
  const steps = [2, 4, 5, 7, 9, 11];
  const sound = { type: 'triangle', volume: .14, attack: .025, release: .08, duration: .48, gap: .12, tail: .3 };

  panels.forEach(panel => {
    const $ = selector => panel.querySelector(selector);
    const rangeSelect = $('[data-followup-range]');
    const scaleButton = $('[data-followup-scale]');
    const intervalButton = $('[data-followup-interval]');
    const saveButton = $('[data-followup-save]');
    const micStart = $('[data-followup-mic-start]');
    const micStop = $('[data-followup-mic-stop]');
    const feedback = $('[data-followup-result]');
    const storageKey = 'music-method-gehoerbildung2-tonal-center-followup-v1';
    let results = { total: 0, byOctave: {}, byInterval: {} };
    try { results = { ...results, ...JSON.parse(localStorage.getItem(storageKey) || '{}') }; } catch {}

    let context, stream, source, analyser, frame = 0, currentRoot = 48, currentPair = null;
    let intervalIndex = -1, intervalActive = false, scaleActive = false, attemptActive = false;
    let heldOscillator = null, heldGain = null, oscillators = [], timers = [], generation = 0;
    let history = [], lastFrame = 0, centsNow = null, muteUntil = 0;

    const setStatus = message => { $('[data-followup-guidance]').textContent = message; };
    const setFeedback = (state, message) => { feedback.dataset.state = state; feedback.textContent = message; };
    const setSaveEnabled = enabled => { saveButton.disabled = !enabled; };
    const updateProgress = () => {
      const count = Number(results.byOctave?.[rangeSelect.value]) || 0;
      const octave = rangeSelect.selectedOptions[0]?.textContent || 'gewählte Oktave';
      $('[data-followup-progress]').textContent = `Gespeichert: ${count} richtige Grundtöne in ${octave}. Insgesamt: ${Number(results.total) || 0}.`;
    };
    const stopScheduledAudio = () => {
      generation += 1;
      timers.forEach(clearTimeout); timers = [];
      oscillators.forEach(oscillator => { try { oscillator.stop(); } catch {} });
      oscillators = [];
      heldOscillator = null; heldGain = null;
      muteUntil = context ? context.currentTime + .25 : 0;
    };
    const ensureAudio = async () => {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) throw new Error('Dieser Browser unterstützt die Tonausgabe nicht.');
      if (!context || context.state === 'closed') context = new Audio();
      if (context.state !== 'running') await context.resume();
      return context;
    };
    const playNotes = async (notes, options, done) => {
      stopScheduledAudio();
      const thisGeneration = generation;
      try {
        const ctx = await ensureAudio();
        if (thisGeneration !== generation) return;
        const duration = options.duration ?? sound.duration;
        const lastDuration = options.lastDuration ?? duration;
        const gap = options.gap ?? sound.gap;
        const start = ctx.currentTime + .08;
        notes.forEach((note, index) => {
          const at = start + index * (duration + gap);
          const noteDuration = index === notes.length - 1 ? lastDuration : duration;
          const oscillator = ctx.createOscillator(), gain = ctx.createGain();
          oscillator.type = sound.type;
          oscillator.frequency.value = pitch.frequency(note);
          gain.gain.setValueAtTime(0, at);
          gain.gain.linearRampToValueAtTime(sound.volume, at + sound.attack);
          gain.gain.setValueAtTime(sound.volume, at + noteDuration - sound.release);
          gain.gain.linearRampToValueAtTime(0, at + noteDuration);
          oscillator.connect(gain); gain.connect(ctx.destination);
          oscillator.start(at); oscillator.stop(at + noteDuration + .02);
          oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); oscillators = oscillators.filter(item => item !== oscillator); };
          oscillators.push(oscillator);
        });
        muteUntil = start + (notes.length - 1) * (duration + gap) + lastDuration + sound.tail;
        timers.push(setTimeout(() => { if (thisGeneration === generation) done?.(); }, (muteUntil - ctx.currentTime) * 1000));
      } catch (error) {
        setStatus(error.message || 'Der Ton konnte nicht abgespielt werden.');
        stopScheduledAudio();
      }
    };
    const updateRoot = () => {
      const [low] = ranges[rangeSelect.value];
      currentRoot = low;
      $('[data-followup-target]').textContent = pitch.name(currentRoot);
      history = []; centsNow = null; currentPair = null; intervalIndex = -1;
      attemptActive = false; setSaveEnabled(false); updateProgress();
      setStatus(`Grundton ${pitch.name(currentRoot)} ist eingestellt. Spiele die Tonleiter ab.`);
    };
    const choosePair = () => {
      const choices = steps.map((step, index) => index).filter(index => index !== intervalIndex);
      intervalIndex = choices[Math.floor(Math.random() * choices.length)];
      currentPair = [currentRoot + steps[intervalIndex], currentRoot];
    };
    const stopInterval = () => {
      if (!intervalActive) return;
      intervalActive = false;
      const oscillator = heldOscillator, gain = heldGain;
      heldOscillator = null; heldGain = null;
      if (oscillator) {
        try { gain?.gain.setTargetAtTime(0, context.currentTime, .015); oscillator.stop(context.currentTime + .06); } catch {}
      }
      muteUntil = context ? context.currentTime + .25 : 0;
      history = []; centsNow = null; attemptActive = true;
      intervalButton.textContent = currentPair ? '▶ Intervall abspielen' : '▶ Neues Intervall abspielen';
      intervalButton.setAttribute('aria-pressed', 'false');
      setSaveEnabled(true);
      setStatus(`Intervallton gestoppt. Halte ${pitch.name(currentRoot)} noch kurz und prüfe den Grundton.`);
    };
    const playInterval = async () => {
      if (intervalActive) { stopInterval(); return; }
      if (scaleActive) stopScale();
      if (!currentPair) choosePair();
      stopScheduledAudio();
      const note = currentPair[0];
      attemptActive = true; centsNow = null; history = []; setSaveEnabled(false);
      setFeedback('ready', 'Singe und halte den Grundton, während der neue Ton klingt. Stoppe den Intervallton und prüfe danach deine Tonhöhe.');
      try {
        const ctx = await ensureAudio();
        const oscillator = ctx.createOscillator(), gain = ctx.createGain(), start = ctx.currentTime + .08;
        oscillator.type = sound.type; oscillator.frequency.value = pitch.frequency(note);
        gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(sound.volume, start + sound.attack);
        oscillator.connect(gain); gain.connect(ctx.destination); oscillator.start(start); oscillators.push(oscillator);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); oscillators = oscillators.filter(item => item !== oscillator); };
        heldOscillator = oscillator; heldGain = gain; intervalActive = true; muteUntil = Infinity;
        intervalButton.textContent = '■ Intervall stoppen'; intervalButton.setAttribute('aria-pressed', 'true');
        setStatus(`Der neue Ton ${pitch.name(note)} klingt. Singe ${pitch.name(currentRoot)} weiter und stoppe den Ton, wenn du bereit bist.`);
      } catch (error) { setStatus(error.message || 'Der Ton konnte nicht abgespielt werden.'); stopScheduledAudio(); }
    };
    const stopScale = () => {
      if (!scaleActive) return;
      stopScheduledAudio(); scaleActive = false;
      scaleButton.textContent = '▶ Tonleiter abspielen'; scaleButton.setAttribute('aria-pressed', 'false');
      setStatus('Tonleiter gestoppt. Du kannst sie erneut abspielen oder das Intervall starten.');
    };
    const playScale = () => {
      if (scaleActive) { stopScale(); return; }
      if (intervalActive) stopInterval();
      const root = currentRoot, notes = [root, root + 2, root + 4, root + 5, root + 7, root + 9, root + 11, root + 12, root];
      scaleActive = true; attemptActive = false; setSaveEnabled(false);
      setFeedback('ready', 'Höre die Tonleiter und präge dir den Grundton ein.');
      playNotes(notes, { lastDuration: .9 }, () => {
        scaleActive = false; scaleButton.textContent = '▶ Tonleiter abspielen'; scaleButton.setAttribute('aria-pressed', 'false');
        setStatus(`Tonleiter und ${pitch.name(root)} gehört. Starte jetzt das Intervall.`);
      });
      scaleButton.textContent = '■ Tonleiter stoppen'; scaleButton.setAttribute('aria-pressed', 'true');
    };
    const saveResult = () => {
      if (!attemptActive) return;
      if (centsNow === null) { setFeedback('incorrect', 'Noch kein Ton erkannt. Singe nach dem Stoppen des Intervalltons einen ruhigen Grundton.'); return; }
      if (Math.abs(centsNow) > 40) {
        setFeedback('incorrect', centsNow < 0 ? 'Noch zu tief. Singe etwas höher und versuche es erneut.' : 'Noch zu hoch. Singe etwas tiefer und versuche es erneut.');
        return;
      }
      const interval = Math.abs(currentPair[0] - currentPair[1]), octave = rangeSelect.value;
      results.total = (Number(results.total) || 0) + 1;
      results.byOctave = results.byOctave || {}; results.byInterval = results.byInterval || {};
      results.byOctave[octave] = (Number(results.byOctave[octave]) || 0) + 1;
      results.byInterval[interval] = (Number(results.byInterval[interval]) || 0) + 1;
      results.last = { target: pitch.name(currentRoot), interval, octave, at: new Date().toISOString() };
      try { localStorage.setItem(storageKey, JSON.stringify(results)); } catch {}
      updateProgress(); attemptActive = false; setSaveEnabled(false); currentPair = null;
      intervalButton.textContent = '▶ Neues Intervall abspielen'; intervalButton.setAttribute('aria-pressed', 'false');
      setFeedback('correct', 'Richtig! Du hast den Grundton während des Intervalls gehalten. Dein Treffer wurde gespeichert.');
      setStatus('Richtig gehalten und gespeichert. Starte das nächste Intervall, wenn du bereit bist.');
    };
    const listen = time => {
      if (!stream || !analyser) return;
      frame = requestAnimationFrame(listen);
      if (time - lastFrame < 100) return;
      lastFrame = time;
      if (scaleActive || context.currentTime < muteUntil) { history = []; return; }
      if (context.state !== 'running') return;
      const samples = new Float32Array(analyser.fftSize); analyser.getFloatTimeDomainData(samples);
      const detected = pitch.detect(samples, context.sampleRate);
      if (!detected) {
        history = []; centsNow = null;
        if (!intervalActive) { setSaveEnabled(attemptActive); $('[data-followup-note]').textContent = '—'; $('[data-followup-pointer]').hidden = true; setStatus('Ton noch nicht sicher erkannt. Singe einen einzelnen, ruhigen Grundton.'); }
        return;
      }
      history.push(pitch.midi(detected.hz)); if (history.length > 5) history.shift();
      if (history.length < 3 || intervalActive) return;
      const sorted = [...history].sort((a, b) => a - b), note = sorted[Math.floor(sorted.length / 2)];
      centsNow = 100 * (note - currentRoot);
      $('[data-followup-note]').textContent = pitch.name(Math.round(currentRoot + centsNow / 100));
      $('[data-followup-detail]').textContent = `${pitch.frequency(currentRoot + centsNow / 100).toFixed(1).replace('.', ',')} Hz · ${centsNow > 0 ? '+' : ''}${Math.round(centsNow)} Cent zum Grundton`;
      const pointer = $('[data-followup-pointer]'); pointer.hidden = false; pointer.style.left = `${50 + Math.max(-100, Math.min(100, centsNow)) / 2}%`;
      setSaveEnabled(attemptActive);
      if (Math.abs(centsNow) <= 40) setStatus('Der Grundton ist im Zielbereich. Drücke „Treffer speichern“.');
      else setStatus(centsNow < 0 ? 'Etwas höher singen ↑' : 'Etwas tiefer singen ↓');
    };

    scaleButton.addEventListener('click', playScale);
    intervalButton.addEventListener('click', playInterval);
    saveButton.addEventListener('click', saveResult);
    rangeSelect.addEventListener('change', () => { stopScheduledAudio(); scaleActive = intervalActive = attemptActive = false; scaleButton.textContent = '▶ Tonleiter abspielen'; scaleButton.setAttribute('aria-pressed', 'false'); intervalButton.textContent = '▶ Intervall abspielen'; intervalButton.setAttribute('aria-pressed', 'false'); updateRoot(); });
    micStart.addEventListener('click', async () => {
      if (stream) return;
      if (!navigator.mediaDevices?.getUserMedia) { $('[data-followup-mic-status]').textContent = 'Mikrofon benötigt HTTPS oder localhost.'; return; }
      micStart.disabled = true; micStop.disabled = false; $('[data-followup-mic-status]').textContent = 'Bitte erlaube den Mikrofonzugriff im Browser.';
      try {
        await ensureAudio();
        stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }, video: false });
        source = context.createMediaStreamSource(stream); analyser = context.createAnalyser(); analyser.fftSize = 8192; source.connect(analyser);
        $('[data-followup-mic-status]').textContent = 'Mikrofon aktiv · Auswertung nur auf diesem Gerät.';
        history = []; frame = requestAnimationFrame(listen);
      } catch (error) {
        micStart.disabled = false; micStop.disabled = true; $('[data-followup-mic-status]').textContent = error.message || 'Das Mikrofon konnte nicht gestartet werden.';
      }
    });
    micStop.addEventListener('click', () => {
      if (frame) cancelAnimationFrame(frame); frame = 0;
      if (stream) stream.getTracks().forEach(track => track.stop()); stream = null;
      if (source) source.disconnect(); if (analyser) analyser.disconnect(); source = analyser = null;
      history = []; centsNow = null; setSaveEnabled(false); micStart.disabled = false; micStop.disabled = true;
      $('[data-followup-mic-status]').textContent = 'Mikrofon aus.'; $('[data-followup-note]').textContent = '—'; $('[data-followup-pointer]').hidden = true;
    });
    updateRoot();
  });
  window.addEventListener('pagehide', () => panels.forEach(panel => {
    const button = panel.querySelector('[data-followup-mic-stop]'); if (!button?.disabled) button.click();
  }));
})();
