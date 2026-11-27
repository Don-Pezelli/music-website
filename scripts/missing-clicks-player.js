(() => {
  const players = [...document.querySelectorAll('[data-missing-clicks-player], [data-note-preview]')];

  const playClick = (context, time, accent, destination = context.destination) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(accent ? 1120 : 760, time);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(accent ? 0.34 : 0.22, time + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.075);
    oscillator.connect(gain);
    gain.connect(destination);
    oscillator.start(time);
    oscillator.stop(time + 0.08);
    return [oscillator, gain];
  };

  const clock = document.querySelector('[data-pulse-clock]');
  if (clock) {
    const section = clock.closest('.pulse-clock-explanation') ?? clock;
    const leadIn = document.getElementById('viertelnoten-pausen-vergleich');
    const footMotion = document.getElementById('fussbewegung-animation');
    const footSteps = footMotion ? [...footMotion.querySelectorAll('.count-beat')] : [];
    let footStep = 0;
    if (footSteps.length) footMotion.classList.add('is-clock-synced');
    const clockMetronome = document.querySelector('[data-clock-metronome]');
    const comparisons = [...document.querySelectorAll('[data-rest-comparison-score]')].map((score) => ({
      beatsPerSymbol: Number(score.dataset.beatsPerSymbol),
      symbols: [...score.querySelectorAll('[data-note-preview-beat]')],
      counts: [...score.querySelectorAll('[data-note-preview-beat] > text')]
    }));
    let comparisonBeat = 0;

    function showComparisonBeat(beat) {
      comparisons.forEach(({ beatsPerSymbol, symbols, counts }) => {
        symbols.forEach((symbol, index) => {
          symbol.classList.toggle('is-active', index === Math.floor(beat / beatsPerSymbol));
          symbol.classList.toggle('is-note-onset', beat === index * beatsPerSymbol);
        });
        counts.forEach((count, index) => count.classList.toggle('is-current-count', index === beat));
      });
    }

    function resetComparisonBeat() {
      comparisonBeat = 0;
      showComparisonBeat(-1);
    }
    let clockEnabled = true;
    let metronomeEnabled = true;
    let needleFrame;
    let context;
    let output;
    let metronomeOutput;
    let inRange = false;
    let lastSecond;
    let tickSound;

    function getInstrumentVolume() {
      const bounds = section.getBoundingClientRect();
      const center = bounds.top + bounds.height / 2;
      const viewport = window.innerHeight;
      const distance = center - viewport / 2;
      let range = viewport * 0.75;
      if (distance > 0 && leadIn) {
        const lead = leadIn.getBoundingClientRect();
        range = Math.max(range, center - lead.top - lead.height / 2 + viewport * 0.2);
      } else if (distance < 0 && footMotion) {
        const end = footMotion.getBoundingClientRect();
        range = Math.max(range, end.top + end.height / 2 - center + viewport * 0.2);
      }
      return Math.max(0, 1 - Math.abs(distance) / range) ** 1.2;
    }

    function updateInstrumentButtons() {
      const running = context?.state === 'running';
      clock.setAttribute('aria-pressed', String(running && clockEnabled));
      clockMetronome?.setAttribute('aria-pressed', String(running && metronomeEnabled));
    }

    function updateClockNeedle() {
      if (metronomeEnabled) {
        const phase = (Date.now() % 2000) / 1000;
        clockMetronome.style.setProperty('--clock-metronome-angle', `${22 * Math.sin(Math.PI * phase)}deg`);
      }
      needleFrame = window.requestAnimationFrame(updateClockNeedle);
    }

    function createClockTick(audio) {
      const duration = 0.045;
      const buffer = audio.createBuffer(1, Math.round(audio.sampleRate * duration), audio.sampleRate);
      const samples = buffer.getChannelData(0);
      let texture = 0;
      for (let i = 0; i < samples.length; i += 1) {
        const time = i / audio.sampleRate;
        const resonances = 0.55 * Math.sin(2 * Math.PI * 480 * time) + 0.25 * Math.sin(2 * Math.PI * 960 * time);
        texture = 0.85 * texture + 0.15 * (Math.random() * 2 - 1);
        const envelope = Math.min(1, time / 0.0012) * Math.exp(-time * 135);
        samples[i] = (resonances + 0.2 * texture) * envelope * 0.095;
      }
      return buffer;
    }

    function tickFootMotion(milliseconds) {
      const bounds = footMotion?.getBoundingClientRect();
      if (!footSteps.length || !bounds || bounds.bottom <= 0 || bounds.top >= window.innerHeight) {
        footStep = 0;
        return;
      }
      if (footStep === 0) {
        footSteps.forEach((step) => step.classList.remove('is-revealed'));
        void footMotion.offsetWidth;
      }
      const down = footStep;
      footSteps[down].classList.add('is-revealed');
      window.setTimeout(() => {
        footSteps[down + 1].classList.add('is-revealed');
      }, Math.max(0, 500 - milliseconds));
      footStep = (footStep + 2) % footSteps.length;
    }

    function tickClock() {
      const now = new Date();
      const second = Math.floor(now.getTime() / 1000);
      if (second !== lastSecond) {
        clock.style.setProperty('--clock-hour', `${(now.getHours() % 12) * 30 + now.getMinutes() / 2}deg`);
        clock.style.setProperty('--clock-minute', `${now.getMinutes() * 6 + now.getSeconds() / 10}deg`);
        clock.style.setProperty('--clock-second', `${now.getSeconds() * 6}deg`);
        if (lastSecond !== undefined && context?.state === 'running') {
          if (clockEnabled) {
            const tick = context.createBufferSource();
            tick.buffer = tickSound;
            tick.connect(output);
            tick.start();
          }
          if (clockMetronome && metronomeEnabled) {
            playClick(context, context.currentTime, false, metronomeOutput);
            showComparisonBeat(comparisonBeat);
            comparisonBeat = (comparisonBeat + 1) % 4;
          }
        }
        if (lastSecond !== undefined) tickFootMotion(now.getMilliseconds());
        lastSecond = second;
      }
      window.setTimeout(tickClock, 1000 - now.getMilliseconds());
    }

    function stopClockSound(fade = false) {
      const audio = context;
      const volume = output;
      context = undefined;
      output = undefined;
      metronomeOutput = undefined;
      tickSound = undefined;
      resetComparisonBeat();
      if (needleFrame !== undefined) window.cancelAnimationFrame(needleFrame);
      needleFrame = undefined;
      updateInstrumentButtons();
      if (!audio || audio.state === 'closed') return;
      const close = () => { void audio.close().catch(() => {}); };
      if (fade && audio.state === 'running') {
        volume.gain.setTargetAtTime(0, audio.currentTime, 0.04);
        window.setTimeout(close, 160);
      } else {
        close();
      }
    }

    async function startClockSound() {
      if (context?.state === 'running') return;
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      let audio;
      try {
        audio = context ?? new AudioContextClass();
        if (!context) {
          tickSound = createClockTick(audio);
          output = audio.createGain();
          output.gain.value = getInstrumentVolume();
          output.connect(audio.destination);
          if (clockMetronome) {
            metronomeOutput = audio.createGain();
            metronomeOutput.gain.value = 0.32;
            metronomeOutput.connect(output);
          }
        }
        context = audio;
        await audio.resume();
        if (context !== audio || audio.state !== 'running') return;
        updateInstrumentButtons();
        if (clockMetronome && needleFrame === undefined && window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
          updateClockNeedle();
        }
      } catch {
        if (context === audio) stopClockSound();
      }
    }

    clock.addEventListener('click', () => {
      if (context?.state !== 'running') {
        clockEnabled = true;
        return startClockSound();
      }
      clockEnabled = !clockEnabled;
      updateInstrumentButtons();
    });
    clockMetronome?.addEventListener('click', () => {
      if (context?.state !== 'running') {
        metronomeEnabled = true;
        return startClockSound();
      }
      metronomeEnabled = !metronomeEnabled;
      if (!metronomeEnabled) resetComparisonBeat();
      updateInstrumentButtons();
    });
    const updateClockVolume = () => {
      const volume = getInstrumentVolume();
      if (output) output.gain.setTargetAtTime(volume, context.currentTime, 0.05);
      const nearSection = volume > 0;
      if (nearSection === inRange) return;
      inRange = nearSection;
      if (nearSection) void startClockSound();
      else stopClockSound(true);
    };
    window.addEventListener('scroll', updateClockVolume, { passive: true });
    window.addEventListener('resize', updateClockVolume);
    window.addEventListener('pagehide', () => stopClockSound());
    tickClock();
    updateClockVolume();
  }

  const introMetronome = document.querySelector('[data-inner-time-metronome]');
  if (introMetronome) {
    const beatDuration = 60 / 70;
    let level = 0;
    let output;
    let context;
    let timer;
    let nextClick;
    let metronomeFrame;
    const metronomePair = introMetronome.parentElement;
    const audioStart = document.getElementById('inner-time-audio-start');
    const sentence = document.getElementById('inner-time-pulse-sentence');
    const syllables = [...document.querySelectorAll('#inner-time-pulse-sentence [data-pulse-syllable]')];
    let nextSyllable = 0;
    let syllableTimer;
    let sentenceStarted = false;
    if (syllables.length) sentence.classList.add('is-pulse-reveal');

    function advancePulseReveal() {
      if (nextSyllable === syllables.length) {
        metronomePair.removeAttribute('data-awaiting-sentence');
      } else {
        syllables[nextSyllable].classList.add('is-revealed');
      }
      nextSyllable += 1;
    }

    async function startIntroMetronome() {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass || timer !== undefined) return;
      try {
        const audio = context ?? new AudioContextClass();
        context = audio;
        if (audio.state !== 'running') {
          audioStart.hidden = false;
          await audio.resume();
        }
        if (context !== audio || timer !== undefined || audio.state !== 'running') return;

        output = audio.createGain();
        output.gain.value = level;
        output.connect(audio.destination);
        let swingOrigin = audio.currentTime + 0.025;
        nextClick = swingOrigin;
        const updateMetronomeMotion = () => {
          const phase = (audio.currentTime - swingOrigin) / beatDuration;
          const angle = 22 * Math.sin(Math.PI * phase);
          introMetronome.style.setProperty('--inner-time-needle-angle', `${angle}deg`);
          const beatInBar = Math.max(0, phase) % 4;
          const currentBeat = Math.floor(beatInBar) + 1;
          const beatProgress = beatInBar % 1;
          const heartPulse = beatProgress < 0.6 ? Math.sin(Math.PI * beatProgress / 0.6) : 0;
          const heartScale = 1 + 0.25 * heartPulse;
          metronomePair.style.setProperty('--downbeat-heart-scale', String(currentBeat === 1 ? heartScale : 1));
          if (nextSyllable > syllables.length) {
            const activeBeat = String(currentBeat);
            if (metronomePair.dataset.activeHeartBeat !== activeBeat) {
              metronomePair.dataset.activeHeartBeat = activeBeat;
              if (currentBeat === 1) {
                metronomePair.classList.remove('show-heart-beat-2', 'show-heart-beat-3', 'show-heart-beat-4');
              } else {
                metronomePair.classList.add(`show-heart-beat-${currentBeat}`);
              }
            }
            metronomePair.style.setProperty('--echo-heart-scale', String(heartScale));
          }
          metronomeFrame = window.requestAnimationFrame(updateMetronomeMotion);
        };
        const schedule = () => {
          if (nextClick < audio.currentTime) {
            swingOrigin = audio.currentTime + 0.025;
            nextClick = swingOrigin;
          }
          while (nextClick < audio.currentTime + 0.12) {
            playClick(audio, nextClick, false, output);
            if (sentenceStarted && nextSyllable <= syllables.length) {
              syllableTimer = window.setTimeout(() => {
                if (context === audio && audio.state === 'running' && level >= 0.025) advancePulseReveal();
              }, (nextClick - audio.currentTime) * 1000);
            }
            nextClick += beatDuration;
          }
        };
        audioStart.hidden = true;
        introMetronome.setAttribute('aria-pressed', 'true');
        schedule();
        timer = window.setInterval(schedule, 25);
        if (window.matchMedia('(prefers-reduced-motion: no-preference)').matches) updateMetronomeMotion();
      } catch {
        // A browser can require a click before it permits audio playback.
      }
    }

    function stopIntroMetronome(fade = false) {
      window.clearInterval(timer);
      if (metronomeFrame !== undefined) window.cancelAnimationFrame(metronomeFrame);
      metronomeFrame = undefined;
      metronomePair.style.removeProperty('--downbeat-heart-scale');
      metronomePair.style.removeProperty('--echo-heart-scale');
      delete metronomePair.dataset.activeHeartBeat;
      timer = undefined;
      window.clearTimeout(syllableTimer);
      audioStart.hidden = true;
      introMetronome.setAttribute('aria-pressed', 'false');
      const audio = context;
      const volume = output;
      context = undefined;
      output = undefined;
      if (!audio || audio.state === 'closed') return;
      const close = () => { void audio.close().catch(() => {}); };
      if (fade && volume && audio.state === 'running') {
        volume.gain.setTargetAtTime(0, audio.currentTime, 0.025);
        window.setTimeout(close, 150);
      } else {
        close();
      }
    }

    audioStart.addEventListener('click', startIntroMetronome);
    introMetronome.addEventListener('click', () => {
      if (timer !== undefined) stopIntroMetronome();
      else void startIntroMetronome();
    });
    window.addEventListener('pagehide', () => stopIntroMetronome());

    const audioLeadIn = document.getElementById('puls-unregelmaessig');
    const nextSection = document.getElementById(introMetronome.dataset.innerTimeMetronome);
    const clamp = (value) => Math.min(1, Math.max(0, value));
    let inReadingRange = false;
    const updateReadingRange = () => {
      if (!sentenceStarted && syllables.length) {
        const bounds = sentence.getBoundingClientRect();
        if (bounds.top < window.innerHeight * 0.6 && bounds.bottom > 0) {
          sentenceStarted = true;
        }
      }
      const control = introMetronome.getBoundingClientRect();
      const center = (control.top + control.height / 2) / window.innerHeight;
      const nextTop = (nextSection?.getBoundingClientRect().top ?? Infinity) / window.innerHeight;
      const leadInTop = (audioLeadIn?.getBoundingClientRect().top ?? Infinity) / window.innerHeight;
      const quietApproach = center > 0.5 ? 0.08 * clamp(1 - leadInTop / 0.2) : 0;
      const proximity = clamp(1 - Math.abs(center - 0.5) / 0.75);
      const sectionFade = clamp((nextTop - 0.4) / 0.4);
      level = Math.max(quietApproach, proximity ** 1.7) * sectionFade;
      if (output) output.gain.setTargetAtTime(level, context.currentTime, 0.05);

      const shouldPlay = level > 0;
      if (shouldPlay === inReadingRange) return;
      inReadingRange = shouldPlay;
      introMetronome.classList.toggle('is-visible', shouldPlay);
      if (shouldPlay) void startIntroMetronome();
      else stopIntroMetronome(true);
    };
    window.addEventListener('scroll', updateReadingRange, { passive: true });
    window.addEventListener('resize', updateReadingRange);
    updateReadingRange();
  }

  document.querySelectorAll('[data-practice-metronome]').forEach((metronome) => {
    const tempo = metronome.querySelector('[data-practice-tempo]');
    const bars = metronome.querySelector('[data-practice-bars]');
    const toggle = metronome.querySelector('.practice-metronome-toggle');
    const status = metronome.querySelector('[role="status"]');
    const exercise = metronome.closest('.practice-count');
    const indicators = [...exercise.querySelectorAll('.practice-beats > .foot-beat-down, [data-practice-beat]')];
    const upbeats = [...exercise.querySelectorAll('.practice-beats > .foot-beat-up')];
    const score = exercise.querySelector('[data-practice-score]');
    const scoreNotes = score ? [...score.querySelectorAll('[data-note-preview-beat]')] : [];
    const scoreBeats = scoreNotes.flatMap(note =>
      [...note.querySelectorAll('[data-practice-beat]')].map((_, index) => ({ note, onset: index === 0 }))
    );
    const clap = exercise.querySelector('[data-practice-clap]');
    const indicatorClass = score ? 'is-current-count' : 'is-current-beat';
    const minTempo = Number(tempo.min);
    const maxTempo = Number(tempo.max);
    let bpm = Number(tempo.value);
    let context;
    let timer;
    let indicatorTimer;
    let clapTimer;
    let upbeatTimer;
    let activeIndicator;
    let activeUpbeat;
    let barCount = Number(bars.value);
    let totalBeats;
    let beat;
    let nextClick;

    function updateTempo() {
      if (Number.isFinite(tempo.valueAsNumber)) {
        bpm = Math.min(maxTempo, Math.max(minTempo, Math.round(tempo.valueAsNumber)));
      }
    }

    metronome.querySelectorAll('[data-practice-tempo-step]').forEach((button) => {
      button.addEventListener('click', () => {
        tempo.value = Math.min(maxTempo, Math.max(minTempo, bpm + Number(button.dataset.practiceTempoStep)));
        updateTempo();
      });
    });

    tempo.addEventListener('input', updateTempo);
    tempo.addEventListener('change', () => {
      updateTempo();
      tempo.value = bpm;
    });

    function updateBarCount() {
      if (Number.isFinite(bars.valueAsNumber)) {
        barCount = Math.min(Number(bars.max), Math.max(Number(bars.min), Math.round(bars.valueAsNumber)));
      }
      bars.value = barCount;
    }

    bars.addEventListener('change', updateBarCount);

    function schedule() {
      if (beat === totalBeats) {
        if (context.currentTime >= nextClick) {
          void stop(barCount === 1 ? '1 Takt abgeschlossen.' : `${barCount} Takte abgeschlossen.`);
        }
        return;
      }
      if (nextClick < context.currentTime) nextClick = context.currentTime;
      while (beat < totalBeats && nextClick < context.currentTime + 0.12) {
        const beatIndex = beat % 4;
        const clickDelay = Math.max(0, (nextClick - context.currentTime) * 1000);
        const scoreBeat = scoreBeats[beatIndex];
        const noteOnset = scoreBeat?.onset ?? beatIndex === 0;
        if (clap && noteOnset) {
          clapTimer = window.setTimeout(() => {
            clap.style.setProperty('--clap-beat', String(beatIndex));
            clap.classList.add('is-preparing-clap');
          }, Math.max(0, clickDelay - 90));
        }
        playClick(context, nextClick, beatIndex === 0);
        indicatorTimer = window.setTimeout(() => {
          activeUpbeat?.classList.remove('is-current-upbeat');
          activeUpbeat = undefined;
          activeIndicator?.classList.remove(indicatorClass);
          activeIndicator = indicators[beatIndex];
          activeIndicator?.classList.add(indicatorClass);
          scoreNotes.forEach(note => {
            const active = note === scoreBeat?.note;
            note.classList.toggle('is-active', active);
            note.classList.toggle('is-note-onset', active && noteOnset);
          });
          if (clap) {
            if (noteOnset) clap.style.setProperty('--clap-beat', String(beatIndex));
            clap.classList.remove('is-preparing-clap');
            clap.classList.add('is-playing');
            clap.classList.toggle('is-clapping', noteOnset);
          }
        }, clickDelay);
        const beatDuration = 60 / bpm;
        upbeatTimer = window.setTimeout(() => {
          activeUpbeat = upbeats[beatIndex];
          activeUpbeat?.classList.add('is-current-upbeat');
        }, Math.max(0, (nextClick + beatDuration / 2 - context.currentTime) * 1000));
        nextClick += beatDuration;
        beat += 1;
      }
    }

    async function stop(message = '') {
      window.clearInterval(timer);
      window.clearTimeout(indicatorTimer);
      activeIndicator?.classList.remove(indicatorClass);
      activeIndicator = undefined;
      scoreNotes.forEach((note) => note.classList.remove('is-active', 'is-note-onset'));
      window.clearTimeout(clapTimer);
      clap?.classList.remove('is-playing', 'is-clapping', 'is-preparing-clap');
      clap?.style.removeProperty('--clap-beat');
      window.clearTimeout(upbeatTimer);
      activeUpbeat?.classList.remove('is-current-upbeat');
      activeUpbeat = undefined;
      const previousContext = context;
      context = undefined;
      toggle.setAttribute('aria-pressed', 'false');
      bars.disabled = false;
      status.textContent = message;
      if (previousContext && previousContext.state !== 'closed') {
        try { await previousContext.close(); } catch {}
      }
    }

    toggle.addEventListener('click', async () => {
      if (context) {
        await stop();
        return;
      }
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        status.textContent = 'Audio wird von diesem Browser nicht unterstützt.';
        return;
      }
      let startedContext;
      try {
        startedContext = new AudioContextClass();
        context = startedContext;
        await startedContext.resume();
        if (context !== startedContext) return;
        updateBarCount();
        bars.disabled = true;
        totalBeats = barCount * 4;
        beat = 0;
        nextClick = context.currentTime + (clap ? 0.11 : 0.02);
        toggle.setAttribute('aria-pressed', 'true');
        status.textContent = '';
        schedule();
        timer = window.setInterval(schedule, 25);
      } catch {
        if (context === startedContext) await stop('Das Metronom konnte nicht gestartet werden.');
      }
    });

    window.addEventListener('pagehide', () => { if (context) void stop(); });
  });

  players.forEach((player) => {
    const button = player.querySelector('[data-missing-clicks-play]');
    const status = player.querySelector('[data-missing-clicks-status]');
    const previewName = player.dataset.notePreview;
    const animatedPreview = 'notePreviewAnimated' in player.dataset;
    const previewCount = animatedPreview ? player.querySelector('[data-note-preview-count]') : null;
    const previewNotes = animatedPreview ? [...player.querySelectorAll('[data-note-preview-beat]')] : [];
    let previewBeat = 0;
    const previewSpans = previewNotes.map(symbol => {
      const start = previewBeat;
      previewBeat += symbol.querySelectorAll('text').length;
      return { symbol, start, end: previewBeat };
    });
    const previewCounts = 'notePreviewPulseCount' in player.dataset
      ? [...player.querySelectorAll('[data-note-preview-beat] > text')]
      : [];
    const radioLamps = [...player.querySelectorAll('[data-radio-click-pattern] .pulse-beat')];
    let visualTimers = [];

    let radioCountingIn = false;
    function showRadioLamp(index, countInNumber) {
      radioLamps.forEach((lamp, position) => lamp.classList.toggle('is-playing-beat', position === index));
      if (countInNumber !== undefined || radioCountingIn) {
        const firstLamp = radioLamps[0];
        firstLamp.querySelector('[aria-hidden]').textContent = String(countInNumber ?? 1);
        firstLamp.querySelector('.sr-only').textContent = countInNumber === undefined ? '1: Klick' : `Einzähler: ${countInNumber}`;
        radioCountingIn = countInNumber !== undefined;
      }
    }

    function showPreviewBeat(beat) {
      if (!previewCount) return;
      previewCount.textContent = beat >= 0 && beat < countInBeats ? String(beat + 1) : '';
      const rhythmBeat = beat - countInBeats;
      previewCounts.forEach((count, index) => count.classList.toggle('is-current-count', index === rhythmBeat));
      previewSpans.forEach(({ symbol, start, end }) => {
        symbol.classList.toggle('is-active', rhythmBeat >= start && rhythmBeat < end);
      });
    }
    const bpm = Number(player.dataset.bpm ?? 50);
    const beatDuration = 60 / bpm;
    let barCount, countInBeats, isBackbeat, isContinuousOneThree, isSparseOneThree, isSparseOne, isWholeNoteC, isHalfNote;
    let isScoreNotation, isHearingSequence, isContinuousMetronome, scoreRepeats, gapBars, scoreBeats, sequenceCycleBeats;
    let noteHz, scoreEvents, durationLabel, alternatingMutedBeats;
    const configureFromData = () => {
      barCount = Number(player.dataset.durationBars || 15);
      countInBeats = Number(player.dataset.countIn || 0);
      isBackbeat = player.dataset.pattern === 'backbeat';
      isContinuousOneThree = player.dataset.pattern === 'continuous-1-3';
      isSparseOneThree = player.dataset.pattern === 'alternating-1-3';
      isSparseOne = player.dataset.pattern === 'alternating-1';
      alternatingMutedBeats = (player.dataset.alternatingMutedBeats || '1 3').split(/\s+/).map(Number);
      isWholeNoteC = player.dataset.pattern === 'whole-note-c';
      isHalfNote = player.dataset.pattern === 'half-note';
      isScoreNotation = player.dataset.pattern === 'score-notation';
      isHearingSequence = player.dataset.hearingSequence === 'true';
      isContinuousMetronome = player.dataset.continuousMetronome === 'true';
      scoreRepeats = Math.max(1, Number(player.dataset.scoreRepeats || 1));
      gapBars = Math.max(0, Number(player.dataset.gapBars || 0));
      scoreBeats = barCount * 4;
      sequenceCycleBeats = scoreBeats + gapBars * 4;
      noteHz = Number(player.dataset.noteHz || (isScoreNotation ? 392 : 0));
      scoreEvents = (player.dataset.scoreEvents || '').split(',').map(event => {
        const [beat, duration, accent] = event.split(':').map(Number);
        return { beat, duration, accent: accent === 1 };
      }).filter(event => Number.isFinite(event.beat) && Number.isFinite(event.duration));
      durationLabel = player.dataset.durationLabel || '1:12';
    };
    configureFromData();
    player.addEventListener('rhythmradio:configure', () => {
      if (playing) return;
      configureFromData();
      status.textContent = 'Bereit';
    });
    let context;
    let scheduled = [];
    let ticker;
    let completionTimer;
    let startedAt = 0;
    let playing = false;

    const update = () => {
      const elapsed = Math.max(0, (performance.now() - startedAt) / 1000);
      if (elapsed < countInBeats * beatDuration) {
        const beatNumber = Math.min(countInBeats, Math.floor(elapsed / beatDuration) + 1);
        status.textContent = `Einzähler · ${beatNumber} von ${countInBeats}`;
        return;
      }
      const rhythmElapsed = elapsed - countInBeats * beatDuration;
      if (isHearingSequence) {
        const sequenceBeat = rhythmElapsed / beatDuration;
        const cycle = Math.min(scoreRepeats - 1, Math.floor(sequenceBeat / sequenceCycleBeats));
        const beatInCycle = sequenceBeat - cycle * sequenceCycleBeats;
        status.textContent = beatInCycle < scoreBeats
          ? `Durchgang ${cycle + 1} von ${scoreRepeats} · Takt ${Math.floor(beatInCycle / 4) + 1}`
          : `Metronompause · Durchgang ${cycle + 1} von ${scoreRepeats}`;
        return;
      }
      const currentBar = Math.min(barCount, Math.floor(rhythmElapsed / (beatDuration * 4)) + 1);
      status.textContent = `Läuft · Takt ${currentBar} von ${barCount}`;
    };

    const stop = async (message = 'Gestoppt') => {
      playing = false;
      clearInterval(ticker);
      ticker = undefined;
      clearTimeout(completionTimer);
      completionTimer = undefined;
      visualTimers.forEach(clearTimeout);
      visualTimers = [];
      showPreviewBeat(-1);
      showRadioLamp(-1);
      for (const node of scheduled) {
        try { node.stop(); } catch {}
        try { node.disconnect(); } catch {}
      }
      scheduled = [];
      if (context && context.state !== 'closed') {
        try { await context.close(); } catch {}
      }
      context = undefined;
      player.classList.remove('is-radio-on');
      button.setAttribute('aria-label', previewName ? `${previewName} abspielen` : 'Metronom einschalten');
      button.setAttribute('aria-pressed', 'false');
      player.dispatchEvent(new CustomEvent('rhythmradio:playback', { detail: { playing: false } }));
      status.textContent = message;
    };

    const scheduleClick = (time, accent) => {
      scheduled.push(...playClick(context, time, accent));
    };

    const scheduleSustainedTone = (time, duration, volume = 0.14) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(noteHz, time);
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(volume, time + 0.035);
      gain.gain.setValueAtTime(volume, time + duration - 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration - 0.015);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(time);
      oscillator.stop(time + duration);
      scheduled.push(oscillator, gain);
    };

    let taskChanging = false;
    const start = async () => {
      if (context || taskChanging) return;
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        status.textContent = 'Dieser Browser unterstützt keine Web-Audio-Wiedergabe.';
        return;
      }
      try {
        const audio = new AudioContextClass();
        context = audio;
        await audio.resume();
        if (context !== audio || taskChanging) return;
        const startAt = audio.currentTime + 0.12;
        startedAt = performance.now() + 120;
        const totalBeats = countInBeats + (isHearingSequence ? scoreRepeats * sequenceCycleBeats : scoreBeats);
        const totalDuration = totalBeats * beatDuration;
        for (let beat = 0; beat < totalBeats; beat += 1) {
          if (animatedPreview) {
            const delay = (startAt + beat * beatDuration - context.currentTime) * 1000;
            visualTimers.push(window.setTimeout(() => showPreviewBeat(beat), delay));
          }
          if (beat < countInBeats) {
            scheduleClick(startAt + beat * beatDuration, beat % 4 === 0);
            if (radioLamps.length && (player.dataset.radioTaskSequence === 'single' || player.hasAttribute('data-radio-count-in-lamps'))) {
              const delay = (startAt + beat * beatDuration - context.currentTime) * 1000;
              visualTimers.push(window.setTimeout(() => showRadioLamp(0, beat + 1), delay));
            }
            continue;
          }
          const rhythmBeat = beat - countInBeats;
          if (isHearingSequence) {
            const beatInCycle = rhythmBeat % sequenceCycleBeats;
            if (isContinuousMetronome || beatInCycle >= scoreBeats) {
              const beatWithinBar = beatInCycle % 4;
              scheduleClick(startAt + beat * beatDuration, beatWithinBar === 0);
            }
            continue;
          }
          const beatInBar = rhythmBeat % 4;
          const bar = Math.floor(rhythmBeat / 4);
          const audible = isScoreNotation || isWholeNoteC || isHalfNote
            ? true
            : isBackbeat || isContinuousOneThree
              ? beatInBar % 2 === (isBackbeat ? 1 : 0)
              : isSparseOneThree
                ? bar % 2 === 0 || beatInBar === 0 || beatInBar === 2
                : isSparseOne
                  ? bar % 2 === 0 || beatInBar === 0
                  : bar % 2 === 0 || !alternatingMutedBeats.includes(beatInBar + 1);
          const accent = isHalfNote ? beatInBar === 0 || beatInBar === 2 : beatInBar === 0;
          if (audible) scheduleClick(startAt + beat * beatDuration, accent);
          if (radioLamps.length) {
            const lampIndex = audible ? rhythmBeat % radioLamps.length : -1;
            const delay = (startAt + beat * beatDuration - context.currentTime) * 1000;
            visualTimers.push(window.setTimeout(() => showRadioLamp(lampIndex), delay));
          }
          if (isWholeNoteC && noteHz && beatInBar === 0 && bar % 2 === 0) {
            scheduleSustainedTone(startAt + beat * beatDuration, 4 * beatDuration);
          }
          if (isHalfNote && noteHz && beatInBar % 2 === 0) {
            scheduleSustainedTone(startAt + beat * beatDuration, 2 * beatDuration);
          }
        }
        if (isHearingSequence) {
          for (let repeat = 0; repeat < scoreRepeats; repeat += 1) {
            scoreEvents.forEach(note => {
              if (note.beat < 0 || note.beat >= scoreBeats) return;
              const beat = countInBeats + repeat * sequenceCycleBeats + note.beat;
              scheduleSustainedTone(startAt + beat * beatDuration, note.duration * beatDuration, note.accent ? 0.22 : 0.14);
            });
          }
        } else if (isScoreNotation) {
          scoreEvents.forEach(note => {
            if (note.beat < 0 || note.beat >= scoreBeats) return;
            const noteStart = startAt + (countInBeats + note.beat) * beatDuration;
            scheduleSustainedTone(noteStart, note.duration * beatDuration, note.accent ? 0.17 : 0.1);
          });
        }
        playing = true;
        player.classList.add('is-radio-on');
        player.removeAttribute('data-switch-prompt');
        button.setAttribute('aria-label', previewName ? `${previewName}: Wiedergabe stoppen` : 'Metronom ausschalten');
        button.setAttribute('aria-pressed', 'true');
        player.dispatchEvent(new CustomEvent('rhythmradio:playback', {
          detail: { playing: true, startedAt, bpm, countInBeats, durationBeats: totalBeats - countInBeats }
        }));
        update();
        ticker = window.setInterval(update, 150);
        completionTimer = window.setTimeout(() => {
          if (playing) stop(`Fertig · ${durationLabel}`);
        }, totalDuration * 1000 + 150);
      } catch {
        await stop('Die Wiedergabe konnte nicht gestartet werden.');
      }
    };

    player.addEventListener('rhythmradio:stop', () => {
      if (context) void stop();
    });

    button.addEventListener('click', () => {
      if (playing) stop();
      else start();
    });

    const eye = player.querySelector('[data-radio-shutter-toggle]');
    const pattern = player.querySelector('[data-radio-click-pattern]');
    const shutter = player.querySelector('[data-radio-shutter]');
    function setShutter(closed) {
      eye.setAttribute('aria-pressed', String(closed));
      shutter.inert = !closed;
      if (closed) pattern.setAttribute('aria-hidden', 'true');
      else pattern.removeAttribute('aria-hidden');
    }

    eye?.addEventListener('click', () => {
      if (taskChanging) return;
      setShutter(eye.getAttribute('aria-pressed') !== 'true');
      if (!playing) void start();
    });

    if ('radioTaskSequence' in player.dataset) {
      const next = player.querySelector('[data-radio-next-exercise]');
      const goals = document.getElementById(player.dataset.radioGoals || 'ziele-fehlende-klicks');
      const title = player.querySelector('[data-radio-exercise-title]');
      const details = player.querySelector('[data-radio-exercise-details]');
      const frequency = player.querySelector('[data-radio-exercise-frequency]');
      const backbeat = player.dataset.radioTaskSequence === 'backbeat';
      const oneThree = player.dataset.radioTaskSequence === 'one-three';
      const twoExercises = backbeat || oneThree;
      const exerciseCount = player.dataset.radioTaskSequence === 'single' ? 1 : twoExercises ? 2 : 4;
      const lessonNumber = backbeat ? '03' : oneThree ? '04' : '02';
      const clickPair = backbeat ? '2 und 4' : '1 und 3';
      const instructions = twoExercises ? [...player.parentElement.querySelectorAll('[data-radio-exercise-instruction]')] : [];
      let exercise = 1;

      next.addEventListener('click', async () => {
        if (taskChanging) return;
        taskChanging = true;
        if (context) await stop();
        if (exercise === exerciseCount) {
          goals.scrollIntoView({ block: 'center' });
          goals.focus({ preventScroll: true });
          taskChanging = false;
          return;
        }
        exercise += 1;
        if (twoExercises) {
          player.dataset.pattern = backbeat ? 'backbeat' : 'continuous-1-3';
          player.dataset.countIn = '4';
          player.dataset.durationBars = '7';
          player.dataset.durationLabel = '8 Takte mit Einzähler';
        } else {
          player.dataset.alternatingMutedBeats = String(exercise);
        }
        configureFromData();

        const exerciseTitle = backbeat ? 'Durchgehender Backbeat' : oneThree ? 'Durchgehend Klick auf 1 und 3' : `Klick auf ${exercise} fehlt`;
        title.textContent = exerciseTitle;
        details.textContent = twoExercises
          ? `${bpm} BPM · Einzähler · danach Klicks auf ${clickPair} · 8 Takte insgesamt`
          : `${bpm} BPM · Im zweiten Takt fehlt die ${exercise} · 8 Durchgänge`;
        frequency.textContent = `K01L${lessonNumber} · Ü0${exercise}`;
        frequency.parentElement.setAttribute('aria-label', `Kursfrequenz Kurs 1, Lektion ${Number(lessonNumber)}, Übung ${exercise}`);
        player.setAttribute('aria-label', `Metronom: ${exerciseTitle}`);
        instructions.forEach((instruction) => {
          instruction.hidden = Number(instruction.dataset.radioExerciseInstruction) !== exercise;
        });
        radioLamps.forEach((lamp, index) => {
          const beat = index % 4 + 1;
          const silent = twoExercises ? beat % 2 === (backbeat ? 1 : 0) : index >= 4 && beat === exercise;
          lamp.classList.toggle('is-silent', silent);
          lamp.querySelector('[aria-hidden]').textContent = silent ? '·' : String(beat);
          lamp.querySelector('.sr-only').textContent = `${beat}: ${silent ? 'kein Klick' : 'Klick'}`;
        });

        eye.focus();
        setShutter(false);
        if (exercise === exerciseCount) {
          next.textContent = 'Fertig!';
          next.classList.add('is-finish');
        }
        status.textContent = `Übung ${exercise} bereit`;
        taskChanging = false;
      });
    }
  });
})();
