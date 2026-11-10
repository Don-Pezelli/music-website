(() => {
  const composer = document.querySelector('#melody-composer');
  if (!composer) return;

  const staffSvgs = [...composer.querySelectorAll('[data-staff-measure]')];
  const scoreLayers = [...composer.querySelectorAll('[data-score-notes]')];
  const previewLayers = [...composer.querySelectorAll('[data-preview-note]')];
  const durationSelect = composer.querySelector('[data-note-duration]');
  const eraseButton = composer.querySelector('[data-erase-mode]');
  const status = composer.querySelector('[data-composer-status]');
  const stopButton = composer.querySelector('[data-stop-melody]');
  const measurePlayButtons = [...composer.querySelectorAll('[data-play-measure]')];
  const clearButtons = [...composer.querySelectorAll('[data-clear-measure]')];
  const semitones = [0, 2, 4, 5, 7, 9, 11];
  const noteColors = semitones.map(semitone => `var(--pitch-${semitone})`);
  const noteY = {1:100, 2:95, 3:90, 4:85, 5:80, 6:75, 7:70};
  const bars = [Array(8).fill(null)];
  let eraseMode = false;
  let lastHover = null;
  let context;
  let activeNodes = [];

  const stopAudio = () => {
    activeNodes.forEach(node => { try { node.stop(); } catch {} });
    activeNodes = [];
    stopButton.disabled = true;
  };

  const updatePlaybackState = () => {
    bars.forEach((bar, index) => {
      measurePlayButtons[index].disabled = !bar.some(Boolean);
    });
  };

  const noteSymbol = (degree, x, duration, ghost = false) => {
    const y = noteY[degree];
    const down = degree === 7;
    const stemX = x + (down ? -5 : 5);
    const stemEnd = y + (down ? 26 : -26);
    const color = noteColors[degree - 1];
    const opacity = ghost ? ' opacity=".48"' : '';
    let svg = '';
    if (degree === 1) svg += `<path d="M${x-9} 100H${x+9}" stroke="${color}" stroke-width="1.2"${opacity}/>`;
    svg += `<text x="${x}" y="27" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="700" fill="${color}"${opacity}>${degree}</text>`;
    svg += `<ellipse cx="${x}" cy="${y}" rx="5.7" ry="3.8" transform="rotate(-20 ${x} ${y})" fill="${color}"${opacity}/><path d="M${stemX} ${y}V${stemEnd}" stroke="${color}" stroke-width="1.4"${opacity}/>`;
    return {svg, stemX, stemEnd, down, x, y, duration, color};
  };

  const renderBar = barIndex => {
    const layer = scoreLayers[barIndex];
    layer.replaceChildren();
    for (let beat = 0; beat < 4; beat += 1) {
      const baseSlot = beat * 2;
      const first = bars[barIndex][baseSlot];
      if (first?.type === 'quarter') {
        const x = 100 + baseSlot * 62.5 + 31.25;
        const note = noteSymbol(first.degree, x, 4);
        layer.insertAdjacentHTML('beforeend', note.svg);
      } else {
        const drawn = [];
        for (let subdivision = 0; subdivision < 2; subdivision += 1) {
          const slot = baseSlot + subdivision;
          const noteData = bars[barIndex][slot];
          if (noteData?.type !== 'eighth') continue;
          const x = 100 + slot * 62.5;
          const note = noteSymbol(noteData.degree, x, 8);
          layer.insertAdjacentHTML('beforeend', note.svg);
          drawn.push(note);
        }
        if (drawn.length === 2 && drawn[0].down === drawn[1].down) {
          const [a,b] = drawn;
          const thickness = a.down ? -4 : 4;
        layer.insertAdjacentHTML('beforeend', `<path d="M${a.stemX} ${a.stemEnd}L${b.stemX} ${b.stemEnd}l0 ${thickness}L${a.stemX} ${a.stemEnd+thickness}Z" fill="#263438"/>`);
        } else {
          drawn.forEach(note => {
            const flag = note.down
              ? `<path d="M${note.stemX} ${note.stemEnd}c-10 -5 -13 -10 -13 -16c4 5 8 7 13 8Z" fill="${note.color}"/>`
              : `<path d="M${note.stemX} ${note.stemEnd}c10 5 13 10 13 16c-4-5-8-7-13-8Z" fill="${note.color}"/>`;
            layer.insertAdjacentHTML('beforeend', flag);
          });
        }
      }
    }
  };

  const clearAt = (barIndex, slot) => {
    const note = bars[barIndex][slot];
    if (note?.type === 'quarter') {
      bars[barIndex][slot] = null;
      bars[barIndex][slot + 1] = null;
    } else if (note?.type === 'hold') {
      bars[barIndex][slot - 1] = null;
      bars[barIndex][slot] = null;
    } else {
      bars[barIndex][slot] = null;
    }
  };

  const putNote = (barIndex, requestedSlot, degree) => {
    const duration = Number(durationSelect.value);
    if (eraseMode) {
      clearAt(barIndex, requestedSlot);
      renderBar(barIndex);
      updatePlaybackState();
      status.textContent = `Position in Takt ${barIndex + 1} gelöscht.`;
      return;
    }
    let slot = requestedSlot;
    if (duration === 4) slot = Math.floor(slot / 2) * 2;
    if (duration === 4) {
      const first = bars[barIndex][slot];
      const second = bars[barIndex][slot + 1];
      if (first?.type === 'eighth' || second?.type === 'eighth') {
        status.textContent = 'In diesem Schlag liegt schon eine Achtelnote. Lösche sie zuerst oder wähle Achtelnote.';
        return;
      }
      if (first?.type === 'hold') clearAt(barIndex, slot);
      bars[barIndex][slot] = {type:'quarter', degree};
      bars[barIndex][slot + 1] = {type:'hold'};
    } else {
      if (bars[barIndex][slot]?.type === 'hold') clearAt(barIndex, slot);
      if (bars[barIndex][slot]?.type === 'quarter') clearAt(barIndex, slot);
      bars[barIndex][slot] = {type:'eighth', degree};
    }
    renderBar(barIndex);
    updatePlaybackState();
    status.textContent = `Tonstufe ${degree} in Takt ${barIndex + 1} eingesetzt.`;
  };

  const clearPreview = barIndex => previewLayers[barIndex].replaceChildren();

  const renderPreview = (event, barIndex) => {
    const layer = previewLayers[barIndex];
    layer.replaceChildren();
    if (eraseMode) return;
    const svg = event.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = (event.clientX - rect.left) * 600 / rect.width;
    const y = (event.clientY - rect.top) * 145 / rect.height;
    if (x < 70 || x > 570 || y < 48 || y > 105) return;
    const degree = Math.max(1, Math.min(7, Math.round((100 - y) / 5) + 1));
    const duration = Number(durationSelect.value);
    let slot, noteX;
    if (duration === 4) {
      const beat = Math.max(0, Math.min(3, Math.round((x - 131.25) / 125)));
      slot = beat * 2;
      noteX = 100 + slot * 62.5 + 31.25;
    } else {
      slot = Math.max(0, Math.min(7, Math.round((x - 100) / 62.5)));
      noteX = 100 + slot * 62.5;
    }
    const note = noteSymbol(degree, noteX, duration, true);
    layer.insertAdjacentHTML('beforeend', note.svg);
    if (duration === 8) {
      const flag = note.down
        ? `<path d="M${note.stemX} ${note.stemEnd}c-10 -5 -13 -10 -13 -16c4 5 8 7 13 8Z" fill="${note.color}" opacity=".48"/>`
        : `<path d="M${note.stemX} ${note.stemEnd}c10 5 13 10 13 16c-4-5-8-7-13-8Z" fill="${note.color}" opacity=".48"/>`;
      layer.insertAdjacentHTML('beforeend', flag);
    }
  };

  const staffClick = (event, barIndex) => {
    const svg = event.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = (event.clientX - rect.left) * 600 / rect.width;
    const y = (event.clientY - rect.top) * 145 / rect.height;
    if (x < 70 || x > 570 || y < 48 || y > 105) {
      status.textContent = 'Klicke innerhalb der Notenlinien, um eine Note zu setzen.';
      return;
    }
    const duration = Number(durationSelect.value);
    const slot = duration === 4
      ? Math.max(0, Math.min(6, Math.round((x - 131.25) / 125) * 2))
      : Math.max(0, Math.min(7, Math.round((x - 100) / 62.5)));
    const degree = Math.max(1, Math.min(7, Math.round((100 - y) / 5) + 1));
    putNote(barIndex, slot, degree);
    clearPreview(barIndex);
  };

  const eventsFor = barIndexes => {
    const events = [];
    barIndexes.forEach((barIndex, playbackIndex) => {
      bars[barIndex].forEach((note, slot) => {
        if (note?.type === 'quarter') events.push({degree:note.degree, onset:playbackIndex * 4 + slot / 2, duration:1});
        if (note?.type === 'eighth') events.push({degree:note.degree, onset:playbackIndex * 4 + slot / 2, duration:.5});
      });
    });
    return events;
  };

  const playEvents = async (events, message) => {
    stopAudio();
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) { status.textContent = 'Audio wird von diesem Browser nicht unterstützt.'; return; }
    try {
      if (!context || context.state === 'closed') context = new Audio();
      if (context.state !== 'running') await context.resume();
      const start = context.currentTime + .08;
      const beatSeconds = 60 / 81.45;
      events.forEach(({degree, onset, duration}) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const noteLength = beatSeconds * duration;
        const time = start + beatSeconds * onset;
        oscillator.type = 'triangle';
        oscillator.frequency.value = 440 * Math.pow(2, (60 + semitones[degree - 1] - 69) / 12);
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(.14, time + .025);
        gain.gain.setValueAtTime(.14, time + noteLength - .06);
        gain.gain.linearRampToValueAtTime(0, time + noteLength);
        oscillator.connect(gain); gain.connect(context.destination);
        oscillator.start(time); oscillator.stop(time + noteLength + .02);
        oscillator.onended = () => {
          oscillator.disconnect(); gain.disconnect();
          activeNodes = activeNodes.filter(node => node !== oscillator);
          if (!activeNodes.length) stopButton.disabled = true;
        };
        activeNodes.push(oscillator);
      });
      stopButton.disabled = !events.length;
      status.textContent = message;
    } catch {
      status.textContent = 'Die Wiedergabe konnte nicht gestartet werden. Versuche es noch einmal.';
    }
  };

  const playSimple = async (degrees, message) => {
    const beatSeconds = 60 / 81.45;
    const events = degrees.map((degree, index) => ({degree, onset:index, duration:degree===1 && degrees.length===1 ? 1.5 : 1}));
    await playEvents(events, message);
  };

  staffSvgs.forEach((svg, index) => {
    svg.addEventListener('pointermove', event => {
      lastHover = {barIndex:index, clientX:event.clientX, clientY:event.clientY};
      renderPreview(event, index);
    });
    svg.addEventListener('pointerleave', () => {
      if (lastHover?.barIndex === index) lastHover = null;
      clearPreview(index);
    });
    svg.addEventListener('click', event => staffClick(event, index));
  });
  durationSelect.addEventListener('change', () => {
    if (lastHover) renderPreview({currentTarget:staffSvgs[lastHover.barIndex], clientX:lastHover.clientX, clientY:lastHover.clientY}, lastHover.barIndex);
  });
  measurePlayButtons.forEach((button, index) => button.addEventListener('click', () => playEvents(eventsFor([index]), 'Der Takt wird abgespielt. Leere Positionen bleiben still.')));
  clearButtons.forEach((button, index) => button.addEventListener('click', () => {
    bars[index].fill(null);
    renderBar(index);
    updatePlaybackState();
    status.textContent = 'Der Takt ist leer.';
  }));
  eraseButton.addEventListener('click', () => {
    eraseMode = !eraseMode;
    previewLayers.forEach((_, index) => clearPreview(index));
    eraseButton.setAttribute('aria-pressed', String(eraseMode));
    eraseButton.textContent = eraseMode ? 'Radiermodus: an' : 'Radiermodus: aus';
    status.textContent = eraseMode ? 'Klicke auf eine Note, um sie zu löschen.' : 'Wähle einen Notenwert und klicke in ein Notensystem.';
  });
  stopButton.addEventListener('click', stopAudio);
  composer.querySelectorAll('[data-composer-reference]').forEach(button => button.addEventListener('click', () => {
    if (button.dataset.composerReference === 'root') playSimple([1], 'Grundton C wird abgespielt.');
    else playSimple([1,2,3,4,5,6,7,8], 'C-Dur-Tonleiter wird abgespielt.');
  }));
  updatePlaybackState();
  window.addEventListener('pagehide', stopAudio);
})();
