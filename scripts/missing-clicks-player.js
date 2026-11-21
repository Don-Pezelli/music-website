(() => {
  const players = [...document.querySelectorAll('[data-missing-clicks-player]')];
  if (!players.length) return;

  players.forEach((player) => {
    const button = player.querySelector('[data-missing-clicks-play]');
    const status = player.querySelector('[data-missing-clicks-status]');
    const bpm = 50;
    const beatDuration = 60 / bpm;
    let barCount, countInBeats, isBackbeat, isSparseOneThree, isSparseOne, isWholeNoteC, isHalfNote;
    let isScoreNotation, isHearingSequence, isContinuousMetronome, scoreRepeats, gapBars, scoreBeats, sequenceCycleBeats;
    let noteHz, scoreEvents, durationLabel;
    const configureFromData = () => {
      barCount = Number(player.dataset.durationBars || 15);
      countInBeats = Number(player.dataset.countIn || 0);
      isBackbeat = player.dataset.pattern === 'backbeat';
      isSparseOneThree = player.dataset.pattern === 'alternating-1-3';
      isSparseOne = player.dataset.pattern === 'alternating-1';
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
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(accent ? 1120 : 760, time);
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(accent ? 0.34 : 0.22, time + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.075);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(time);
      oscillator.stop(time + 0.08);
      scheduled.push(oscillator, gain);
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
                  : bar % 2 === 0 || beatInBar === 1 || beatInBar === 3;
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
