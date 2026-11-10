(() => {
  const ns = 'http://www.w3.org/2000/svg';
  const names = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  const pitchClassByName = new Map();
  const aliases = [
    ['C', 'B#'],
    ['C#', 'Db'],
    ['D'],
    ['D#', 'Eb'],
    ['E', 'Fb'],
    ['F', 'E#'],
    ['F#', 'Gb'],
    ['G'],
    ['G#', 'Ab'],
    ['A'],
    ['A#', 'Bb'],
    ['B', 'Cb']
  ];
  aliases.forEach((set, pc) => set.forEach(name => pitchClassByName.set(name.toLowerCase(), pc)));

  const css = getComputedStyle(document.documentElement);
  const getColor = pc => css.getPropertyValue(`--pitch-${((pc % 12) + 12) % 12}`).trim();
  const normalizeName = note => {
    const source = String(note).trim().replaceAll('♯', '#').replaceAll('♭', 'b');
    if (pitchClassByName.has(source.toLowerCase())) return pitchClassByName.get(source.toLowerCase());
    const match = source.match(/^([A-G])([#b])(?:-?\d+)?$/i);
    if (match) return pitchClassByName.get(`${match[1]}${match[2]}`.toLowerCase()) ?? null;
    const octaveOnly = source.match(/^([A-G])(?:-?\d+)$/i);
    return octaveOnly ? pitchClassByName.get(octaveOnly[1].toLowerCase()) ?? null : null;
  };
  const getContrast = color => {
    const match = color.match(/hsl\(\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/i);
    if (!match) return '#202e31';
    const h = Number(match[1]) / 360;
    const s = Number(match[2]) / 100;
    const l = Number(match[3]) / 100;
    const hue = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    let r = l, g = l, b = l;
    if (s !== 0) {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue(p, q, h + 1 / 3);
      g = hue(p, q, h);
      b = hue(p, q, h - 1 / 3);
    }
    const linear = value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    const luminance = 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
    return luminance > 0.23 ? '#202e31' : '#ffffff';
  };

  const svgNode = (tag, attrs = {}) => {
    const node = document.createElementNS(ns, tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
    return node;
  };
  const addSvgText = (svg, text, x, y, attrs = {}) => {
    const node = svgNode('text', { x, y, 'text-anchor': 'middle', ...attrs });
    node.textContent = text;
    svg.append(node);
    return node;
  };
  const polar = (cx, cy, radius, angle) => ({
    x: cx + radius * Math.cos(angle * Math.PI / 180),
    y: cy + radius * Math.sin(angle * Math.PI / 180)
  });
  const wedge = (cx, cy, outer, inner, start, end) => {
    const a = polar(cx, cy, outer, start), b = polar(cx, cy, outer, end);
    const c = polar(cx, cy, inner, end), d = polar(cx, cy, inner, start);
    return `M ${a.x} ${a.y} A ${outer} ${outer} 0 0 1 ${b.x} ${b.y} L ${c.x} ${c.y} A ${inner} ${inner} 0 0 0 ${d.x} ${d.y} Z`;
  };

  function renderChromaticWheel(host) {
    const svg = svgNode('svg', { viewBox: '0 0 340 340', role: 'img', 'aria-label': 'Chromatischer Farbkreis mit zwölf gleich großen Tonfeldern' });
    const title = svgNode('title');
    title.textContent = 'Zwölf chromatische Tonklassen und ihre festen Farben';
    svg.append(title);
    names.forEach((name, pc) => {
      const start = -105 + pc * 30;
      const path = svgNode('path', { d: wedge(170, 170, 154, 48, start, start + 30), fill: getColor(pc), stroke: '#fff', 'stroke-width': 2 });
      path.setAttribute('aria-label', `${name}, chromatische Tonklasse ${pc + 1}`);
      svg.append(path);
      const point = polar(170, 170, 112, -90 + pc * 30);
      svg.append(svgNode('circle', { cx: point.x, cy: point.y, r: 16, fill: '#fff', stroke: '#202e31', 'stroke-width': 0.6 }));
      addSvgText(svg, name, point.x, point.y + 5, { fill: '#202e31', 'font-size': name.length > 3 ? 12 : 15, 'font-weight': 700 });
    });
    addSvgText(svg, '12 Töne', 170, 162, { fill: '#202e31', 'font-size': 16, 'font-weight': 700 });
    addSvgText(svg, '12 Farben', 170, 184, { fill: '#202e31', 'font-size': 14 });
    host.replaceChildren(svg);
  }

  const fifths = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];
  const relativeMinor = ['A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'A#', 'F', 'C', 'G', 'D'];
  function renderFifths(host) {
    const svg = svgNode('svg', { viewBox: '0 0 440 440', role: 'img', 'aria-label': 'Quintenzirkel: Durtonarten im Außenring, parallele Molltonarten im Innenring' });
    const title = svgNode('title');
    title.textContent = 'Quintenzirkel mit festen Tonfarben';
    svg.append(title);
    fifths.forEach((pc, index) => {
      const start = -105 + index * 30;
      const path = svgNode('path', { d: wedge(220, 220, 210, 130, start, start + 30), fill: getColor(pc), stroke: '#fff', 'stroke-width': 2 });
      svg.append(path);
      const major = names[pc];
      const p = polar(220, 220, 174, -90 + index * 30);
      svg.append(svgNode('circle', { cx: p.x, cy: p.y, r: 17, fill: '#fff', stroke: '#202e31', 'stroke-width': 0.6 }));
      addSvgText(svg, major, p.x, p.y + 5, { fill: '#202e31', 'font-size': 15, 'font-weight': 700 });
      const minorName = relativeMinor[index];
      const minorPc = normalizeName(minorName);
      svg.append(svgNode('path', { d: wedge(220, 220, 130, 55, start, start + 30), fill: getColor(minorPc), stroke: '#fff', 'stroke-width': 2 }));
      const mp = polar(220, 220, 100, -90 + index * 30);
      svg.append(svgNode('circle', { cx: mp.x, cy: mp.y, r: 17, fill: '#fff', stroke: '#202e31', 'stroke-width': 0.6 }));
      addSvgText(svg, `${minorName}m`, mp.x, mp.y + 4, { fill: '#202e31', 'font-size': 10, 'font-weight': 700 });
    });
    svg.append(svgNode('circle', { cx: 220, cy: 220, r: 55, fill: '#fff' }));
    addSvgText(svg, 'Dur und Moll', 220, 216, { fill: '#202e31', 'font-size': 12, 'font-weight': 700 });
    addSvgText(svg, 'im Quintenkreis', 220, 235, { fill: '#202e31', 'font-size': 10 });
    host.replaceChildren(svg);
  }

  const chordIntervals = {
    major: [0, 4, 7],
    minor: [0, 3, 7],
    dominant7: [0, 4, 7, 10],
    major7: [0, 4, 7, 11],
    minor7: [0, 3, 7, 10],
    add9: [0, 4, 7, 14],
    sus4: [0, 5, 7]
  };
  const majorKeys = {
    0: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
    1: ['C#', 'D#', 'E#', 'F#', 'G#', 'A#', 'B#'],
    2: ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'],
    3: ['Eb', 'F', 'G', 'Ab', 'Bb', 'C', 'D'],
    4: ['E', 'F#', 'G#', 'A', 'B', 'C#', 'D#'],
    5: ['F', 'G', 'A', 'Bb', 'C', 'D', 'E'],
    6: ['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'E#'],
    7: ['G', 'A', 'B', 'C', 'D', 'E', 'F#'],
    8: ['Ab', 'Bb', 'C', 'Db', 'Eb', 'F', 'G'],
    9: ['A', 'B', 'C#', 'D', 'E', 'F#', 'G#'],
    10: ['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A'],
    11: ['B', 'C#', 'D#', 'E', 'F#', 'G#', 'A#']
  };
  const qualityLabels = { major: 'Dur', minor: 'Moll', dominant7: '7', major7: 'maj7', minor7: 'm7', add9: 'add9', sus4: 'sus4' };

  function renderChord(host) {
    const rootName = host.dataset.root || 'C';
    const rootPc = normalizeName(rootName);
    const quality = host.dataset.quality || 'major';
    const intervals = chordIntervals[quality];
    if (rootPc === null || !intervals) return;
    const notes = intervals.map(offset => (rootPc + offset) % 12);
    host.setAttribute('aria-label', `${rootName}-${qualityLabels[quality]}: ${notes.map(pc => names[pc]).join(', ')}`);
    const list = document.createElement('div');
    list.className = 'note-color-chord-notes';
    notes.forEach((pc, index) => {
      const note = document.createElement('div');
      note.className = 'note-color-chip';
      note.style.setProperty('--note-color', getColor(pc));
      note.style.setProperty('--note-ink', getContrast(getColor(pc)));
      note.innerHTML = `<strong>${names[pc]}</strong><small>${index === 0 ? 'Grundton' : `Akkordton ${index + 1}`}</small>`;
      list.append(note);
    });
    const button = document.createElement('button');
    button.className = 'button note-color-play';
    button.type = 'button';
    button.textContent = 'Akkord anhören';
    button.setAttribute('aria-label', `${rootName}-${qualityLabels[quality]} anhören`);
    button.addEventListener('click', () => playNotes(intervals.map(offset => 60 + rootPc + offset), 1.7));
    host.replaceChildren(list, button);
  }

  function renderPalette(host, rootPc) {
    const spellings = majorKeys[rootPc] || majorKeys[0];
    const tones = spellings.map(normalizeName);
    const swatches = document.createElement('div');
    swatches.className = 'note-color-palette';
    spellings.forEach((name, index) => {
      const pc = tones[index];
      const tile = document.createElement('div');
      tile.className = 'note-color-chip';
      tile.style.setProperty('--note-color', getColor(pc));
      tile.style.setProperty('--note-ink', getContrast(getColor(pc)));
      tile.innerHTML = `<strong>${name}</strong><small>Stufe ${index + 1}</small>`;
      swatches.append(tile);
    });
    host.replaceChildren(swatches);
    return tones;
  }

  let audioContext;
  function playNotes(midiNotes, duration) {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    audioContext ||= new Audio();
    if (audioContext.state === 'suspended') audioContext.resume();
    const now = audioContext.currentTime;
    midiNotes.forEach((midi, index) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = 'triangle';
      oscillator.frequency.value = 440 * (2 ** ((midi - 69) / 12));
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.13, now + 0.03);
      gain.gain.setValueAtTime(0.13, now + duration - 0.08);
      gain.gain.linearRampToValueAtTime(0, now + duration);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(now + index * 0.008);
      oscillator.stop(now + duration + 0.02);
    });
  }

  document.querySelectorAll('[data-note-color-wheel]').forEach(renderChromaticWheel);
  document.querySelectorAll('[data-note-color-fifths]').forEach(renderFifths);
  document.querySelectorAll('[data-note-color-chord]').forEach(renderChord);
  document.querySelectorAll('[data-key-palette]').forEach(host => {
    const select = document.querySelector('[data-key-palette-select]');
    const play = document.querySelector('[data-key-palette-play]');
    let tones = renderPalette(host, 0);
    if (select) select.addEventListener('change', () => {
      const pc = Number(select.value);
      tones = renderPalette(host, Number.isFinite(pc) ? pc : 0);
      host.dataset.root = String(pc);
    });
    if (play) play.addEventListener('click', () => {
      const root = Number(host.dataset.root || 0);
      playNotes(tones.map(offset => 60 + ((offset - root + 12) % 12) + root), 0.48);
    });
  });

  window.NoteColorSystem = Object.freeze({
    getPitchClass: normalizeName,
    getColor: note => { const pc = normalizeName(note); return pc === null ? null : getColor(pc); },
    getCanonicalName: note => { const pc = normalizeName(note); return pc === null ? null : names[pc]; },
    getContrast: note => { const pc = normalizeName(note); return pc === null ? null : getContrast(getColor(pc)); },
    getChordTones: (root, quality) => {
      const rootPc = normalizeName(root);
      return rootPc === null || !chordIntervals[quality] ? null : chordIntervals[quality].map(offset => names[(rootPc + offset) % 12]);
    },
    renderChromaticWheel,
    renderFifths,
    renderChord,
    renderPalette,
    playChord: (root, quality) => {
      const rootPc = normalizeName(root);
      if (rootPc === null || !chordIntervals[quality]) return false;
      playNotes(chordIntervals[quality].map(offset => 60 + rootPc + offset), 1.7);
      return true;
    },
    names: Object.freeze(names.slice())
  });
})();
