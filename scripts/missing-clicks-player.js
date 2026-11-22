(() => {
  const players = [...document.querySelectorAll('[data-missing-clicks-player]')];

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

  const metronome = document.querySelector('[data-practice-metronome]');
  if (metronome) {
    const tempo = metronome.querySelector('[data-practice-tempo]');
    const bars = metronome.querySelector('[data-practice-bars]');
    const toggle = metronome.querySelector('.practice-metronome-toggle');
    const status = metronome.querySelector('[role="status"]');
    const indicators = [...document.querySelectorAll('.practice-beats > .foot-beat-down')];
    const upbeats = [...document.querySelectorAll('.practice-beats > .foot-beat-up')];
    const minTempo = Number(tempo.min);
    const maxTempo = Number(tempo.max);
    let bpm = Number(tempo.value);
    let context;
    let timer;
    let indicatorTimer;
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
        playClick(context, nextClick, beatIndex === 0);
        indicatorTimer = window.setTimeout(() => {
          activeUpbeat?.classList.remove('is-current-upbeat');
          activeUpbeat = undefined;
          activeIndicator?.classList.remove('is-current-beat');
          activeIndicator = indicators[beatIndex];
          activeIndicator?.classList.add('is-current-beat');
        }, Math.max(0, (nextClick - context.currentTime) * 1000));
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
      activeIndicator?.classList.remove('is-current-beat');
      activeIndicator = undefined;
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
        nextClick = context.currentTime + 0.02;
        toggle.setAttribute('aria-pressed', 'true');
        status.textContent = '';
        schedule();
        timer = window.setInterval(schedule, 25);
      } catch {
        if (context === startedContext) await stop('Das Metronom konnte nicht gestartet werden.');
      }
    });

    window.addEventListener('pagehide', () => { if (context) void stop(); });
  }

  players.forEach((player) => {
    const button = player.querySelector('[data-missing-clicks-play]');
    const status = player.querySelector('[data-missing-clicks-status]');
    const bpm = 50;
    const beatDuration = 60 / bpm;
    let barCount, countInBeats, isBackbeat, isSparseOneThree, isSparseOne, isWholeNoteC, isHalfNote;
    let isScoreNotation, isHearingSequence, isContinuousMetronome, scoreRepeats, gapBars, scoreBeats, sequenceCycleBeats;
    let noteHz, scoreEvents, durationLabel, alternatingMutedBeats;
    const configureFromData = () => {
      barCount = Number(player.dataset.durationBars || 15);
      countInBeats = Number(player.dataset.countIn || 0);
      isBackbeat = player.dataset.pattern === 'backbeat';
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
        const [beat, duration] = event.split(':').map(Number);
        return { beat, duration };
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
      button.setAttribute('aria-label', 'Metronom einschalten');
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

    const start = async () => {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        status.textContent = 'Dieser Browser unterstützt keine Web-Audio-Wiedergabe.';
        return;
      }
      try {
        context = new AudioContextClass();
        await context.resume();
        const startAt = context.currentTime + 0.12;
        startedAt = performance.now() + 120;
        const totalBeats = countInBeats + (isHearingSequence ? scoreRepeats * sequenceCycleBeats : scoreBeats);
        const totalDuration = totalBeats * beatDuration;
        for (let beat = 0; beat < totalBeats; beat += 1) {
          if (beat < countInBeats) {
            scheduleClick(startAt + beat * beatDuration, beat % 4 === 0);
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
          if (isScoreNotation) {
            scheduleClick(startAt + beat * beatDuration, beatInBar === 0);
            continue;
          }
          const audible = isWholeNoteC || isHalfNote
            ? true
            : isBackbeat
              ? beatInBar === 1 || beatInBar === 3
              : isSparseOneThree
                ? bar % 2 === 0 || beatInBar === 0 || beatInBar === 2
                : isSparseOne
                  ? bar % 2 === 0 || beatInBar === 0
                  : bar % 2 === 0 || !alternatingMutedBeats.includes(beatInBar + 1);
          const accent = isHalfNote ? beatInBar === 0 || beatInBar === 2 : beatInBar === 0;
          if (audible) scheduleClick(startAt + beat * beatDuration, accent);
          if (isWholeNoteC && noteHz && beatInBar === 0 && bar % 2 === 0) {
            scheduleSustainedTone(startAt + beat * beatDuration, 4 * beatDuration);
          }
        }
        if (isHearingSequence) {
          for (let repeat = 0; repeat < scoreRepeats; repeat += 1) {
            scoreEvents.forEach(note => {
              if (note.beat < 0 || note.beat >= scoreBeats) return;
              const beat = countInBeats + repeat * sequenceCycleBeats + note.beat;
              scheduleSustainedTone(startAt + beat * beatDuration, note.duration * beatDuration, 0.14);
            });
          }
        } else if (isScoreNotation) {
          scoreEvents.forEach(note => {
            if (note.beat < 0 || note.beat >= scoreBeats) return;
            const noteStart = startAt + (countInBeats + note.beat) * beatDuration;
            scheduleSustainedTone(noteStart, note.duration * beatDuration, 0.1);
          });
        }
        playing = true;
        player.classList.add('is-radio-on');
        player.removeAttribute('data-switch-prompt');
        button.setAttribute('aria-label', 'Metronom ausschalten');
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

    button.addEventListener('click', () => {
      if (playing) stop();
      else start();
    });
  });
})();
